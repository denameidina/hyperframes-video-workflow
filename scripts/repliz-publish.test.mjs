import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import {
  buildPublicUrl,
  buildR2Key,
  buildSchedulePayload,
  buildTargetAccounts,
  basicAuthHeader,
  createSchedules,
  deriveTitleFromDescription,
  loadConfig,
  makePublishKey,
  makeTargetKey,
  parseArgs,
  pollSchedules,
  readPostMetadata,
  runPublish,
  sanitizeTitleForPlatform,
  shouldSkipPublish,
  uploadToR2,
  validateAccounts,
  validateThreadsThread,
  verifyPublicUrl,
  wrapIntoChunks,
} from "./repliz-publish.mjs";

test("parseArgs requires slug and file", () => {
  assert.deepEqual(parseArgs(["--slug", "videos/0702-2", "--file", "renders/final.mp4", "--approved"]), {
    slug: "videos/0702-2",
    file: "renders/final.mp4",
    force: false,
    approved: true,
    help: false,
  });
  assert.equal(parseArgs(["--help"]).help, true);
  assert.throws(() => parseArgs(["--slug", "videos/0702-2"]), /Missing required --file/);
});

test("buildTargetAccounts reads configured platform IDs and skips empty env values", () => {
  assert.deepEqual(
    buildTargetAccounts({
      REPLIZ_FACEBOOK_ACCOUNT_ID: "fb_1",
      REPLIZ_YOUTUBE_ACCOUNT_ID: "yt_1",
      REPLIZ_TIKTOK_ACCOUNT_ID: "",
      REPLIZ_INSTAGRAM_ACCOUNT_ID: "ig_1",
    }),
    [
      { platform: "facebook", accountId: "fb_1" },
      { platform: "youtube", accountId: "yt_1" },
      { platform: "instagram", accountId: "ig_1" },
    ],
  );
});

test("buildR2Key normalizes slug, prefix, and file basename", () => {
  assert.equal(
    buildR2Key({ prefix: "/final-renders/", slug: "videos/0702-2/", file: "renders/final.mp4" }),
    "final-renders/0702-2/final.mp4",
  );
});

test("buildPublicUrl keeps object path slashes but encodes spaces", () => {
  assert.equal(
    buildPublicUrl("https://media.example.com/", "final renders/0702-2/final video.mp4"),
    "https://media.example.com/final%20renders/0702-2/final%20video.mp4",
  );
});

test("buildSchedulePayload matches Repliz video schedule contract", () => {
  const payload = buildSchedulePayload({
    accountId: "tk_1",
    post: {
      title: "",
      description: "Caption final",
      topic: "",
      type: "video",
      tags: ["editing"],
      mentions: ["dena"],
      targetCountries: ["ID"],
      scheduleAt: "2026-07-03T01:40:08.119Z",
    },
    videoUrl: "https://media.example.com/final-renders/0702-2/final.mp4",
  });

  assert.equal(payload.accountId, "tk_1");
  assert.equal(payload.description, "Caption final");
  assert.equal(payload.type, "video");
  assert.equal(payload.medias[0].type, "video");
  assert.equal(payload.medias[0].url, "https://media.example.com/final-renders/0702-2/final.mp4");
  assert.deepEqual(payload.additionalInfo.tags, ["editing"]);
  assert.deepEqual(payload.additionalInfo.mentions, ["dena"]);
  assert.deepEqual(payload.additionalInfo.targetCountries, ["ID"]);
});

test("buildSchedulePayload rejects empty description", () => {
  assert.throws(
    () =>
      buildSchedulePayload({
        accountId: "tk_1",
        platform: "tiktok",
        post: {
          title: "",
          description: " ",
          topic: "",
          type: "video",
          tags: [],
          mentions: [],
          targetCountries: ["ID"],
          scheduleAt: "2026-07-03T01:40:08.119Z",
        },
        videoUrl: "https://media.example.com/final-renders/0702-2/final.mp4",
      }),
    /Missing tiktok post description/,
  );
});

test("readPostMetadata supports a root metadata object and a receipt post object", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-post-"));
  const rootSlug = path.join(dir, "root");
  const receiptSlug = path.join(dir, "receipt");
  await mkdir(rootSlug);
  await mkdir(receiptSlug);

  await writeFile(
    path.join(rootSlug, "repliz-publish.json"),
    JSON.stringify({ description: "Root caption", tags: ["root"] }),
  );
  await writeFile(
    path.join(receiptSlug, "repliz-publish.json"),
    JSON.stringify({ post: { description: "Receipt caption", targetCountries: ["US"] } }),
  );

  assert.equal((await readPostMetadata(rootSlug)).description, "Root caption");
  assert.deepEqual((await readPostMetadata(rootSlug)).tags, ["root"]);
  assert.equal((await readPostMetadata(receiptSlug)).description, "Receipt caption");
  assert.deepEqual((await readPostMetadata(receiptSlug)).targetCountries, ["US"]);
});

test("readPostMetadata falls back to Instagram publish caption", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-publish-caption-"));
  await writeFile(
    path.join(dir, "publish-captions.md"),
    `# Publish Captions

## Instagram

Character count: 42

\`\`\`text
Instagram caption final.

#AIWorkflow
\`\`\`

## TikTok

\`\`\`text
TikTok caption final.
\`\`\`
`,
  );

  const post = await readPostMetadata(dir);

  assert.equal(post.description, "Instagram caption final.\n\n#AIWorkflow");
});

test("readPostMetadata prefers repliz-publish description over publish-captions fallback", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-explicit-caption-"));
  await writeFile(path.join(dir, "repliz-publish.json"), JSON.stringify({ post: { description: "Explicit caption" } }));
  await writeFile(
    path.join(dir, "publish-captions.md"),
    `## Instagram

\`\`\`text
Fallback caption
\`\`\`
`,
  );

  const post = await readPostMetadata(dir);

  assert.equal(post.description, "Explicit caption");
});

test("readPostMetadata uses root description when receipt post description is blank", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-root-description-"));
  await writeFile(
    path.join(dir, "repliz-publish.json"),
    JSON.stringify({ description: "Root caption", post: { description: " " } }),
  );

  const post = await readPostMetadata(dir);

  assert.equal(post.description, "Root caption");
});

test("readPostMetadata falls back to TikTok when Instagram caption is absent", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-tiktok-caption-"));
  await writeFile(
    path.join(dir, "publish-captions.md"),
    `# Publish Captions

## TikTok

\`\`\`text
TikTok only caption.
\`\`\`
`,
  );

  const post = await readPostMetadata(dir);

  assert.equal(post.description, "TikTok only caption.");
});

test("deriveTitleFromDescription uses the first meaningful line and trims to 100 characters", () => {
  assert.equal(
    deriveTitleFromDescription("Gue rombak workflow editing pakai AI.\n\nDetail lengkapnya di caption.\n\n#AIWorkflow"),
    "Gue rombak workflow editing pakai AI.",
  );
  assert.equal(deriveTitleFromDescription("#AIWorkflow #Repliz\n\nBaris kedua yang beneran."), "Baris kedua yang beneran.");
  assert.equal(deriveTitleFromDescription(""), "");

  const long = `${"kata ".repeat(40)}`;
  const derived = deriveTitleFromDescription(long);
  assert.ok(derived.length <= 100, `expected <=100 chars, got ${derived.length}`);
  assert.equal(derived.endsWith("kata"), true);
});

test("sanitizeTitleForPlatform strips angle brackets and caps YouTube titles at 100 characters", () => {
  assert.equal(sanitizeTitleForPlatform("  Judul   <keren>  ", "youtube"), "Judul keren");
  assert.equal(sanitizeTitleForPlatform("Judul <keren>", "tiktok"), "Judul <keren>");
  assert.ok(sanitizeTitleForPlatform("kata ".repeat(40), "youtube").length <= 100);
});

test("buildSchedulePayload sends the resolved title on every platform payload", () => {
  const post = {
    title: "Judul YouTube final",
    description: "Caption final",
    topic: "",
    type: "video",
    tags: [],
    mentions: [],
    targetCountries: ["ID"],
    scheduleAt: "2026-07-03T01:40:08.119Z",
  };
  const videoUrl = "https://media.example.com/final-renders/0702-2/final.mp4";

  assert.equal(buildSchedulePayload({ accountId: "yt_1", platform: "youtube", post, videoUrl }).title, "Judul YouTube final");
  assert.equal(buildSchedulePayload({ accountId: "tk_1", platform: "tiktok", post, videoUrl }).title, "Judul YouTube final");
});

test("buildSchedulePayload rejects an empty title for YouTube only", () => {
  const post = {
    title: "  ",
    description: "Caption final",
    topic: "",
    type: "video",
    tags: [],
    mentions: [],
    targetCountries: ["ID"],
    scheduleAt: "2026-07-03T01:40:08.119Z",
  };
  const videoUrl = "https://media.example.com/final-renders/0702-2/final.mp4";

  assert.throws(
    () => buildSchedulePayload({ accountId: "yt_1", platform: "youtube", post, videoUrl }),
    /Missing youtube post title/,
  );
  assert.equal(buildSchedulePayload({ accountId: "tk_1", platform: "tiktok", post, videoUrl }).title, "");
});

test("readPostMetadata resolves title from metadata, publish captions, then description", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-title-"));
  const explicitSlug = path.join(dir, "explicit");
  const captionSlug = path.join(dir, "caption");
  const derivedSlug = path.join(dir, "derived");
  await mkdir(explicitSlug);
  await mkdir(captionSlug);
  await mkdir(derivedSlug);

  const captionsMarkdown = `# Publish Captions

## YouTube Title

\`\`\`text
Judul dari publish captions
\`\`\`

## Instagram

\`\`\`text
Caption Instagram final.

#AIWorkflow
\`\`\`
`;

  await writeFile(path.join(explicitSlug, "repliz-publish.json"), JSON.stringify({ post: { title: "Judul eksplisit" } }));
  await writeFile(path.join(explicitSlug, "publish-captions.md"), captionsMarkdown);
  await writeFile(path.join(captionSlug, "publish-captions.md"), captionsMarkdown);
  await writeFile(
    path.join(derivedSlug, "publish-captions.md"),
    `## Instagram

\`\`\`text
Caption Instagram final.

#AIWorkflow
\`\`\`
`,
  );

  assert.equal((await readPostMetadata(explicitSlug)).title, "Judul eksplisit");
  assert.equal((await readPostMetadata(captionSlug)).title, "Judul dari publish captions");
  assert.equal((await readPostMetadata(derivedSlug)).title, "Caption Instagram final.");
});

test("makePublishKey changes when the title changes", () => {
  const base = { r2Key: "final-renders/0702-2/final.mp4", targetAccounts: [{ platform: "youtube", accountId: "yt_1" }], description: "Caption final" };
  assert.notEqual(makePublishKey({ ...base, title: "Judul A" }), makePublishKey({ ...base, title: "Judul B" }));
});

test("duplicate guard compares publish key and respects force", () => {
  const key = makePublishKey({
    r2Key: "final-renders/0702-2/final.mp4",
    targetAccounts: [{ platform: "tiktok", accountId: "tk_1" }],
    description: "Caption final",
  });
  const receipt = { publishKey: key, schedules: [{ scheduleId: "sch_1" }] };

  assert.equal(shouldSkipPublish(receipt, key, false), true);
  assert.equal(shouldSkipPublish(receipt, key, true), false);
  assert.equal(shouldSkipPublish(receipt, "different", false), false);
});

test("uploadToR2 uploads with Wrangler and video/mp4 content type", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "r2-upload-"));
  const file = path.join(dir, "final.mp4");
  await writeFile(file, "fake mp4 bytes");

  const calls = [];
  const result = await uploadToR2({
    bucket: "bucket",
    key: "final-renders/0702-2/final.mp4",
    file,
    force: false,
    accountId: "cf_account",
    runCommand: async (command, args, options) => {
      calls.push({ command, args, options });
      return { stdout: "ok", stderr: "" };
    },
  });

  assert.deepEqual(result, { uploaded: true });
  assert.deepEqual(calls.map(({ command, args }) => ({ command, args })), [
    {
      command: "npx",
      args: [
        "wrangler",
        "r2",
        "object",
        "put",
        "bucket/final-renders/0702-2/final.mp4",
        "--remote",
        "--file",
        file,
        "--content-type",
        "video/mp4",
      ],
    },
  ]);
  assert.equal(calls[0].options.env.CLOUDFLARE_ACCOUNT_ID, "cf_account");
});

test("uploadToR2 passes Wrangler force flag when requested", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "r2-upload-force-"));
  const file = path.join(dir, "final.mp4");
  await writeFile(file, "fake mp4 bytes");

  const calls = [];
  await uploadToR2({
    bucket: "bucket",
    key: "final-renders/0702-2/final.mp4",
    file,
    force: true,
    accountId: "cf_account",
    runCommand: async (command, args, options) => {
      calls.push({ command, args, options });
      return { stdout: "ok", stderr: "" };
    },
  });

  assert.equal(calls[0].args.at(-1), "--force");
});

test("uploadToR2 passes Cloudflare account ID without Wrangler profile", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "r2-upload-account-"));
  const file = path.join(dir, "final.mp4");
  await writeFile(file, "fake mp4 bytes");

  const calls = [];
  await uploadToR2({
    bucket: "bucket",
    key: "final-renders/0702-2/final.mp4",
    file,
    force: false,
    accountId: "nafanesia_account_id",
    runCommand: async (command, args, options) => {
      calls.push({ command, args, options });
      return { stdout: "ok", stderr: "" };
    },
  });

  assert.equal(calls[0].args.includes("--profile"), false);
  assert.equal(calls[0].options.env.CLOUDFLARE_ACCOUNT_ID, "nafanesia_account_id");
});

test("verifyPublicUrl accepts 200 and 206 responses", async () => {
  assert.equal(await verifyPublicUrl("https://media.example.com/video.mp4", async () => ({ status: 200 })), true);
  assert.equal(await verifyPublicUrl("https://media.example.com/video.mp4", async () => ({ status: 206 })), true);
  await assert.rejects(
    () => verifyPublicUrl("https://media.example.com/video.mp4", async () => ({ status: 403 })),
    /R2 public URL is not reachable/,
  );
});

test("basicAuthHeader encodes Repliz access and secret key", () => {
  assert.equal(basicAuthHeader({ replizAccessKey: "access", replizSecretKey: "secret" }), "Basic YWNjZXNzOnNlY3JldA==");
});

test("validateAccounts rejects disconnected or mismatched platform accounts", async () => {
  const config = {
    replizApiBaseUrl: "https://api.repliz.test",
    replizAccessKey: "access",
    replizSecretKey: "secret",
  };

  await assert.rejects(
    () =>
      validateAccounts({
        config,
        targetAccounts: [{ platform: "tiktok", accountId: "tk_1" }],
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ id: "tk_1", type: "tiktok", isConnected: false }),
        }),
      }),
    /not connected/,
  );

  await assert.rejects(
    () =>
      validateAccounts({
        config,
        targetAccounts: [{ platform: "instagram", accountId: "ig_1" }],
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ id: "ig_1", type: "facebook", isConnected: true }),
        }),
      }),
    /expected instagram/,
  );
});

test("createSchedules posts one Repliz schedule per target account", async () => {
  const calls = [];
  const schedules = await createSchedules({
    config: {
      replizApiBaseUrl: "https://api.repliz.test",
      replizAccessKey: "access",
      replizSecretKey: "secret",
    },
    targetAccounts: [
      { platform: "tiktok", accountId: "tk_1" },
      { platform: "instagram", accountId: "ig_1" },
    ],
    post: {
      title: "",
      description: "Caption final",
      topic: "",
      type: "video",
      tags: [],
      mentions: [],
      targetCountries: ["ID"],
      scheduleAt: "2026-07-03T01:40:08.119Z",
    },
    videoUrl: "https://media.example.com/final-renders/0702-2/final.mp4",
    now: new Date("2026-07-03T01:39:08.119Z"),
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ scheduleId: `schedule_${calls.length}` }),
      };
    },
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://api.repliz.test/public/schedule");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.Authorization, "Basic YWNjZXNzOnNlY3JldA==");
  assert.deepEqual(schedules, [
    { accountId: "tk_1", platform: "tiktok", scheduleId: "schedule_1", status: "pending" },
    { accountId: "ig_1", platform: "instagram", scheduleId: "schedule_2", status: "pending" },
  ]);
});

test("createSchedules sanitizes YouTube description without changing other platforms", async () => {
  const calls = [];
  await createSchedules({
    config: {
      replizApiBaseUrl: "https://api.repliz.test",
      replizAccessKey: "access",
      replizSecretKey: "secret",
    },
    targetAccounts: [
      { platform: "youtube", accountId: "yt_1" },
      { platform: "tiktok", accountId: "tk_1" },
    ],
    post: {
      title: "Workflow editing AI end to end",
      description: "raw video -> Codex -> HyperFrames -> R2 -> Repliz/API social automation\n\n#AIWorkflow #Repliz",
      topic: "",
      type: "video",
      tags: [],
      mentions: [],
      targetCountries: ["ID"],
      scheduleAt: "2026-07-03T01:40:08.119Z",
    },
    videoUrl: "https://media.example.com/final-renders/0702-2/final.mp4",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ scheduleId: `schedule_${calls.length}` }),
      };
    },
  });

  const youtubePayload = JSON.parse(calls[0].options.body);
  const tiktokPayload = JSON.parse(calls[1].options.body);
  assert.equal(youtubePayload.title, "Workflow editing AI end to end");
  assert.equal(youtubePayload.description.includes("->"), false);
  assert.equal(youtubePayload.description.includes("Repliz/API"), false);
  assert.match(youtubePayload.description, /raw video ke Codex ke HyperFrames ke R2 ke Repliz dan API social automation/);
  assert.equal(tiktokPayload.description, "raw video -> Codex -> HyperFrames -> R2 -> Repliz/API social automation\n\n#AIWorkflow #Repliz");
});

test("pollSchedules updates terminal statuses", async () => {
  const polled = await pollSchedules({
    config: {
      replizApiBaseUrl: "https://api.repliz.test",
      replizAccessKey: "access",
      replizSecretKey: "secret",
    },
    schedules: [{ accountId: "tk_1", platform: "tiktok", scheduleId: "schedule_1", status: "pending" }],
    timeoutMs: 1,
    intervalMs: 0,
    sleep: async () => {},
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: "success", postId: "post_1" }),
    }),
  });

  assert.deepEqual(polled, [{ accountId: "tk_1", platform: "tiktok", scheduleId: "schedule_1", status: "success", postId: "post_1" }]);
});

function envFixture(overrides = {}) {
  return {
    REPLIZ_API_BASE_URL: "https://api.repliz.test",
    REPLIZ_ACCESS_KEY: "access",
    REPLIZ_SECRET_KEY: "secret",
    CLOUDFLARE_ACCOUNT_ID: "cf_account",
    R2_BUCKET: "bucket",
    R2_PUBLIC_BASE_URL: "https://media.example.com",
    R2_PREFIX: "final-renders",
    REPLIZ_TIKTOK_ACCOUNT_ID: "tk_1",
    REPLIZ_INSTAGRAM_ACCOUNT_ID: "ig_1",
    ...overrides,
  };
}

test("loadConfig requires Repliz and R2 env but allows empty target platforms", () => {
  assert.equal(loadConfig(envFixture()).r2Bucket, "bucket");
  assert.equal(loadConfig(envFixture()).cloudflareAccountId, "cf_account");
  assert.throws(() => loadConfig(envFixture({ R2_BUCKET: "" })), /Missing env: R2_BUCKET/);
});

test("runPublish requires approval before uploading to R2 or scheduling", async () => {
  const calls = [];

  await assert.rejects(
    () =>
      runPublish({
        argv: ["--slug", "videos/0702-2", "--file", "renders/final.mp4"],
        env: {},
        runCommand: async () => calls.push("wrangler"),
        fetchImpl: async () => calls.push("fetch"),
      }),
    /requires user approval/,
  );

  assert.deepEqual(calls, []);
});

test("runPublish rejects empty post description before uploading or scheduling", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-empty-description-"));
  const slugDir = path.join(dir, "videos", "0702-2");
  await mkdir(slugDir, { recursive: true });
  const calls = [];

  await assert.rejects(
    () =>
      runPublish({
        argv: ["--slug", slugDir, "--file", path.join(dir, "renders", "final.mp4"), "--approved"],
        env: envFixture(),
        runCommand: async () => calls.push("wrangler"),
        fetchImpl: async () => calls.push("fetch"),
      }),
    /Missing post description/,
  );

  assert.deepEqual(calls, []);
});

test("runPublish sends publish-captions description to every schedule payload", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-run-caption-fallback-"));
  const slugDir = path.join(dir, "videos", "0702-2");
  const renderFile = path.join(dir, "renders", "final.mp4");
  await mkdir(slugDir, { recursive: true });
  await mkdir(path.dirname(renderFile), { recursive: true });
  await writeFile(renderFile, "fake mp4 bytes");
  await writeFile(
    path.join(slugDir, "publish-captions.md"),
    `# Publish Captions

## Instagram

\`\`\`text
Caption from publish captions.

#AIWorkflow
\`\`\`
`,
  );

  const scheduleBodies = [];
  const fetchImpl = async (url, options = {}) => {
    if (url.startsWith("https://media.example.com/")) return { status: 206 };
    if (url.endsWith("/public/account/tk_1")) {
      return { ok: true, status: 200, json: async () => ({ id: "tk_1", type: "tiktok", isConnected: true }) };
    }
    if (url.endsWith("/public/account/ig_1")) {
      return { ok: true, status: 200, json: async () => ({ id: "ig_1", type: "instagram", isConnected: true }) };
    }
    if (url.endsWith("/public/schedule") && options.method === "POST") {
      scheduleBodies.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({ scheduleId: `schedule_${scheduleBodies.length}` }) };
    }
    if (url.includes("/public/schedule/schedule_")) {
      return { ok: true, status: 200, json: async () => ({ status: "success" }) };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  await runPublish({
    argv: ["--slug", slugDir, "--file", renderFile, "--approved"],
    env: envFixture(),
    runCommand: async () => ({ stdout: "ok", stderr: "" }),
    fetchImpl,
    now: new Date("2026-07-03T01:39:08.119Z"),
    sleep: async () => {},
  });

  assert.equal(scheduleBodies.length, 2);
  assert.deepEqual(
    scheduleBodies.map((body) => body.description),
    ["Caption from publish captions.\n\n#AIWorkflow", "Caption from publish captions.\n\n#AIWorkflow"],
  );
});

test("runPublish sends the YouTube title to every schedule payload and receipt", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-run-title-"));
  const slugDir = path.join(dir, "videos", "0702-2");
  const renderFile = path.join(dir, "renders", "final.mp4");
  await mkdir(slugDir, { recursive: true });
  await mkdir(path.dirname(renderFile), { recursive: true });
  await writeFile(renderFile, "fake mp4 bytes");
  await writeFile(
    path.join(slugDir, "publish-captions.md"),
    `# Publish Captions

## YouTube Title

\`\`\`text
Cara Gue Rombak Workflow Editing Pakai AI
\`\`\`

## Instagram

\`\`\`text
Caption from publish captions.

#AIWorkflow
\`\`\`
`,
  );

  const scheduleBodies = [];
  const fetchImpl = async (url, options = {}) => {
    if (url.startsWith("https://media.example.com/")) return { status: 206 };
    if (url.endsWith("/public/account/yt_1")) {
      return { ok: true, status: 200, json: async () => ({ id: "yt_1", type: "youtube", isConnected: true }) };
    }
    if (url.endsWith("/public/account/tk_1")) {
      return { ok: true, status: 200, json: async () => ({ id: "tk_1", type: "tiktok", isConnected: true }) };
    }
    if (url.endsWith("/public/schedule") && options.method === "POST") {
      scheduleBodies.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({ scheduleId: `schedule_${scheduleBodies.length}` }) };
    }
    if (url.includes("/public/schedule/schedule_")) {
      return { ok: true, status: 200, json: async () => ({ status: "success" }) };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  const result = await runPublish({
    argv: ["--slug", slugDir, "--file", renderFile, "--approved"],
    env: envFixture({ REPLIZ_YOUTUBE_ACCOUNT_ID: "yt_1", REPLIZ_INSTAGRAM_ACCOUNT_ID: "" }),
    runCommand: async () => ({ stdout: "ok", stderr: "" }),
    fetchImpl,
    now: new Date("2026-07-03T01:39:08.119Z"),
    sleep: async () => {},
  });

  assert.equal(scheduleBodies.length, 2);
  assert.deepEqual(
    scheduleBodies.map((body) => body.title),
    ["Cara Gue Rombak Workflow Editing Pakai AI", "Cara Gue Rombak Workflow Editing Pakai AI"],
  );
  assert.equal(result.receipt.post.title, "Cara Gue Rombak Workflow Editing Pakai AI");
});

test("runPublish rejects a YouTube target with an unresolvable title before uploading", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-run-title-missing-"));
  const slugDir = path.join(dir, "videos", "0702-2");
  const renderFile = path.join(dir, "renders", "final.mp4");
  await mkdir(slugDir, { recursive: true });
  await mkdir(path.dirname(renderFile), { recursive: true });
  await writeFile(renderFile, "fake mp4 bytes");
  await writeFile(
    path.join(slugDir, "repliz-publish.json"),
    JSON.stringify({ post: { description: "#AIWorkflow #Repliz" } }),
  );

  await assert.rejects(
    runPublish({
      argv: ["--slug", slugDir, "--file", renderFile, "--approved"],
      env: envFixture({ REPLIZ_YOUTUBE_ACCOUNT_ID: "yt_1" }),
      runCommand: async () => {
        throw new Error("should not upload");
      },
      fetchImpl: async () => {
        throw new Error("should not call network");
      },
    }),
    /Missing YouTube post title/,
  );
});

test("runPublish uploads to R2, creates schedules, writes receipt, and skips duplicate rerun", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-run-"));
  const slugDir = path.join(dir, "videos", "0702-2");
  const renderFile = path.join(dir, "renders", "final.mp4");
  await mkdir(slugDir, { recursive: true });
  await mkdir(path.dirname(renderFile), { recursive: true });
  await writeFile(renderFile, "fake mp4 bytes");
  await writeFile(
    path.join(slugDir, "repliz-publish.json"),
    JSON.stringify({ post: { description: "Caption final", tags: ["editing"] } }),
  );

  const wranglerCalls = [];

  const fetchCalls = [];
  const fetchImpl = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    if (url.startsWith("https://media.example.com/")) return { status: 206 };
    if (url.endsWith("/public/account/tk_1")) {
      return { ok: true, status: 200, json: async () => ({ id: "tk_1", type: "tiktok", isConnected: true }) };
    }
    if (url.endsWith("/public/account/ig_1")) {
      return { ok: true, status: 200, json: async () => ({ id: "ig_1", type: "instagram", isConnected: true }) };
    }
    if (url.endsWith("/public/schedule") && options.method === "POST") {
      return { ok: true, status: 200, json: async () => ({ scheduleId: `schedule_${fetchCalls.length}` }) };
    }
    if (url.includes("/public/schedule/schedule_")) {
      return { ok: true, status: 200, json: async () => ({ status: "success", postId: "post_1" }) };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  const first = await runPublish({
    argv: ["--slug", slugDir, "--file", renderFile, "--approved"],
    env: envFixture(),
    runCommand: async (command, args, options) => {
      wranglerCalls.push({ command, args, options });
      return { stdout: "ok", stderr: "" };
    },
    fetchImpl,
    now: new Date("2026-07-03T01:39:08.119Z"),
    sleep: async () => {},
  });

  assert.equal(first.skipped, false);
  assert.equal(first.receipt.schedules.length, 2);
  assert.equal(first.receipt.videoUrl, "https://media.example.com/final-renders/0702-2/final.mp4");
  assert.equal(wranglerCalls.length, 1);
  assert.equal(wranglerCalls[0].command, "npx");
  assert.equal(wranglerCalls[0].args[4], "bucket/final-renders/0702-2/final.mp4");
  assert.equal(wranglerCalls[0].options.env.CLOUDFLARE_ACCOUNT_ID, "cf_account");

  const second = await runPublish({
    argv: ["--slug", slugDir, "--file", renderFile, "--approved"],
    env: envFixture(),
    runCommand: async (command, args, options) => {
      wranglerCalls.push({ command, args, options });
      return { stdout: "ok", stderr: "" };
    },
    fetchImpl,
    now: new Date("2026-07-03T01:39:08.119Z"),
    sleep: async () => {},
  });

  assert.equal(second.skipped, true);
  const receipt = JSON.parse(await readFile(path.join(slugDir, "repliz-publish.json"), "utf8"));
  assert.equal(receipt.r2Key, "final-renders/0702-2/final.mp4");
  assert.equal(receipt.post.description, "Caption final");
  assert.equal(receipt.schedules[0].status, "success");
});

test("buildTargetAccounts includes Threads when configured", () => {
  assert.deepEqual(
    buildTargetAccounts({ REPLIZ_THREADS_ACCOUNT_ID: "th_1", REPLIZ_TIKTOK_ACCOUNT_ID: "tk_1" }),
    [
      { platform: "tiktok", accountId: "tk_1" },
      { platform: "threads", accountId: "th_1" },
    ],
  );
});

test("wrapIntoChunks packs words into <=maxLength chunks without splitting words", () => {
  const chunks = wrapIntoChunks("Awalnya cuma iseng liat ide di Threads, nyobain ChatGPT buat ngerender buku cerita 3D.", 30);
  assert.ok(chunks.every((chunk) => chunk.length <= 30), `chunks exceed 30 chars: ${JSON.stringify(chunks)}`);
  assert.equal(chunks.join(" "), "Awalnya cuma iseng liat ide di Threads, nyobain ChatGPT buat ngerender buku cerita 3D.");
  assert.deepEqual(wrapIntoChunks("   ", 150), []);
});

test("validateThreadsThread rejects a post or reply over 150 characters", () => {
  assert.throws(() => validateThreadsThread({ post: "a".repeat(151), replies: [] }), /Threads post exceeds 150 characters/);
  assert.throws(() => validateThreadsThread({ post: "ok", replies: ["fine", "b".repeat(151)] }), /Threads reply 2 exceeds 150 characters/);
  assert.doesNotThrow(() => validateThreadsThread({ post: "a".repeat(150), replies: ["b".repeat(150)] }));
});

test("readPostMetadata reads a manually authored Threads thread from publish-captions.md", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-threads-manual-"));
  await writeFile(
    path.join(dir, "publish-captions.md"),
    `## Instagram

\`\`\`text
Long-form Instagram caption that would never fit in a single Threads post on its own.
\`\`\`

## Threads

\`\`\`text
Awalnya cuma iseng nyobain ChatGPT buat bikin buku cerita 3D anak.
\`\`\`

\`\`\`text
Ternyata anak-anak saya suka banget. Ceritanya dibacakan biar mereka fokus dengerin.
\`\`\`

\`\`\`text
#ceritaanak #buildinpublic
\`\`\`
`,
  );

  const post = await readPostMetadata(dir);

  assert.equal(post.threads.post, "Awalnya cuma iseng nyobain ChatGPT buat bikin buku cerita 3D anak.");
  assert.deepEqual(post.threads.replies, [
    "Ternyata anak-anak saya suka banget. Ceritanya dibacakan biar mereka fokus dengerin.",
    "#ceritaanak #buildinpublic",
  ]);
});

test("readPostMetadata falls back to word-wrapping the description when no Threads thread is authored", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-threads-fallback-"));
  const description = `${"kata ".repeat(60)}akhir`;
  await writeFile(path.join(dir, "repliz-publish.json"), JSON.stringify({ post: { description } }));

  const post = await readPostMetadata(dir);

  assert.ok(post.threads.post.length <= 150);
  assert.ok(post.threads.replies.every((reply) => reply.length <= 150));
  assert.equal([post.threads.post, ...post.threads.replies].join(" "), description.trim());
});

test("wrapIntoChunks hard-splits a single token longer than maxLength instead of dropping the tail", () => {
  const chunks = wrapIntoChunks("a".repeat(160), 150);
  assert.deepEqual(chunks, ["a".repeat(150), "a".repeat(10)]);
});

test("buildSchedulePayload sends the Threads post as description and the rest as a reply chain", () => {
  const post = {
    title: "",
    description: "Ignored on Threads: this long-form caption never becomes the post body.",
    topic: "",
    type: "video",
    tags: [],
    mentions: [],
    targetCountries: ["ID"],
    scheduleAt: "2026-07-03T01:40:08.119Z",
    threads: { post: "Hook post under 150 chars.", replies: ["Second bubble.", "Third bubble with the link."] },
  };
  const videoUrl = "https://media.example.com/final-renders/0702-2/final.mp4";

  const payload = buildSchedulePayload({ accountId: "th_1", platform: "threads", post, videoUrl });

  assert.equal(payload.description, "Hook post under 150 chars.");
  assert.deepEqual(payload.replies, [
    { title: "", description: "Second bubble.", topic: "", type: "text", medias: [] },
    { title: "", description: "Third bubble with the link.", topic: "", type: "text", medias: [] },
  ]);
});

test("buildSchedulePayload rejects a Threads post or reply over 150 characters", () => {
  const post = {
    title: "",
    description: "fallback",
    topic: "",
    type: "video",
    tags: [],
    mentions: [],
    targetCountries: ["ID"],
    scheduleAt: "2026-07-03T01:40:08.119Z",
    threads: { post: "a".repeat(151), replies: [] },
  };

  assert.throws(
    () => buildSchedulePayload({ accountId: "th_1", platform: "threads", post, videoUrl: "https://media.example.com/x.mp4" }),
    /Threads post exceeds 150 characters/,
  );
});

test("makeTargetKey changes when description, title, or replies change", () => {
  const base = { r2Key: "final-renders/0702-2/final.mp4", platform: "threads", accountId: "th_1", description: "post", title: "" };
  assert.notEqual(makeTargetKey({ ...base, replies: [] }), makeTargetKey({ ...base, replies: ["reply"] }));
  assert.notEqual(makeTargetKey({ ...base, replies: [] }), makeTargetKey({ ...base, description: "different", replies: [] }));
});

test("runPublish adds a newly configured platform without re-scheduling already-successful targets", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-run-add-platform-"));
  const slugDir = path.join(dir, "videos", "0702-2");
  const renderFile = path.join(dir, "renders", "final.mp4");
  await mkdir(slugDir, { recursive: true });
  await mkdir(path.dirname(renderFile), { recursive: true });
  await writeFile(renderFile, "fake mp4 bytes");
  await writeFile(
    path.join(slugDir, "repliz-publish.json"),
    JSON.stringify({ post: { description: "Caption final", threads: { post: "Hook post.", replies: [] } } }),
  );

  const scheduleCalls = [];
  const fetchImpl = async (url, options = {}) => {
    if (url.startsWith("https://media.example.com/")) return { status: 206 };
    if (url.endsWith("/public/account/tk_1")) {
      return { ok: true, status: 200, json: async () => ({ id: "tk_1", type: "tiktok", isConnected: true }) };
    }
    if (url.endsWith("/public/account/th_1")) {
      return { ok: true, status: 200, json: async () => ({ id: "th_1", type: "threads", isConnected: true }) };
    }
    if (url.endsWith("/public/schedule") && options.method === "POST") {
      scheduleCalls.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({ scheduleId: `schedule_${scheduleCalls.length}` }) };
    }
    if (url.includes("/public/schedule/schedule_")) {
      return { ok: true, status: 200, json: async () => ({ status: "success", postId: "post_1" }) };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };
  const runCommand = async () => ({ stdout: "ok", stderr: "" });

  const first = await runPublish({
    argv: ["--slug", slugDir, "--file", renderFile, "--approved"],
    env: envFixture({ REPLIZ_INSTAGRAM_ACCOUNT_ID: "" }),
    runCommand,
    fetchImpl,
    now: new Date("2026-07-03T01:39:08.119Z"),
    sleep: async () => {},
  });
  assert.equal(first.receipt.schedules.length, 1);
  assert.equal(first.receipt.schedules[0].platform, "tiktok");
  assert.equal(scheduleCalls.length, 1);

  const second = await runPublish({
    argv: ["--slug", slugDir, "--file", renderFile, "--approved"],
    env: envFixture({ REPLIZ_INSTAGRAM_ACCOUNT_ID: "", REPLIZ_THREADS_ACCOUNT_ID: "th_1" }),
    runCommand,
    fetchImpl,
    now: new Date("2026-07-03T01:45:08.119Z"),
    sleep: async () => {},
  });

  assert.equal(second.skipped, false);
  // Only Threads gets a new schedule call; TikTok's earlier success is reused untouched.
  assert.equal(scheduleCalls.length, 2);
  assert.equal(scheduleCalls[1].description, "Hook post.");
  const platforms = second.receipt.schedules.map((schedule) => schedule.platform).sort();
  assert.deepEqual(platforms, ["threads", "tiktok"]);
  const tiktokEntry = second.receipt.schedules.find((schedule) => schedule.platform === "tiktok");
  assert.equal(tiktokEntry.scheduleId, "schedule_1");
});

test("runPublish blocks (does not resend) a platform whose content changed since its last success, without --force", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-run-blocked-"));
  const slugDir = path.join(dir, "videos", "0702-2");
  const renderFile = path.join(dir, "renders", "final.mp4");
  await mkdir(slugDir, { recursive: true });
  await mkdir(path.dirname(renderFile), { recursive: true });
  await writeFile(renderFile, "fake mp4 bytes");

  const scheduleCalls = [];
  const fetchImpl = async (url, options = {}) => {
    if (url.startsWith("https://media.example.com/")) return { status: 206 };
    if (url.endsWith("/public/account/tk_1")) {
      return { ok: true, status: 200, json: async () => ({ id: "tk_1", type: "tiktok", isConnected: true }) };
    }
    if (url.endsWith("/public/account/ig_1")) {
      return { ok: true, status: 200, json: async () => ({ id: "ig_1", type: "instagram", isConnected: true }) };
    }
    if (url.endsWith("/public/schedule") && options.method === "POST") {
      scheduleCalls.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({ scheduleId: `schedule_${scheduleCalls.length}` }) };
    }
    if (url.includes("/public/schedule/schedule_")) {
      return { ok: true, status: 200, json: async () => ({ status: "success" }) };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };
  const runCommand = async () => ({ stdout: "ok", stderr: "" });

  await writeFile(path.join(slugDir, "repliz-publish.json"), JSON.stringify({ post: { description: "Caption v1" } }));
  await runPublish({
    argv: ["--slug", slugDir, "--file", renderFile, "--approved"],
    env: envFixture(),
    runCommand,
    fetchImpl,
    now: new Date("2026-07-03T01:39:08.119Z"),
    sleep: async () => {},
  });
  assert.equal(scheduleCalls.length, 2);

  // Edit only the caption, the way a real rerun would (e.g. via publish-captions.md);
  // the receipt's `schedules` from the first run must survive for per-target dedup to see them.
  const priorReceipt = JSON.parse(await readFile(path.join(slugDir, "repliz-publish.json"), "utf8"));
  await writeFile(
    path.join(slugDir, "repliz-publish.json"),
    JSON.stringify({ ...priorReceipt, post: { ...priorReceipt.post, description: "Caption v2 - edited" } }),
  );
  const second = await runPublish({
    argv: ["--slug", slugDir, "--file", renderFile, "--approved"],
    env: envFixture(),
    runCommand,
    fetchImpl,
    now: new Date("2026-07-03T01:45:08.119Z"),
    sleep: async () => {},
  });

  assert.equal(scheduleCalls.length, 2, "no new schedule call for content that changed on already-succeeded platforms");
  assert.equal(second.skipped, true);
  assert.equal(second.blocked.length, 2);
  assert.ok(second.blocked.every((item) => /rerun with --force/.test(item.reason)));
});

test("runPublish treats a legacy receipt entry with no targetKey as reused, not blocked", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-run-legacy-receipt-"));
  const slugDir = path.join(dir, "videos", "0702-2");
  const renderFile = path.join(dir, "renders", "final.mp4");
  await mkdir(slugDir, { recursive: true });
  await mkdir(path.dirname(renderFile), { recursive: true });
  await writeFile(renderFile, "fake mp4 bytes");
  // A receipt written before targetKey existed: schedules have no targetKey field.
  await writeFile(
    path.join(slugDir, "repliz-publish.json"),
    JSON.stringify({
      post: { description: "Caption final" },
      r2Bucket: "bucket",
      r2Key: "final-renders/0702-2/final.mp4",
      videoUrl: "https://media.example.com/final-renders/0702-2/final.mp4",
      schedules: [
        { accountId: "tk_1", platform: "tiktok", scheduleId: "schedule_old_1", status: "success", postId: "post_1" },
        { accountId: "ig_1", platform: "instagram", scheduleId: "schedule_old_2", status: "pending" },
      ],
    }),
  );

  const scheduleCalls = [];
  const pollCalls = [];
  const fetchImpl = async (url, options = {}) => {
    if (url.startsWith("https://media.example.com/")) return { status: 206 };
    if (url.endsWith("/public/account/th_1")) {
      return { ok: true, status: 200, json: async () => ({ id: "th_1", type: "threads", isConnected: true }) };
    }
    if (url.endsWith("/public/schedule") && options.method === "POST") {
      scheduleCalls.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({ scheduleId: `schedule_new_${scheduleCalls.length}` }) };
    }
    if (url.includes("/public/schedule/schedule_old_2")) {
      pollCalls.push(url);
      return { ok: true, status: 200, json: async () => ({ status: "success", postId: "post_2" }) };
    }
    if (url.includes("/public/schedule/schedule_new_")) {
      return { ok: true, status: 200, json: async () => ({ status: "success" }) };
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  const result = await runPublish({
    argv: ["--slug", slugDir, "--file", renderFile, "--approved"],
    env: envFixture({ REPLIZ_THREADS_ACCOUNT_ID: "th_1", REPLIZ_TIKTOK_ACCOUNT_ID: "tk_1", REPLIZ_INSTAGRAM_ACCOUNT_ID: "ig_1" }),
    runCommand: async () => ({ stdout: "ok", stderr: "" }),
    fetchImpl,
    now: new Date("2026-07-03T01:39:08.119Z"),
    sleep: async () => {},
  });

  // Only Threads (the genuinely new target) gets a new schedule call.
  assert.equal(scheduleCalls.length, 1);
  assert.equal(result.blocked.length, 0);
  // The legacy pending TikTok/Instagram entries are not rescheduled...
  assert.ok(!scheduleCalls.some((body) => body.accountId === "tk_1" || body.accountId === "ig_1"));
  // ...but the still-pending Instagram entry gets its status refreshed.
  assert.ok(pollCalls.length > 0);
  const tiktokEntry = result.receipt.schedules.find((schedule) => schedule.platform === "tiktok");
  const instagramEntry = result.receipt.schedules.find((schedule) => schedule.platform === "instagram");
  assert.equal(tiktokEntry.scheduleId, "schedule_old_1");
  assert.equal(instagramEntry.scheduleId, "schedule_old_2");
  assert.equal(instagramEntry.status, "success");
  assert.ok(tiktokEntry.targetKey, "legacy entry should be stamped with a targetKey for future runs");
});

test("CLI help prints usage", () => {
  const result = spawnSync(process.execPath, ["scripts/repliz-publish.mjs", "--help"], {
    cwd: path.resolve("."),
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /--slug <dir>/);
});

// Real receipts on disk; only the external upload/API boundary is replaced.
async function recoveryFixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-recovery-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, "final.mp4");
  const receiptFile = path.join(dir, "repliz-publish.json");
  await writeFile(file, "MP4");
  await writeFile(receiptFile, JSON.stringify({ post: { description: "Caption v1" } }));
  const posted = [];
  let failPoll = false;
  const fetchImpl = async (url, options = {}) => {
    if (url.startsWith("https://media.example.com/")) return { status: 206 };
    const account = /\/public\/account\/(tk_1|ig_1|th_1)$/.exec(url)?.[1];
    if (account) return { ok: true, status: 200, json: async () => ({ id: account, type: { tk_1: "tiktok", ig_1: "instagram", th_1: "threads" }[account], isConnected: true }) };
    if (url.endsWith("/public/schedule") && options.method === "POST") {
      posted.push(JSON.parse(options.body).accountId);
      return { ok: true, status: 200, json: async () => ({ scheduleId: `schedule_${posted.length}` }) };
    }
    if (/\/public\/schedule\/schedule_\d+$/.test(url)) {
      if (failPoll) throw new Error("poll disconnected");
      return { ok: true, status: 200, json: async () => ({ status: "success", postId: "post" }) };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
  const read = async () => JSON.parse(await readFile(receiptFile, "utf8"));
  const run = (overrides = {}) => runPublish({ argv: ["--slug", dir, "--file", file, "--approved"], env: envFixture(overrides), runCommand: async () => ({}), fetchImpl, sleep: async () => {} });
  return { dir, posted, read, run, edit: async (post) => writeFile(receiptFile, JSON.stringify({ ...await read(), post })), failPolling: () => { failPoll = true; }, resumePolling: () => { failPoll = false; } };
}

test("runPublish retains blocked history when a new platform succeeds and still blocks on the next run", async (t) => {
  const f = await recoveryFixture(t);
  await f.run({ REPLIZ_TIKTOK_ACCOUNT_ID: "" });
  await f.edit({ description: "Caption v2" });
  const second = await f.run();
  assert.deepEqual(second.blocked.map((b) => b.platform), ["instagram"]);
  const saved = await f.read();
  assert.equal(saved.schedules.find((s) => s.platform === "instagram")?.scheduleId, "schedule_1");
  assert.equal(saved.blocked[0].platform, "instagram");
  const third = await f.run();
  assert.equal(third.skipped, true);
  assert.deepEqual(f.posted, ["ig_1", "tk_1"]);
  assert.deepEqual(third.blocked.map((b) => b.platform), ["instagram"]);
});

test("runPublish retains temporarily unconfigured targets while another platform is added", async (t) => {
  const f = await recoveryFixture(t);
  await f.run();
  await f.run({ REPLIZ_TIKTOK_ACCOUNT_ID: "", REPLIZ_THREADS_ACCOUNT_ID: "th_1" });
  assert.equal((await f.read()).schedules.find((s) => s.platform === "tiktok")?.scheduleId, "schedule_1");
  await f.run({ REPLIZ_THREADS_ACCOUNT_ID: "th_1" });
  assert.deepEqual(f.posted, ["tk_1", "ig_1", "th_1"]);
});

test("runPublish checkpoints pending IDs before polling fails and resumes without another POST", async (t) => {
  const f = await recoveryFixture(t);
  f.failPolling();
  await assert.rejects(f.run(), /poll disconnected/);
  const saved = await f.read();
  assert.ok(Array.isArray(saved.schedules), 'pending schedule IDs must survive the polling failure');
  assert.deepEqual(saved.schedules.map((s) => [s.scheduleId, s.status]), [["schedule_1", "pending"], ["schedule_2", "pending"]]);
  assert.ok(saved.schedules.every((s) => s.targetKey));
  f.resumePolling();
  const resumed = await f.run();
  assert.equal(resumed.skipped, true);
  assert.ok((await f.read()).schedules.every((s) => s.status === "success"));
  assert.deepEqual(f.posted, ["tk_1", "ig_1"]);
});

test("createSchedules stops before the next target when checkpoint persistence fails", async () => {
  let posts = 0;
  const failure = new Error("disk unavailable");
  await assert.rejects(createSchedules({
    config: loadConfig(envFixture()), targetAccounts: [{ platform: "instagram", accountId: "ig_1" }, { platform: "tiktok", accountId: "tk_1" }],
    post: { description: "Caption" }, videoUrl: "https://media.example.com/final.mp4",
    fetchImpl: async () => { posts++; return { ok: true, status: 200, json: async () => ({ scheduleId: "schedule_1" }) }; },
    onSchedule: async (schedules) => { assert.equal(schedules[0].scheduleId, "schedule_1"); throw failure; },
  }), (e) => e === failure);
  assert.equal(posts, 1);
});

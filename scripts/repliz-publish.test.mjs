import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
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
  parseArgs,
  pollSchedules,
  readPostMetadata,
  runPublish,
  sanitizeTitleForPlatform,
  shouldSkipPublish,
  uploadToR2,
  validateAccounts,
  verifyPublicUrl,
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

test("CLI help prints usage", () => {
  const result = spawnSync(process.execPath, ["scripts/repliz-publish.mjs", "--help"], {
    cwd: path.resolve("."),
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /--slug <dir>/);
});

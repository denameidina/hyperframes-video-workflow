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
  loadConfig,
  makePublishKey,
  parseArgs,
  pollSchedules,
  readPostMetadata,
  runPublish,
  shouldSkipPublish,
  uploadToR2,
  validateAccounts,
  verifyPublicUrl,
} from "./repliz-publish.mjs";

test("parseArgs requires slug and file", () => {
  assert.deepEqual(parseArgs(["--slug", "videos/0702-2", "--file", "renders/final.mp4"]), {
    slug: "videos/0702-2",
    file: "renders/final.mp4",
    force: false,
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
  assert.equal(payload.type, "video");
  assert.equal(payload.medias[0].type, "video");
  assert.equal(payload.medias[0].url, "https://media.example.com/final-renders/0702-2/final.mp4");
  assert.deepEqual(payload.additionalInfo.tags, ["editing"]);
  assert.deepEqual(payload.additionalInfo.mentions, ["dena"]);
  assert.deepEqual(payload.additionalInfo.targetCountries, ["ID"]);
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
    runCommand: async (command, args) => {
      calls.push({ command, args });
      return { stdout: "ok", stderr: "" };
    },
  });

  assert.deepEqual(result, { uploaded: true });
  assert.deepEqual(calls, [
    {
      command: "npx",
      args: [
        "wrangler",
        "r2",
        "object",
        "put",
        "bucket/final-renders/0702-2/final.mp4",
        "--file",
        file,
        "--content-type",
        "video/mp4",
      ],
    },
  ]);
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
    runCommand: async (command, args) => {
      calls.push({ command, args });
      return { stdout: "ok", stderr: "" };
    },
  });

  assert.equal(calls[0].args.at(-1), "--force");
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
  assert.throws(() => loadConfig(envFixture({ R2_BUCKET: "" })), /Missing env: R2_BUCKET/);
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
    argv: ["--slug", slugDir, "--file", renderFile],
    env: envFixture(),
    runCommand: async (command, args) => {
      wranglerCalls.push({ command, args });
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

  const second = await runPublish({
    argv: ["--slug", slugDir, "--file", renderFile],
    env: envFixture(),
    runCommand: async (command, args) => {
      wranglerCalls.push({ command, args });
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

# Repliz R2 Auto Publish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `npm run repliz:publish` so an approved rendered MP4 uploads to Cloudflare R2, then Repliz schedules the R2 video URL to Facebook, YouTube, TikTok, and Instagram account IDs from `.env`.

**Architecture:** Add one Node.js ESM CLI at `scripts/repliz-publish.mjs` and one `node:test` file. Keep network boundaries injectable so unit tests use fake Wrangler commands and fake Repliz calls without credentials. Require `--approved` before network work, upload to Cloudflare R2 bucket from `R2_BUCKET` with Wrangler CLI using `--remote`, then call Repliz Public API with Basic Auth. Public video URLs use `https://<r2-public-domain>`.

**Tech Stack:** Node.js 22+, native `node:test`, native `process.loadEnvFile`, native `fetch`, Wrangler CLI via `npx wrangler`, local Repliz OpenAPI spec at `docs/repliz/openapi.json`.

---

## File Structure

- Modify: `package.json`  
  Add `repliz:publish` and `test:repliz` scripts. No R2 SDK dependency is needed.
- Create: `scripts/repliz-publish.mjs`  
  CLI plus exported helpers for config, R2 upload, Repliz payloads, duplicate guard, account validation, schedule creation, receipt writing, and polling.
- Create: `scripts/repliz-publish.test.mjs`  
  Fast unit tests with no network and no real credentials.

## Task 1: Package Wiring

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add publish and test scripts**

Patch `package.json` so it contains these scripts:

```json
{
  "name": "videos",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "npx --yes hyperframes@0.7.24 preview",
    "check": "npx --yes hyperframes@0.7.24 lint && npx --yes hyperframes@0.7.24 validate && npx --yes hyperframes@0.7.24 inspect",
    "render": "npx --yes hyperframes@0.7.24 render",
    "publish": "npx --yes hyperframes@0.7.24 publish",
    "repliz:publish": "node scripts/repliz-publish.mjs",
    "test:repliz": "node --test scripts/repliz-publish.test.mjs"
  }
}
```

- [ ] **Step 2: Verify scripts are registered**

Run:

```bash
npm run repliz:publish -- --help
```

Expected before the CLI exists: fails with `Cannot find module` for `scripts/repliz-publish.mjs`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add repliz publish package wiring"
```

## Task 2: Pure Publish Helpers

**Files:**
- Create: `scripts/repliz-publish.test.mjs`
- Create: `scripts/repliz-publish.mjs`

- [ ] **Step 1: Write failing tests for pure helpers**

Create `scripts/repliz-publish.test.mjs` with:

```javascript
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  buildPublicUrl,
  buildR2Key,
  buildSchedulePayload,
  buildTargetAccounts,
  makePublishKey,
  parseArgs,
  readPostMetadata,
  shouldSkipPublish,
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
    buildR2Key({ prefix: "/publish-prefix/", slug: "videos/0702-2/", file: "renders/final.mp4" }),
    "<r2-prefix>/0702-2/final.mp4",
  );
});

test("buildPublicUrl keeps object path slashes but encodes spaces", () => {
  assert.equal(
    buildPublicUrl("https://<r2-public-domain>/", "<r2-prefix>/0702-2/final video.mp4"),
    "https://<r2-public-domain>/final%20renders/0702-2/final%20video.mp4",
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
    videoUrl: "https://<r2-public-domain>/<r2-prefix>/0702-2/final.mp4",
  });

  assert.equal(payload.accountId, "tk_1");
  assert.equal(payload.type, "video");
  assert.equal(payload.medias[0].type, "video");
  assert.equal(payload.medias[0].url, "https://<r2-public-domain>/<r2-prefix>/0702-2/final.mp4");
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
    r2Key: "<r2-prefix>/0702-2/final.mp4",
    targetAccounts: [{ platform: "tiktok", accountId: "tk_1" }],
    description: "Caption final",
  });
  const receipt = { publishKey: key, schedules: [{ scheduleId: "sch_1" }] };

  assert.equal(shouldSkipPublish(receipt, key, false), true);
  assert.equal(shouldSkipPublish(receipt, key, true), false);
  assert.equal(shouldSkipPublish(receipt, "different", false), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test:repliz
```

Expected: FAIL because `scripts/repliz-publish.mjs` does not exist or does not export the named helpers.

- [ ] **Step 3: Implement the pure helper layer**

Create `scripts/repliz-publish.mjs` with the imports, constants, and helper functions below. Later tasks will append network functions and `main()`.

```javascript
#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const TARGET_ENV = [
  ["facebook", "REPLIZ_FACEBOOK_ACCOUNT_ID"],
  ["youtube", "REPLIZ_YOUTUBE_ACCOUNT_ID"],
  ["tiktok", "REPLIZ_TIKTOK_ACCOUNT_ID"],
  ["instagram", "REPLIZ_INSTAGRAM_ACCOUNT_ID"],
];

const DEFAULT_POST = {
  title: "",
  description: "",
  topic: "",
  type: "video",
  tags: [],
  mentions: [],
  targetCountries: ["ID"],
  scheduleAt: "now",
};

export function parseArgs(argv) {
  const args = { slug: "", file: "", force: false, approved: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "--approved") {
      args.approved = true;
    } else if (arg === "--slug") {
      args.slug = argv[++i] || "";
    } else if (arg === "--file") {
      args.file = argv[++i] || "";
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.help && !args.slug) throw new Error("Missing required --slug");
  if (!args.help && !args.file) throw new Error("Missing required --file");
  return args;
}

export function buildTargetAccounts(env) {
  return TARGET_ENV
    .map(([platform, envName]) => ({ platform, accountId: (env[envName] || "").trim() }))
    .filter((target) => target.accountId);
}

function trimSlashes(value) {
  return String(value || "").replace(/^\/+|\/+$/g, "");
}

export function buildR2Key({ prefix, slug, file }) {
  const cleanPrefix = trimSlashes(prefix || "publish-prefix");
  const slugName = path.basename(trimSlashes(slug));
  const fileName = path.basename(file);
  return [cleanPrefix, slugName, fileName].filter(Boolean).join("/");
}

export function buildPublicUrl(baseUrl, key) {
  const base = String(baseUrl || "").replace(/\/+$/g, "");
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${base}/${encodedKey}`;
}

export function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function makePublishKey({ r2Key, targetAccounts, description }) {
  const sortedTargets = [...targetAccounts]
    .map(({ platform, accountId }) => ({ platform, accountId }))
    .sort((a, b) => `${a.platform}:${a.accountId}`.localeCompare(`${b.platform}:${b.accountId}`));
  return sha256(JSON.stringify({ r2Key, targetAccounts: sortedTargets, description }));
}

export function shouldSkipPublish(receipt, publishKey, force) {
  return Boolean(!force && receipt?.publishKey === publishKey && receipt?.schedules?.length);
}

export async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function readPostMetadata(slugDir) {
  const data = await readJsonIfExists(path.join(slugDir, "repliz-publish.json"));
  const source = data?.post || data || {};
  return {
    ...DEFAULT_POST,
    ...source,
    tags: Array.isArray(source.tags) ? source.tags : DEFAULT_POST.tags,
    mentions: Array.isArray(source.mentions) ? source.mentions : DEFAULT_POST.mentions,
    targetCountries: Array.isArray(source.targetCountries)
      ? source.targetCountries
      : DEFAULT_POST.targetCountries,
  };
}

export function scheduleAtIso(scheduleAt, now = new Date()) {
  if (!scheduleAt || scheduleAt === "now") {
    return new Date(now.getTime() + 60_000).toISOString();
  }
  return new Date(scheduleAt).toISOString();
}

export function buildSchedulePayload({ accountId, post, videoUrl, now = new Date() }) {
  return {
    title: post.title,
    description: post.description,
    topic: post.topic,
    type: post.type,
    medias: [
      {
        alt: "",
        customThumbnail: false,
        type: "video",
        thumbnail: "",
        url: videoUrl,
      },
    ],
    meta: {
      title: "",
      description: "",
      url: "",
    },
    additionalInfo: {
      isAiGenerated: false,
      isDraft: false,
      collaborators: [],
      music: {
        id: "",
        artist: "",
        name: "",
        thumbnail: "",
      },
      products: [],
      tags: post.tags,
      mentions: post.mentions,
      link: "",
      targetCountries: post.targetCountries,
    },
    replies: [],
    accountId,
    scheduleAt: scheduleAtIso(post.scheduleAt, now),
  };
}
```

- [ ] **Step 4: Run tests to verify pure helpers pass**

Run:

```bash
npm run test:repliz
```

Expected: PASS for the helper tests added in Step 1.

- [ ] **Step 5: Commit**

```bash
git add scripts/repliz-publish.mjs scripts/repliz-publish.test.mjs
git commit -m "feat: add repliz publish helpers"
```

## Task 3: R2 Upload and Public URL Verification

**Files:**
- Modify: `scripts/repliz-publish.test.mjs`
- Modify: `scripts/repliz-publish.mjs`

- [ ] **Step 1: Add failing tests for R2 upload behavior**

Append to `scripts/repliz-publish.test.mjs`:

```javascript
import {
  uploadToR2,
  verifyPublicUrl,
} from "./repliz-publish.mjs";

test("uploadToR2 uploads with Wrangler and video/mp4 content type", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "r2-upload-"));
  const file = path.join(dir, "final.mp4");
  await writeFile(file, "fake mp4 bytes");

  const calls = [];
  const result = await uploadToR2({
    bucket: "bucket",
    key: "<r2-prefix>/0702-2/final.mp4",
    file,
    force: false,
    accountId: "cf_account",
    runCommand: async (command, args, options) => {
      calls.push({ command, args, options });
      return { ETag: "\"uploaded\"" };
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
        "bucket/<r2-prefix>/0702-2/final.mp4",
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

test("verifyPublicUrl accepts 200 and 206 responses", async () => {
  assert.equal(await verifyPublicUrl("https://<r2-public-domain>/video.mp4", async () => ({ status: 200 })), true);
  assert.equal(await verifyPublicUrl("https://<r2-public-domain>/video.mp4", async () => ({ status: 206 })), true);
  await assert.rejects(
    () => verifyPublicUrl("https://<r2-public-domain>/video.mp4", async () => ({ status: 403 })),
    /R2 public URL is not reachable/,
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test:repliz
```

Expected: FAIL because R2 functions are not exported yet.

- [ ] **Step 3: Implement R2 functions**

Append to `scripts/repliz-publish.mjs`:

```javascript
export async function uploadToR2({ bucket, key, file, force, accountId, runCommand = execFileAsync }) {
  await access(file);
  const args = [
    "wrangler",
    "r2",
    "object",
    "put",
    `${bucket}/${key}`,
    "--remote",
    "--file",
    file,
    "--content-type",
    "video/mp4",
  ];
  if (force) args.push("--force");

  await runCommand("npx", args, {
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId },
  });

  return { uploaded: true };
}

export async function verifyPublicUrl(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Range: "bytes=0-0" },
  });
  if (response.status === 200 || response.status === 206) return true;
  throw new Error(`R2 public URL is not reachable: ${response.status}`);
}
```

- [ ] **Step 4: Run tests to verify R2 behavior passes**

Run:

```bash
npm run test:repliz
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/repliz-publish.mjs scripts/repliz-publish.test.mjs
git commit -m "feat: upload rendered videos to r2"
```

## Task 4: Repliz Client

**Files:**
- Modify: `scripts/repliz-publish.test.mjs`
- Modify: `scripts/repliz-publish.mjs`

- [ ] **Step 1: Add failing tests for Repliz account validation and schedule creation**

Append to `scripts/repliz-publish.test.mjs`:

```javascript
import {
  basicAuthHeader,
  createSchedules,
  pollSchedules,
  validateAccounts,
} from "./repliz-publish.mjs";

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
    videoUrl: "https://<r2-public-domain>/<r2-prefix>/0702-2/final.mp4",
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test:repliz
```

Expected: FAIL because Repliz functions are not exported yet.

- [ ] **Step 3: Implement Repliz functions**

Append to `scripts/repliz-publish.mjs`:

```javascript
export function basicAuthHeader({ replizAccessKey, replizSecretKey }) {
  return `Basic ${Buffer.from(`${replizAccessKey}:${replizSecretKey}`).toString("base64")}`;
}

function jsonHeaders(config) {
  return {
    Authorization: basicAuthHeader(config),
    "Content-Type": "application/json",
  };
}

function apiUrl(baseUrl, apiPath) {
  return new URL(apiPath, `${baseUrl.replace(/\/+$/g, "")}/`).toString();
}

async function readJsonResponse(response) {
  if (response.status === 204) return null;
  return response.json();
}

async function replizJson({ config, apiPath, method = "GET", body, fetchImpl = fetch }) {
  const response = await fetchImpl(apiUrl(config.replizApiBaseUrl, apiPath), {
    method,
    headers: jsonHeaders(config),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(data?.message || `Repliz API failed: ${response.status}`);
  }
  return data;
}

export async function validateAccounts({ config, targetAccounts, fetchImpl = fetch }) {
  const accounts = [];
  for (const target of targetAccounts) {
    const account = await replizJson({
      config,
      apiPath: `/public/account/${encodeURIComponent(target.accountId)}`,
      fetchImpl,
    });
    if (!account.isConnected) {
      throw new Error(`Repliz account ${target.accountId} is not connected`);
    }
    if (account.type !== target.platform) {
      throw new Error(`Repliz account ${target.accountId} expected ${target.platform}, got ${account.type}`);
    }
    accounts.push(account);
  }
  return accounts;
}

export async function createSchedules({ config, targetAccounts, post, videoUrl, now = new Date(), fetchImpl = fetch }) {
  const schedules = [];
  for (const target of targetAccounts) {
    try {
      const payload = buildSchedulePayload({
        accountId: target.accountId,
        post,
        videoUrl,
        now,
      });
      const response = await replizJson({
        config,
        apiPath: "/public/schedule",
        method: "POST",
        body: payload,
        fetchImpl,
      });
      schedules.push({
        accountId: target.accountId,
        platform: target.platform,
        scheduleId: response.scheduleId,
        status: "pending",
      });
    } catch (error) {
      schedules.push({
        accountId: target.accountId,
        platform: target.platform,
        status: "error",
        error: error.message,
      });
    }
  }
  return schedules;
}

export async function pollSchedules({
  config,
  schedules,
  timeoutMs = 120_000,
  intervalMs = 5_000,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const deadline = Date.now() + timeoutMs;
  const current = schedules.map((schedule) => ({ ...schedule }));

  while (Date.now() <= deadline) {
    let pendingCount = 0;

    for (const schedule of current) {
      if (!schedule.scheduleId || schedule.status === "success" || schedule.status === "error") continue;
      pendingCount += 1;
      const detail = await replizJson({
        config,
        apiPath: `/public/schedule/${encodeURIComponent(schedule.scheduleId)}`,
        fetchImpl,
      });
      schedule.status = detail.status || schedule.status;
      if (detail.postId) schedule.postId = detail.postId;
    }

    if (pendingCount === 0 || current.every((schedule) => schedule.status === "success" || schedule.status === "error")) {
      return current;
    }
    await sleep(intervalMs);
  }

  return current;
}
```

- [ ] **Step 4: Run tests to verify Repliz client passes**

Run:

```bash
npm run test:repliz
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/repliz-publish.mjs scripts/repliz-publish.test.mjs
git commit -m "feat: create repliz schedules"
```

## Task 5: CLI Orchestration and Receipt File

**Files:**
- Modify: `scripts/repliz-publish.test.mjs`
- Modify: `scripts/repliz-publish.mjs`

- [ ] **Step 1: Add failing CLI orchestration tests**

Append to `scripts/repliz-publish.test.mjs`:

```javascript
import {
  loadConfig,
  runPublish,
} from "./repliz-publish.mjs";

function envFixture(overrides = {}) {
  return {
    REPLIZ_API_BASE_URL: "https://api.repliz.test",
    REPLIZ_ACCESS_KEY: "access",
    REPLIZ_SECRET_KEY: "secret",
    CLOUDFLARE_ACCOUNT_ID: "cf_account",
    R2_BUCKET: "bucket",
    R2_PUBLIC_BASE_URL: "https://<r2-public-domain>",
    R2_PREFIX: "publish-prefix",
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

test("runPublish uploads to R2, creates schedules, writes receipt, and skips duplicate rerun", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "repliz-run-"));
  const slugDir = path.join(dir, "videos", "0702-2");
  const renderFile = path.join(dir, "renders", "final.mp4");
  await mkdir(slugDir, { recursive: true });
  await mkdir(path.dirname(renderFile), { recursive: true });
  await writeTempFile(renderFile, "fake mp4 bytes");
  await writeFile(
    path.join(slugDir, "repliz-publish.json"),
    JSON.stringify({ post: { description: "Caption final", tags: ["editing"] } }),
  );

  const wranglerCalls = [];
  const runCommand = async (command, args, options) => {
    wranglerCalls.push({ command, args, options });
    return { stdout: "ok", stderr: "" };
  };

  const fetchCalls = [];
  const fetchImpl = async (url, options = {}) => {
    fetchCalls.push({ url, options });
    if (url.startsWith("https://<r2-public-domain>/")) return { status: 206 };
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
    runCommand,
    fetchImpl,
    now: new Date("2026-07-03T01:39:08.119Z"),
    sleep: async () => {},
  });

  assert.equal(first.skipped, false);
  assert.equal(first.receipt.schedules.length, 2);
  assert.equal(first.receipt.videoUrl, "https://<r2-public-domain>/<r2-prefix>/0702-2/final.mp4");
  assert.equal(wranglerCalls.length, 1);
  assert.equal(wranglerCalls[0].command, "npx");
  assert.equal(wranglerCalls[0].args[4], "bucket/<r2-prefix>/0702-2/final.mp4");
  assert.ok(wranglerCalls[0].args.includes("--remote"));
  assert.equal(wranglerCalls[0].options.env.CLOUDFLARE_ACCOUNT_ID, "cf_account");

  const second = await runPublish({
    argv: ["--slug", slugDir, "--file", renderFile, "--approved"],
    env: envFixture(),
    runCommand,
    fetchImpl,
    now: new Date("2026-07-03T01:39:08.119Z"),
    sleep: async () => {},
  });

  assert.equal(second.skipped, true);
  const receipt = JSON.parse(await readFile(path.join(slugDir, "repliz-publish.json"), "utf8"));
  assert.equal(receipt.r2Key, "<r2-prefix>/0702-2/final.mp4");
  assert.equal(receipt.post.description, "Caption final");
  assert.equal(receipt.schedules[0].status, "success");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm run test:repliz
```

Expected: FAIL because config loading and `runPublish` are not exported yet.

- [ ] **Step 3: Implement config, receipt, and orchestration**

Append to `scripts/repliz-publish.mjs`:

```javascript
export function loadConfig(env) {
  const required = [
    "REPLIZ_API_BASE_URL",
    "REPLIZ_ACCESS_KEY",
    "REPLIZ_SECRET_KEY",
    "CLOUDFLARE_ACCOUNT_ID",
    "R2_BUCKET",
    "R2_PUBLIC_BASE_URL",
  ];
  const missing = required.filter((name) => !String(env[name] || "").trim());
  if (missing.length) throw new Error(`Missing env: ${missing.join(", ")}`);

  return {
    replizApiBaseUrl: env.REPLIZ_API_BASE_URL.trim(),
    replizAccessKey: env.REPLIZ_ACCESS_KEY.trim(),
    replizSecretKey: env.REPLIZ_SECRET_KEY.trim(),
    cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID.trim(),
    r2Bucket: env.R2_BUCKET.trim(),
    r2PublicBaseUrl: env.R2_PUBLIC_BASE_URL.trim(),
    r2Prefix: String(env.R2_PREFIX || "publish-prefix").trim() || "publish-prefix",
  };
}

async function writeReceipt(slugDir, receipt) {
  await mkdir(slugDir, { recursive: true });
  const receiptPath = path.join(slugDir, "repliz-publish.json");
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
}

export async function runPublish({
  argv,
  env = process.env,
  runCommand = execFileAsync,
  fetchImpl = fetch,
  now = new Date(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const args = parseArgs(argv);
  if (args.help) return { help: true };
  if (!args.approved) {
    throw new Error("Publishing requires user approval. Re-run with --approved after review.");
  }

  const config = loadConfig(env);
  const targetAccounts = buildTargetAccounts(env);
  if (!targetAccounts.length) throw new Error("No target account IDs configured");

  const post = await readPostMetadata(args.slug);
  const existingReceipt = await readJsonIfExists(path.join(args.slug, "repliz-publish.json"));
  const r2Key = buildR2Key({ prefix: config.r2Prefix, slug: args.slug, file: args.file });
  const videoUrl = buildPublicUrl(config.r2PublicBaseUrl, r2Key);
  const publishKey = makePublishKey({
    r2Key,
    targetAccounts,
    description: post.description,
  });

  if (shouldSkipPublish(existingReceipt, publishKey, args.force)) {
    return { skipped: true, receipt: existingReceipt };
  }

  await uploadToR2({
    bucket: config.r2Bucket,
    key: r2Key,
    file: args.file,
    force: args.force,
    accountId: config.cloudflareAccountId,
    runCommand,
  });
  await verifyPublicUrl(videoUrl, fetchImpl);
  await validateAccounts({ config, targetAccounts, fetchImpl });

  const schedules = await createSchedules({
    config,
    targetAccounts,
    post,
    videoUrl,
    now,
    fetchImpl,
  });
  const polledSchedules = await pollSchedules({
    config,
    schedules,
    fetchImpl,
    sleep,
  });

  const receipt = {
    post,
    r2Bucket: config.r2Bucket,
    r2Key,
    videoUrl,
    descriptionHash: sha256(post.description),
    publishKey,
    createdAt: now.toISOString(),
    schedules: polledSchedules,
  };

  await writeReceipt(args.slug, receipt);
  return { skipped: false, receipt };
}
```

- [ ] **Step 4: Run tests to verify orchestration passes**

Run:

```bash
npm run test:repliz
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/repliz-publish.mjs scripts/repliz-publish.test.mjs
git commit -m "feat: orchestrate repliz auto publish"
```

## Task 6: CLI Entry Point

**Files:**
- Modify: `scripts/repliz-publish.mjs`

- [ ] **Step 1: Add the CLI entry point**

Append to `scripts/repliz-publish.mjs`:

```javascript
function printHelp() {
  console.log(`Usage:
  npm run repliz:publish -- --slug videos/0702-2 --file renders/final.mp4 --approved

Options:
  --slug <dir>   Video working directory containing repliz-publish.json receipt/metadata
  --file <mp4>   Rendered MP4 file to upload to Cloudflare R2
  --approved     Required after user review; unlocks R2 upload and Repliz scheduling
  --force        Re-upload to R2 and create new Repliz schedules
  --help         Show this help
`);
}

async function loadDotEnv() {
  if (!process.loadEnvFile) return;
  try {
    process.loadEnvFile(".env");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function main() {
  await loadDotEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const result = await runPublish({
    argv: process.argv.slice(2),
    env: process.env,
  });

  if (result.skipped) {
    console.log(`Skipped duplicate publish. Receipt: ${path.join(args.slug, "repliz-publish.json")}`);
    return;
  }

  console.log(`Uploaded: ${result.receipt.videoUrl}`);
  for (const schedule of result.receipt.schedules) {
    const id = schedule.scheduleId || "no-schedule-id";
    console.log(`${schedule.platform}: ${schedule.status} ${id}`);
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 2: Verify help output works**

Run:

```bash
npm run repliz:publish -- --help
```

Expected: prints usage and exits with status 0.

- [ ] **Step 3: Verify missing env fails before network**

Run:

```bash
npm run repliz:publish -- --slug videos/0702-2 --file renders/final.mp4 --approved
```

Expected without `.env`: exits non-zero and prints `Missing env:` with the missing required names.

- [ ] **Step 4: Run full local tests**

Run:

```bash
npm run test:repliz
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/repliz-publish.mjs
git commit -m "feat: add repliz publish cli"
```

## Task 7: Final Verification

**Files:**
- Read: `docs/repliz/integration-spec.md`
- Read: `scripts/repliz-publish.mjs`
- Read: `scripts/repliz-publish.test.mjs`

- [ ] **Step 1: Run Repliz tests**

Run:

```bash
npm run test:repliz
```

Expected: PASS.

- [ ] **Step 2: Run CLI help**

Run:

```bash
npm run repliz:publish -- --help
```

Expected: prints usage.

- [ ] **Step 3: Confirm HyperFrames check is not required**

Run:

```bash
git diff --name-only HEAD
```

Expected: no `.html` files are listed. If no `.html` files changed, `npm run check` is not required by `AGENTS.md`.

- [ ] **Step 4: Review spec coverage**

Confirm these requirements have implementation:

- R2 upload uses `CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID}" npx wrangler r2 object put "${R2_BUCKET}/${objectKey}" --remote --file "${renderFile}" --content-type video/mp4`.
- CLI refuses R2 upload and Repliz scheduling unless `--approved` is present after user review.
- R2 public URL is built from `R2_PUBLIC_BASE_URL` and checked with HTTP `200` or `206`.
- Repliz API uses Basic Auth from `REPLIZ_ACCESS_KEY` and `REPLIZ_SECRET_KEY`.
- Target accounts come from `REPLIZ_FACEBOOK_ACCOUNT_ID`, `REPLIZ_YOUTUBE_ACCOUNT_ID`, `REPLIZ_TIKTOK_ACCOUNT_ID`, and `REPLIZ_INSTAGRAM_ACCOUNT_ID`.
- Account validation rejects missing, disconnected, or platform-mismatched accounts before schedule creation.
- Duplicate guard uses `r2Key + targetAccounts + description`.
- Receipt writes `r2Bucket`, `r2Key`, `videoUrl`, `descriptionHash`, `publishKey`, and `schedules`.

- [ ] **Step 5: Commit final verified state**

```bash
git status --short
git add package.json package-lock.json scripts/repliz-publish.mjs scripts/repliz-publish.test.mjs
git commit -m "feat: auto publish rendered videos through repliz"
```

## Self-Review

- Spec coverage: Covered R2 upload, public URL generation, Repliz schedule creation, env platform IDs, duplicate guard, receipt, account validation, polling, and no-secret storage.
- Scope: OAuth, account connection, comment automation, and signed URLs stay out of MVP as required by the spec.
- Type consistency: Plan uses `targetAccounts`, `r2Key`, `videoUrl`, `post`, and `schedules` consistently across tests, implementation, and receipt.

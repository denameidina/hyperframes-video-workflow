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
  createR2Client,
  makePublishKey,
  parseArgs,
  readPostMetadata,
  shouldSkipPublish,
  uploadToR2,
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

test("createR2Client uses Cloudflare R2 endpoint and auto region", async () => {
  const client = createR2Client({
    cloudflareAccountId: "cf_account",
    r2AccessKeyId: "r2_access",
    r2SecretAccessKey: "r2_secret",
  });
  assert.equal(await client.config.region(), "auto");
  assert.equal((await client.config.endpoint()).hostname, "cf_account.r2.cloudflarestorage.com");
});

test("uploadToR2 skips existing object when force is false", async () => {
  const calls = [];
  const s3 = {
    async send(command) {
      calls.push(command.constructor.name);
      return { ETag: "\"existing\"" };
    },
  };

  const result = await uploadToR2({
    s3,
    bucket: "bucket",
    key: "final-renders/0702-2/final.mp4",
    file: "unused.mp4",
    force: false,
  });

  assert.deepEqual(calls, ["HeadObjectCommand"]);
  assert.deepEqual(result, { uploaded: false });
});

test("uploadToR2 uploads missing object with video/mp4 content type", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "r2-upload-"));
  const file = path.join(dir, "final.mp4");
  await writeFile(file, "fake mp4 bytes");

  const commands = [];
  const s3 = {
    async send(command) {
      commands.push(command);
      if (command.constructor.name === "HeadObjectCommand") {
        const error = new Error("missing");
        error.name = "NotFound";
        throw error;
      }
      return { ETag: "\"uploaded\"" };
    },
  };

  const result = await uploadToR2({
    s3,
    bucket: "bucket",
    key: "final-renders/0702-2/final.mp4",
    file,
    force: false,
  });

  assert.equal(result.uploaded, true);
  assert.equal(commands[1].input.ContentType, "video/mp4");
  assert.equal(commands[1].input.Bucket, "bucket");
  assert.equal(commands[1].input.Key, "final-renders/0702-2/final.mp4");
});

test("verifyPublicUrl accepts 200 and 206 responses", async () => {
  assert.equal(await verifyPublicUrl("https://media.example.com/video.mp4", async () => ({ status: 200 })), true);
  assert.equal(await verifyPublicUrl("https://media.example.com/video.mp4", async () => ({ status: 206 })), true);
  await assert.rejects(
    () => verifyPublicUrl("https://media.example.com/video.mp4", async () => ({ status: 403 })),
    /R2 public URL is not reachable/,
  );
});

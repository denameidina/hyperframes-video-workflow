#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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
  const args = { slug: "", file: "", force: false, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--force") {
      args.force = true;
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
  const cleanPrefix = trimSlashes(prefix || "final-renders");
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

export function createR2Client({ cloudflareAccountId, r2AccessKeyId, r2SecretAccessKey }) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${cloudflareAccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });
}

function isMissingObject(error) {
  return error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404;
}

export async function uploadToR2({ s3, bucket, key, file, force }) {
  if (!force) {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return { uploaded: false };
    } catch (error) {
      if (!isMissingObject(error)) throw error;
    }
  }

  await access(file);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(file),
      ContentType: "video/mp4",
    }),
  );

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

export function loadConfig(env) {
  const required = [
    "REPLIZ_API_BASE_URL",
    "REPLIZ_ACCESS_KEY",
    "REPLIZ_SECRET_KEY",
    "CLOUDFLARE_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
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
    r2AccessKeyId: env.R2_ACCESS_KEY_ID.trim(),
    r2SecretAccessKey: env.R2_SECRET_ACCESS_KEY.trim(),
    r2Bucket: env.R2_BUCKET.trim(),
    r2PublicBaseUrl: env.R2_PUBLIC_BASE_URL.trim(),
    r2Prefix: String(env.R2_PREFIX || "final-renders").trim() || "final-renders",
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
  s3,
  fetchImpl = fetch,
  now = new Date(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const args = parseArgs(argv);
  if (args.help) return { help: true };

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

  const r2Client = s3 || createR2Client(config);
  await uploadToR2({
    s3: r2Client,
    bucket: config.r2Bucket,
    key: r2Key,
    file: args.file,
    force: args.force,
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

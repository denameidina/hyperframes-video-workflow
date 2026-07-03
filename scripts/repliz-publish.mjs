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

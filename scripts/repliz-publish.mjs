#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TARGET_ENV = [
  ["facebook", "REPLIZ_FACEBOOK_ACCOUNT_ID"],
  ["youtube", "REPLIZ_YOUTUBE_ACCOUNT_ID"],
  ["tiktok", "REPLIZ_TIKTOK_ACCOUNT_ID"],
  ["instagram", "REPLIZ_INSTAGRAM_ACCOUNT_ID"],
];

const YOUTUBE_TITLE_MAX_LENGTH = 100;

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

export function makePublishKey({ r2Key, targetAccounts, description, title }) {
  const sortedTargets = [...targetAccounts]
    .map(({ platform, accountId }) => ({ platform, accountId }))
    .sort((a, b) => `${a.platform}:${a.accountId}`.localeCompare(`${b.platform}:${b.accountId}`));
  return sha256(JSON.stringify({ r2Key, targetAccounts: sortedTargets, description, title: String(title || "") }));
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

async function readTextIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function extractPublishCaption(markdown, heading) {
  const headingMatch = markdown.match(new RegExp(`^##\\s+${heading}\\s*$`, "im"));
  if (!headingMatch) return "";

  const afterHeading = markdown.slice(headingMatch.index + headingMatch[0].length);
  const nextHeadingIndex = afterHeading.search(/^##\s+/m);
  const section = nextHeadingIndex === -1 ? afterHeading : afterHeading.slice(0, nextHeadingIndex);
  const fencedText = section.match(/```(?:text)?\s*\n([\s\S]*?)\n```/i)?.[1] || "";

  return fencedText.trim();
}

async function readPublishDescription(slugDir) {
  const markdown = await readTextIfExists(path.join(slugDir, "publish-captions.md"));
  if (!markdown.trim()) return "";
  return extractPublishCaption(markdown, "Instagram") || extractPublishCaption(markdown, "TikTok");
}

async function readPublishTitle(slugDir) {
  const markdown = await readTextIfExists(path.join(slugDir, "publish-captions.md"));
  if (!markdown.trim()) return "";
  return extractPublishCaption(markdown, "YouTube Title");
}

export function deriveTitleFromDescription(description, maxLength = YOUTUBE_TITLE_MAX_LENGTH) {
  const firstMeaningfulLine = String(description || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !/^#\S/.test(line));

  return truncateTitle(firstMeaningfulLine, maxLength);
}

export function truncateTitle(text, maxLength = YOUTUBE_TITLE_MAX_LENGTH) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;

  const slice = clean.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLength / 2 ? slice.slice(0, lastSpace) : slice;
  return cut.replace(/[\s.,;:!?-]+$/, "");
}

export function sanitizeTitleForPlatform(title, platform) {
  const text = String(title || "").replace(/\s+/g, " ").trim();
  if (platform !== "youtube") return text;
  return truncateTitle(text.replace(/[<>]/g, " "), YOUTUBE_TITLE_MAX_LENGTH);
}

export async function readPostMetadata(slugDir) {
  const data = await readJsonIfExists(path.join(slugDir, "repliz-publish.json"));
  const source = data?.post || data || {};
  const fallbackDescription = await readPublishDescription(slugDir);
  const description =
    String(source.description || "").trim() ||
    String(data?.description || "").trim() ||
    fallbackDescription;
  const title =
    String(source.title || "").trim() ||
    String(data?.title || "").trim() ||
    (await readPublishTitle(slugDir)) ||
    deriveTitleFromDescription(description);

  return {
    ...DEFAULT_POST,
    ...source,
    title,
    description,
    tags: Array.isArray(source.tags) ? source.tags : DEFAULT_POST.tags,
    mentions: Array.isArray(source.mentions) ? source.mentions : DEFAULT_POST.mentions,
    targetCountries: Array.isArray(source.targetCountries)
      ? source.targetCountries
      : DEFAULT_POST.targetCountries,
  };
}

function requireDescription(description, label = "post") {
  const text = String(description || "").trim();
  if (!text) throw new Error(`Missing ${label} description`);
  return text;
}

function requireTitle(title, label = "post") {
  const text = String(title || "").trim();
  if (!text) throw new Error(`Missing ${label} title`);
  return text;
}

export function scheduleAtIso(scheduleAt, now = new Date()) {
  if (!scheduleAt || scheduleAt === "now") {
    return new Date(now.getTime() + 60_000).toISOString();
  }
  return new Date(scheduleAt).toISOString();
}

export function sanitizeDescriptionForPlatform(description, platform) {
  const text = String(description || "");
  if (platform !== "youtube") return text;

  return text
    .replace(/\s*(?:->|=>|→|➜|➔)\s*/g, " ke ")
    .replace(
      /\b([\p{L}\p{N}][\p{L}\p{N}-]*)\/([\p{L}\p{N}][\p{L}\p{N}-]*)\b/gu,
      (match, left, right, offset, input) => {
        if (input.slice(Math.max(0, offset - 16), offset).includes("://")) return match;
        return `${left} dan ${right}`;
      },
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildSchedulePayload({ accountId, platform, post, videoUrl, now = new Date() }) {
  const description = requireDescription(sanitizeDescriptionForPlatform(post.description, platform), `${platform} post`);
  const title = sanitizeTitleForPlatform(post.title, platform);
  if (platform === "youtube") requireTitle(title, `${platform} post`);

  return {
    title,
    description,
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
        platform: target.platform,
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
  try {
    requireDescription(post.description);
  } catch {
    throw new Error(`Missing post description. Add ${path.join(args.slug, "repliz-publish.json")} with post.description or ${path.join(args.slug, "publish-captions.md")} before publishing.`);
  }
  if (targetAccounts.some((target) => target.platform === "youtube") && !sanitizeTitleForPlatform(post.title, "youtube")) {
    throw new Error(`Missing YouTube post title. Add ${path.join(args.slug, "repliz-publish.json")} with post.title or a "## YouTube Title" block in ${path.join(args.slug, "publish-captions.md")} before publishing.`);
  }
  const existingReceipt = await readJsonIfExists(path.join(args.slug, "repliz-publish.json"));
  const r2Key = buildR2Key({ prefix: config.r2Prefix, slug: args.slug, file: args.file });
  const videoUrl = buildPublicUrl(config.r2PublicBaseUrl, r2Key);
  const publishKey = makePublishKey({
    r2Key,
    targetAccounts,
    description: post.description,
    title: post.title,
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
    titleHash: sha256(post.title),
    publishKey,
    createdAt: now.toISOString(),
    schedules: polledSchedules,
  };

  await writeReceipt(args.slug, receipt);
  return { skipped: false, receipt };
}

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

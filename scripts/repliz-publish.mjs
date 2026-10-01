#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { normalizePublishTime } from './lib/publish-time.mjs';

const execFileAsync = promisify(execFile);

const TARGET_ENV = [
  ["facebook", "REPLIZ_FACEBOOK_ACCOUNT_ID"],
  ["youtube", "REPLIZ_YOUTUBE_ACCOUNT_ID"],
  ["tiktok", "REPLIZ_TIKTOK_ACCOUNT_ID"],
  ["instagram", "REPLIZ_INSTAGRAM_ACCOUNT_ID"],
  ["threads", "REPLIZ_THREADS_ACCOUNT_ID"],
];

const YOUTUBE_TITLE_MAX_LENGTH = 100;
const THREADS_POST_MAX_LENGTH = 150;

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
    } else if (arg === "--schedule-at") {
      args.scheduleAt = argv[++i] || "";
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

function extractAllPublishBlocks(markdown, heading) {
  const headingMatch = markdown.match(new RegExp(`^##\\s+${heading}\\s*$`, "im"));
  if (!headingMatch) return [];

  const afterHeading = markdown.slice(headingMatch.index + headingMatch[0].length);
  const nextHeadingIndex = afterHeading.search(/^##\s+/m);
  const section = nextHeadingIndex === -1 ? afterHeading : afterHeading.slice(0, nextHeadingIndex);

  return [...section.matchAll(/```(?:text)?\s*\n([\s\S]*?)\n```/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function extractPublishCaption(markdown, heading) {
  return extractAllPublishBlocks(markdown, heading)[0] || "";
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

// Word-wrap fallback for Threads when publish-captions.md has no manually authored
// "## Threads" thread: greedily packs words into <=maxLength chunks (never splits a word
// mid-character except a single word longer than maxLength on its own).
export function wrapIntoChunks(text, maxLength) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const words = clean.split(" ");
  const chunks = [];
  let current = "";
  const flush = () => {
    if (current) {
      chunks.push(current);
      current = "";
    }
  };
  for (const word of words) {
    let rest = word;
    // An unsplittable token longer than maxLength on its own (e.g. a long URL) becomes
    // its own maxLength-sized chunks rather than being silently truncated.
    while (rest.length > maxLength) {
      flush();
      chunks.push(rest.slice(0, maxLength));
      rest = rest.slice(maxLength);
    }
    const candidate = current ? `${current} ${rest}` : rest;
    if (candidate.length > maxLength) {
      flush();
      current = rest;
    } else {
      current = candidate;
    }
  }
  flush();
  return chunks;
}

// Threads thread: `## Threads` in publish-captions.md holds one fenced block per bubble
// (first = the post, the rest = reply chain, each <=150 chars). Falls back to
// word-wrapping `description` when the section is absent, so Threads never blocks on
// a caption file that predates Threads support.
async function readThreadsThread(slugDir, fallbackDescription) {
  const markdown = await readTextIfExists(path.join(slugDir, "publish-captions.md"));
  const blocks = markdown.trim() ? extractAllPublishBlocks(markdown, "Threads") : [];
  if (blocks.length) return { post: blocks[0], replies: blocks.slice(1) };

  const chunks = wrapIntoChunks(fallbackDescription, THREADS_POST_MAX_LENGTH);
  return { post: chunks[0] || "", replies: chunks.slice(1) };
}

export function validateThreadsThread(threads) {
  const bubbles = [threads?.post ?? "", ...(threads?.replies ?? [])];
  bubbles.forEach((text, index) => {
    if (text.length <= THREADS_POST_MAX_LENGTH) return;
    const label = index === 0 ? "Threads post" : `Threads reply ${index}`;
    throw new Error(`${label} exceeds ${THREADS_POST_MAX_LENGTH} characters (${text.length}): "${text}"`);
  });
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
  const explicitThreads = source.threads && typeof source.threads === "object" ? source.threads : null;
  const threads = explicitThreads && String(explicitThreads.post || "").trim()
    ? {
        post: String(explicitThreads.post).trim(),
        replies: Array.isArray(explicitThreads.replies) ? explicitThreads.replies.map((reply) => String(reply).trim()) : [],
      }
    : await readThreadsThread(slugDir, description);

  return {
    ...DEFAULT_POST,
    ...source,
    title,
    description,
    threads,
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
  const isThreads = platform === "threads";
  // Threads is a 150-char-per-bubble platform: the main post carries `post.threads.post`
  // (not the long-form `post.description`) and the rest of the caption becomes a reply
  // chain instead of being sent as one oversized description.
  if (isThreads) validateThreadsThread(post.threads);
  const description = isThreads
    ? requireDescription(post.threads?.post, `${platform} post`)
    : requireDescription(sanitizeDescriptionForPlatform(post.description, platform), `${platform} post`);
  const title = sanitizeTitleForPlatform(post.title, platform);
  if (platform === "youtube") requireTitle(title, `${platform} post`);
  const replies = isThreads
    ? (post.threads?.replies ?? []).map((text) => ({ title: "", description: text, topic: post.topic || "", type: "text", medias: [] }))
    : [];

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
    replies,
    accountId,
    scheduleAt: scheduleAtIso(post.scheduleAt, now),
  };
}

// Per-target dedup key: lets `runPublish` add a brand-new platform (e.g. Threads) to an
// already-published video without re-scheduling platforms whose content hasn't changed.
// Deliberately excludes `scheduleAt` (recomputed every run) and raw `medias` (implied by r2Key).
export function makeTargetKey({ r2Key, platform, accountId, description, title, replies }) {
  return sha256(JSON.stringify({ r2Key, platform, accountId, description, title, replies: replies || [] }));
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

export async function createSchedules({ config, targetAccounts, post, videoUrl, now = new Date(), fetchImpl = fetch, onSchedule = async () => {} }) {
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
        scheduleAt: payload.scheduleAt,
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
    // Persistence is outside the API catch: if the checkpoint fails, stop before the
    // next POST without turning an already-created remote schedule into an "error" retry.
    await onSchedule(schedules.map((schedule) => ({ ...schedule })));
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
  const temporaryPath = `${receiptPath}.${randomUUID()}.part`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
    await rename(temporaryPath, receiptPath);
  } finally {
    await rm(temporaryPath, { force: true }).catch(() => {});
  }
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
  if (args.scheduleAt !== undefined) post.scheduleAt = normalizePublishTime(args.scheduleAt, now);
  try {
    requireDescription(post.description);
  } catch {
    throw new Error(`Missing post description. Add ${path.join(args.slug, "repliz-publish.json")} with post.description or ${path.join(args.slug, "publish-captions.md")} before publishing.`);
  }
  if (targetAccounts.some((target) => target.platform === "youtube") && !sanitizeTitleForPlatform(post.title, "youtube")) {
    throw new Error(`Missing YouTube post title. Add ${path.join(args.slug, "repliz-publish.json")} with post.title or a "## YouTube Title" block in ${path.join(args.slug, "publish-captions.md")} before publishing.`);
  }
  if (targetAccounts.some((target) => target.platform === "threads")) {
    try {
      validateThreadsThread(post.threads);
    } catch (error) {
      throw new Error(`${error.message}. Fix "## Threads" in ${path.join(args.slug, "publish-captions.md")} (or post.threads in repliz-publish.json) before publishing.`);
    }
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

  // Partition per target account instead of one global skip/publish-all gate: adding a
  // brand-new platform (e.g. Threads) to a slug that already published successfully must
  // never re-send already-scheduled platforms. A target is only re-scheduled when it is
  // new, previously errored, or `--force` is set; content that changed for an
  // already-succeeded target is left alone (`blocked`) unless the caller passes `--force`.
  const priorByTarget = new Map((existingReceipt?.schedules || []).map((schedule) => [`${schedule.platform}:${schedule.accountId}`, schedule]));
  const targetKeys = new Map();
  const toSchedule = [];
  const reused = [];
  const blocked = [];
  for (const target of targetAccounts) {
    const payload = buildSchedulePayload({ accountId: target.accountId, platform: target.platform, post, videoUrl, now });
    const targetKey = makeTargetKey({ r2Key, platform: target.platform, accountId: target.accountId, description: payload.description, title: payload.title, replies: payload.replies });
    targetKeys.set(`${target.platform}:${target.accountId}`, targetKey);
    const prior = priorByTarget.get(`${target.platform}:${target.accountId}`);

    if (args.force || !prior || prior.status === "error") {
      toSchedule.push(target);
    } else if (!prior.targetKey || prior.targetKey === targetKey) {
      // Missing `targetKey` means the receipt predates this field (an older publish run):
      // there is no prior content to compare against, so treat it as unchanged rather than
      // guessing it was edited. Stamp the now-known targetKey below so future runs can compare.
      reused.push({ ...prior, targetKey });
    } else {
      blocked.push({ platform: target.platform, accountId: target.accountId, reason: "content changed since the last successful publish; rerun with --force to repost" });
    }
  }

  // A reused entry that never reached a terminal status (still `pending`/`process` from an
  // earlier run) is worth refreshing even when nothing new needs scheduling.
  const nonTerminalReused = reused.filter((schedule) => schedule.status !== "success" && schedule.status !== "error" && schedule.scheduleId &&
    (!schedule.scheduleAt || new Date(schedule.scheduleAt).getTime() <= now.getTime() + 60_000));
  const refreshedReused = nonTerminalReused.length
    ? await pollSchedules({ config, schedules: nonTerminalReused, fetchImpl, sleep })
    : [];
  const reusedFinal = reused.map((schedule) => refreshedReused.find((updated) => updated.scheduleId === schedule.scheduleId) || schedule);
  // Keep the entire history, including blocked and temporarily disabled targets.
  // Dropping one makes the next run mistake it for an account that was never scheduled.
  const history = new Map(priorByTarget);
  for (const schedule of reusedFinal) history.set(`${schedule.platform}:${schedule.accountId}`, schedule);

  if (!toSchedule.length) {
    const { blocked: _oldBlocked, ...receiptWithoutBlocked } = existingReceipt || {};
    const receipt = { ...receiptWithoutBlocked, schedules: [...history.values()], ...(blocked.length ? { blocked } : {}) };
    if (JSON.stringify(receipt) !== JSON.stringify(existingReceipt)) await writeReceipt(args.slug, receipt);
    return { skipped: true, receipt, blocked };
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
  await validateAccounts({ config, targetAccounts: toSchedule, fetchImpl });

  const { blocked: _oldBlocked, ...receiptWithoutBlocked } = existingReceipt || {};
  const receiptBase = {
    ...receiptWithoutBlocked,
    post,
    r2Bucket: config.r2Bucket,
    r2Key,
    videoUrl,
    descriptionHash: sha256(post.description),
    titleHash: sha256(post.title),
    publishKey,
    createdAt: now.toISOString(),
    ...(blocked.length ? { blocked } : {}),
  };
  const checkpoint = async (schedules) => {
    for (const schedule of schedules) {
      const key = `${schedule.platform}:${schedule.accountId}`;
      history.set(key, { ...schedule, targetKey: targetKeys.get(key) });
    }
    const receipt = { ...receiptBase, schedules: [...history.values()] };
    await writeReceipt(args.slug, receipt);
    return receipt;
  };
  const newSchedules = await createSchedules({
    config,
    targetAccounts: toSchedule,
    post,
    videoUrl,
    now,
    fetchImpl,
    onSchedule: checkpoint,
  });
  const immediate = newSchedules.filter((s) => !s.scheduleAt || new Date(s.scheduleAt).getTime() <= now.getTime() + 60_000);
  const polledImmediate = await pollSchedules({
    config,
    schedules: immediate,
    fetchImpl,
    sleep,
  });
  const polledNew = newSchedules.map((s) => polledImmediate.find((p) => p.accountId === s.accountId && p.platform === s.platform) || s);
  const receipt = await checkpoint(polledNew);
  return { skipped: false, receipt, blocked };
}

function printHelp() {
  console.log(`Usage:
  npm run repliz:publish -- --slug videos/0702-2 --file renders/final.mp4 --approved

Options:
  --slug <dir>   Video working directory containing repliz-publish.json receipt/metadata
  --file <mp4>   Rendered MP4 file to upload to Cloudflare R2
  --approved     Required after user review; unlocks R2 upload and Repliz scheduling
  --force        Re-upload to R2 and create new Repliz schedules
  --schedule-at <ISO|now>  Override the publish date (ISO must include a timezone)
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
    for (const item of result.blocked || []) console.log(`${item.platform}: blocked — ${item.reason}`);
    return;
  }

  console.log(`Uploaded: ${result.receipt.videoUrl}`);
  for (const schedule of result.receipt.schedules) {
    const id = schedule.scheduleId || "no-schedule-id";
    console.log(`${schedule.platform}: ${schedule.status} ${id}`);
  }
  for (const item of result.blocked || []) console.log(`${item.platform}: blocked — ${item.reason}`);
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

# Repliz Description Required Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every Repliz scheduled post payload has a non-empty `description`, using existing per-video metadata first and `publish-captions.md` as the fallback.

**Architecture:** Keep the fix inside the existing Node ESM CLI, `scripts/repliz-publish.mjs`. `readPostMetadata()` should resolve one final post description from `repliz-publish.json` or `publish-captions.md`, and `buildSchedulePayload()` should reject any platform payload whose final sanitized description is empty. No new dependencies and no generic Markdown parser.

**Tech Stack:** Node.js ESM, `node:test`, `node:fs/promises`, existing Repliz R2 publish CLI.

---

## Scope

In scope:

- Use `repliz-publish.json` `post.description` or root `description` when present.
- If metadata description is missing or blank, read `videos/<slug>/publish-captions.md`.
- Prefer the `Instagram` caption block from `publish-captions.md`; fall back to `TikTok`.
- Stop before R2 upload and Repliz scheduling if the final description is still blank.
- Validate the final per-platform payload description after YouTube sanitization.
- Add tests that prove every schedule body receives a non-empty description.

Out of scope:

- Updating old live Repliz posts that were already created with blank descriptions.
- Supporting arbitrary Markdown layouts beyond the current Agent 03 `publish-captions.md` shape.
- Adding platform-specific Repliz payloads beyond the existing YouTube sanitizer.

## File Structure

- Modify: `scripts/repliz-publish.mjs`
  - Add `readTextIfExists()`.
  - Add `extractPublishCaption(markdown, heading)`.
  - Add `readPublishDescription(slugDir)`.
  - Add `requireDescription(description, label)`.
  - Update `readPostMetadata(slugDir)` to fallback to `publish-captions.md`.
  - Update `buildSchedulePayload()` to validate final platform description.
  - Keep the existing pre-upload guard in `runPublish()`.
- Modify: `scripts/repliz-publish.test.mjs`
  - Add fallback extraction tests.
  - Add payload-level empty description rejection test.
  - Add end-to-end fake publish test proving each schedule POST includes description.
- Modify: `docs/repliz/integration-spec.md`
  - Document source priority and non-empty publish gate.
- Modify: `README.md`
  - Document that either `repliz-publish.json` or `publish-captions.md` can supply the description.

## Description Source Priority

Final `post.description` resolution order:

1. `videos/<slug>/repliz-publish.json` with `post.description`.
2. `videos/<slug>/repliz-publish.json` with root `description`.
3. `videos/<slug>/publish-captions.md` under `## Instagram`, first fenced `text` block.
4. `videos/<slug>/publish-captions.md` under `## TikTok`, first fenced `text` block.
5. Throw before upload: `Missing post description...`.

The extracted description should preserve paragraph breaks and trim only leading/trailing whitespace.

## Task 1: Lock Metadata Fallback Behavior

**Files:**

- Modify: `scripts/repliz-publish.test.mjs`

- [ ] **Step 1: Add tests for `publish-captions.md` fallback**

Add these tests after the existing `readPostMetadata supports a root metadata object and a receipt post object` test:

```javascript
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
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
npm run test:repliz
```

Expected: FAIL because `readPostMetadata()` does not read `publish-captions.md` yet.

## Task 2: Implement Minimal Caption Fallback

**Files:**

- Modify: `scripts/repliz-publish.mjs`

- [ ] **Step 1: Add text read and caption extraction helpers**

Add this after `readJsonIfExists()`:

```javascript
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
```

- [ ] **Step 2: Update `readPostMetadata()` to use fallback**

Replace `readPostMetadata()` with:

```javascript
export async function readPostMetadata(slugDir) {
  const data = await readJsonIfExists(path.join(slugDir, "repliz-publish.json"));
  const source = data?.post || data || {};
  const fallbackDescription = await readPublishDescription(slugDir);
  const description = String(source.description || "").trim() || fallbackDescription;

  return {
    ...DEFAULT_POST,
    ...source,
    description,
    tags: Array.isArray(source.tags) ? source.tags : DEFAULT_POST.tags,
    mentions: Array.isArray(source.mentions) ? source.mentions : DEFAULT_POST.mentions,
    targetCountries: Array.isArray(source.targetCountries)
      ? source.targetCountries
      : DEFAULT_POST.targetCountries,
  };
}
```

- [ ] **Step 3: Run tests**

Run:

```bash
npm run test:repliz
```

Expected: PASS for the fallback tests. Existing empty-description publish test should still pass because it creates neither `repliz-publish.json` nor `publish-captions.md`.

## Task 3: Validate Every Schedule Payload

**Files:**

- Modify: `scripts/repliz-publish.test.mjs`
- Modify: `scripts/repliz-publish.mjs`

- [ ] **Step 1: Add payload-level rejection test**

Add this after `buildSchedulePayload matches Repliz video schedule contract`:

```javascript
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
```

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```bash
npm run test:repliz
```

Expected: FAIL because `buildSchedulePayload()` currently accepts blank descriptions.

- [ ] **Step 3: Add description validator and use it in payload builder**

Add this before `sanitizeDescriptionForPlatform()`:

```javascript
function requireDescription(description, label = "post") {
  const text = String(description || "").trim();
  if (!text) throw new Error(`Missing ${label} description`);
  return text;
}
```

Change the first line of `buildSchedulePayload()` from:

```javascript
const description = sanitizeDescriptionForPlatform(post.description, platform);
```

to:

```javascript
const description = requireDescription(sanitizeDescriptionForPlatform(post.description, platform), `${platform} post`);
```

Change the guard in `runPublish()` from:

```javascript
if (!String(post.description || "").trim()) {
  throw new Error(`Missing post description. Add ${path.join(args.slug, "repliz-publish.json")} with post.description before publishing.`);
}
```

to:

```javascript
try {
  requireDescription(post.description);
} catch {
  throw new Error(`Missing post description. Add ${path.join(args.slug, "repliz-publish.json")} with post.description or ${path.join(args.slug, "publish-captions.md")} before publishing.`);
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test:repliz
```

Expected: PASS.

## Task 4: Prove Every Schedule POST Includes Description

**Files:**

- Modify: `scripts/repliz-publish.test.mjs`

- [ ] **Step 1: Add end-to-end fake publish test**

Add this before `runPublish uploads to R2, creates schedules, writes receipt, and skips duplicate rerun`:

```javascript
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
```

- [ ] **Step 2: Run tests**

Run:

```bash
npm run test:repliz
```

Expected: PASS with the new end-to-end fake publish test.

## Task 5: Update Docs

**Files:**

- Modify: `docs/repliz/integration-spec.md`
- Modify: `README.md`

- [ ] **Step 1: Update integration spec source priority**

In `docs/repliz/integration-spec.md`, update the metadata section to say:

```markdown
Per video/project, integrasi membutuhkan metadata post dengan `description`
non-empty. Source priority:

1. `videos/<slug>/repliz-publish.json` `post.description`
2. `videos/<slug>/repliz-publish.json` root `description`
3. `videos/<slug>/publish-captions.md` `## Instagram` fenced `text` block
4. `videos/<slug>/publish-captions.md` `## TikTok` fenced `text` block

Jika semua source kosong, script berhenti sebelum upload R2 atau scheduling Repliz.
```

- [ ] **Step 2: Update README publish note**

In `README.md`, replace the current note:

```markdown
Sebelum command ini, pastikan `videos/<slug>/repliz-publish.json` berisi
`post.description` atau root `description` yang tidak kosong.
```

with:

```markdown
Sebelum command ini, pastikan description tersedia di
`videos/<slug>/repliz-publish.json` (`post.description` atau root
`description`) atau di `videos/<slug>/publish-captions.md` (`## Instagram`
atau `## TikTok`). Script berhenti sebelum upload jika description tetap kosong.
```

- [ ] **Step 3: Run final verification**

Run:

```bash
npm run test:repliz
git diff --check
```

Expected:

- `npm run test:repliz`: all tests pass.
- `git diff --check`: no whitespace errors.

## Acceptance Criteria

- `npm run repliz:publish -- --slug <slug> --file <render.mp4> --approved` never uploads to R2 when no final description source exists.
- If `repliz-publish.json` contains a description, that exact trimmed description is used.
- If `repliz-publish.json` is missing or blank, `publish-captions.md` `Instagram` fenced text is used.
- If `Instagram` is absent, `TikTok` fenced text is used.
- Every `POST /public/schedule` payload has a non-empty root `description`.
- YouTube still receives the sanitized description; other platforms receive the original final description.
- Existing duplicate guard continues to include `post.description` in `publishKey`.

## Commit

After verification:

```bash
git add scripts/repliz-publish.mjs scripts/repliz-publish.test.mjs docs/repliz/integration-spec.md README.md
git commit -m "fix: require repliz post descriptions"
```

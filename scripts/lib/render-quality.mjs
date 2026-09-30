// Offline delivery checks shared by rendering and review gates (RD-02-67..69, RD-06-33..34).
// Node built-ins only; subprocesses always receive argv arrays, never a shell.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, linkSync, mkdtempSync, openSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const PROCESS_OPTIONS = { encoding: 'utf8', maxBuffer: 64 << 20 };
const finite = (n) => Number.isFinite(Number(n));
const positive = (n) => finite(n) && Number(n) > 0;
const ratio = (value) => {
  const parts = String(value ?? '').split('/').map(Number);
  return parts.length === 2 ? parts[0] / parts[1] : parts[0];
};
const details = (r) => String(r?.stderr || r?.error?.message || '').trim().split('\n').slice(-3).join(' ');
function execute(run, command, args, label) {
  const result = run(command, args, PROCESS_OPTIONS);
  if (!result || result.error || result.status !== 0) throw new Error(`${label} failed (exit ${result?.status ?? 'unknown'}): ${details(result)}`);
  return result;
}

export function probeRender(file, { run = spawnSync } = {}) {
  const result = execute(run, 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], 'render probe');
  let data;
  try { data = JSON.parse(String(result.stdout)); } catch { throw new Error('render probe returned invalid JSON'); }
  const video = data.streams?.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const audio = data.streams?.find((s) => s.codec_type === 'audio') ?? null;
  const duration = Number(video?.duration ?? data.format?.duration);
  const fps = ratio(video?.avg_frame_rate || video?.r_frame_rate);
  if (!video || !positive(video.width) || !positive(video.height) || !positive(duration) || !positive(fps)) throw new Error('render probe found no positive-duration video');
  return { video, audio, duration, fps, bytes: data.format?.size ? Number(data.format.size) : null };
}

function decodeRender(file, run) {
  execute(run, 'ffmpeg', ['-v', 'error', '-xerror', '-err_detect', 'explode', '-i', file, '-map', '0:v:0', '-map', '0:a?', '-f', 'null', '-'], 'render decode');
}

// Gate candidates need real frames, including when a corrupt MP4 still has a readable header.
export function isPlayableRender(file, { run = spawnSync } = {}) {
  try { probeRender(file, { run }); decodeRender(file, run); return true; } catch { return false; }
}

export function validateRender(file, expected = {}, { run = spawnSync } = {}) {
  const media = probeRender(file, { run });
  for (const key of ['width', 'height']) {
    if (expected[key] !== undefined && media.video[key] !== expected[key]) throw new Error(`render ${key} ${media.video[key]} does not match expected ${expected[key]}`);
  }
  if (expected.fps !== undefined && Math.abs(media.fps - expected.fps) > 0.01) throw new Error(`render frame rate ${media.fps} does not match expected ${expected.fps}`);
  const tolerance = Math.max(0.05, 1 / (expected.fps ?? media.fps) + 0.005);
  if (expected.duration !== undefined && Math.abs(media.duration - expected.duration) > tolerance) throw new Error(`render duration ${media.duration} does not match expected ${expected.duration}`);
  if (expected.duration !== undefined && positive(media.video.nb_frames) && Math.abs(Number(media.video.nb_frames) - Math.round(expected.duration * media.fps)) > 1) throw new Error('render frame count does not match expected duration');
  if (expected.audio === true && !media.audio) throw new Error('render declared audio is missing');
  if (expected.audio === false && media.audio) throw new Error('render has unexpected audio for a silent composition');
  if (media.audio) {
    if (media.audio.codec_name !== 'aac') throw new Error('render audio must be encoded AAC');
    if (media.audio.channels !== 2 || Number(media.audio.sample_rate) !== 48000) throw new Error('render audio must be stereo at 48000 Hz');
    if (!positive(media.audio.duration)) throw new Error('render audio duration is missing');
    if (Math.abs(Number(media.audio.duration) - media.duration) > tolerance) throw new Error(`render audio/video duration mismatch (${media.audio.duration} versus ${media.duration})`);
  }
  decodeRender(file, run);
  return media;
}

export function measureAudio(file, { run = spawnSync, targetLufs = -16, truePeakDbtp = -1 } = {}) {
  const r = execute(run, 'ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-vn', '-af', `loudnorm=I=${targetLufs}:TP=${truePeakDbtp}:LRA=11:print_format=json`, '-f', 'null', '-'], 'encoded audio measurement');
  const m = /\{[^{}]*"input_i"[^{}]*\}/.exec(String(r.stderr));
  if (!m) throw new Error('encoded audio measurement returned no loudness data');
  const data = JSON.parse(m[0]);
  const result = {
    integratedLufs: Number(data.input_i), truePeakDbtp: Number(data.input_tp),
    loudnessRangeLu: Number(data.input_lra), thresholdLufs: Number(data.input_thresh), targetOffsetLu: Number(data.target_offset),
  };
  if (!Object.values(result).every(Number.isFinite)) throw new Error('encoded audio measurement is not finite (silent or unreadable audio)');
  return result;
}

export function selectAudioProfile(dir) {
  const brief = existsSync(join(dir, 'creative-brief.md')) ? readFileSync(join(dir, 'creative-brief.md'), 'utf8') : '';
  const metadataFile = join(dir, 'metadata.json');
  const metadata = existsSync(metadataFile) ? JSON.parse(readFileSync(metadataFile, 'utf8')) : {};
  const music = /(?:format|type)\s*[*_`]*\s*:\s*[*_`]*\s*(?:kinetic-post|motion-short|showreel|music)\b/i.test(brief) || ['kinetic-post', 'motion-short', 'showreel', 'music'].includes(metadata.format ?? metadata.type);
  const defaults = { name: music ? 'music-showreel' : 'speech-explainer', targetLufs: music ? -17 : -16, toleranceLu: 1, truePeakDbtp: -1, source: 'format-default' };
  const overrideFile = join(dir, 'render-profile.json');
  if (!existsSync(overrideFile)) return defaults;
  const override = JSON.parse(readFileSync(overrideFile, 'utf8'));
  const profile = { ...defaults, ...override, source: 'render-profile.json' };
  if (typeof profile.name !== 'string' || !profile.name.trim()) throw new Error('render profile name must be nonempty');
  if (!finite(profile.targetLufs) || profile.targetLufs > defaults.targetLufs || profile.targetLufs < -40) throw new Error(`render profile target must be between -40 and ${defaults.targetLufs} LUFS`);
  if (!positive(profile.toleranceLu) || profile.toleranceLu > 1) throw new Error('render profile tolerance must be >0 and <=1 LU');
  if (!finite(profile.truePeakDbtp) || profile.truePeakDbtp > -1 || profile.truePeakDbtp < -9) throw new Error('render profile true peak must be between -9 and -1 dBTP (FFmpeg loudnorm range)');
  for (const key of ['targetLufs', 'toleranceLu', 'truePeakDbtp']) profile[key] = Number(profile[key]);
  return profile;
}

const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)].map((m) => [m[1], m[3]]));
const cleanHtml = (html) => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '');

export function projectRenderExpectation(dir, { fps = 30 } = {}) {
  const rootPath = realpathSync(dir);
  const html = cleanHtml(readFileSync(join(dir, 'index.html'), 'utf8'));
  const rootTag = [...html.matchAll(/<[a-z][^>]*>/gi)].map((m) => attributes(m[0])).find((a) => a['data-composition-id']);
  if (!rootTag) throw new Error('render expectation requires a root data-composition-id');
  const expected = Object.fromEntries(['width', 'height', 'duration'].map((key) => [key, Number(rootTag[`data-${key}`])]));
  for (const [key, value] of Object.entries(expected)) if (!positive(value)) throw new Error(`render expectation requires positive root data-${key}`);
  if (!positive(fps)) throw new Error('render expectation requires positive fps');
  const visited = new Set();
  function declaresAudio(file) {
    const absolute = realpathSync(file);
    const rel = relative(rootPath, absolute);
    if (rel.startsWith('..') || resolve(rootPath, rel) !== absolute) throw new Error('composition sources must stay inside the project');
    if (visited.has(absolute)) return false;
    visited.add(absolute);
    const source = cleanHtml(readFileSync(absolute, 'utf8'));
    let audio = false;
    for (const m of source.matchAll(/<(?:audio|video)\b[^>]*>/gi)) {
      if (/\s(?:muted|data-muted)(?:\s|=|>)/i.test(m[0])) continue;
      if (attributes(m[0]).src || source.includes('<source')) audio = true;
    }
    for (const m of source.matchAll(/data-composition-src\s*=\s*(["'])(.*?)\1/gi)) {
      if (/^(?:[a-z]+:|\/)/i.test(m[2]) || relative(rootPath, resolve(dirname(absolute), m[2])).startsWith('..')) throw new Error('composition sources must stay inside the project');
      if (declaresAudio(resolve(dirname(absolute), m[2]))) audio = true;
    }
    return audio;
  }
  return { ...expected, fps: Number(fps), audio: declaresAudio(join(dir, 'index.html')) };
}

const inProfile = (audio, profile) => Math.abs(audio.integratedLufs - profile.targetLufs) <= profile.toleranceLu && audio.truePeakDbtp <= profile.truePeakDbtp;
const version = (command, run) => String(execute(run, command, ['-version'], `${command} version`).stdout).split('\n')[0];

export function deliverRender({ pending, final, expected, profile = { name: 'speech-explainer', targetLufs: -16, toleranceLu: 1, truePeakDbtp: -1, source: 'format-default' }, run = spawnSync, toolchain = {}, encode = {} }) {
  if (resolve(pending) === resolve(final)) throw new Error('pending render must be separate from the final master');
  // Capture the completed renderer output before probing it. Replacing the incoming
  // pathname afterward cannot change the bytes owned by this delivery.
  const work = mkdtempSync(join(dirname(final), `.${basename(final)}.delivery-`));
  const candidate = join(work, 'candidate.mp4');
  const masteredFile = join(work, 'mastered.mp4');
  const receiptFile = `${final}.quality.json`;
  const receiptPending = join(work, 'quality.json');
  const oldMaster = join(work, 'previous.mp4');
  const promotionLock = `${final}.delivery.lock`;
  let lockFd;
  let promoted = false, hadMaster = false;
  try {
    renameSync(pending, candidate);
    let media = validateRender(candidate, expected, { run });
    const peak = Math.max(-9, profile.truePeakDbtp - 0.6);
    const measurementOptions = { run, targetLufs: profile.targetLufs, truePeakDbtp: peak };
    const before = media.audio ? measureAudio(candidate, measurementOptions) : null;
    let audio = before, mastered = false;
    if (audio && !inProfile(audio, profile)) {
      // Leave headroom for AAC's reconstructed peaks; the encoded result is measured again below.
      const filter = `loudnorm=I=${profile.targetLufs}:TP=${peak}:LRA=11:measured_I=${audio.integratedLufs}:measured_TP=${audio.truePeakDbtp}:measured_LRA=${audio.loudnessRangeLu}:measured_thresh=${audio.thresholdLufs}:offset=${audio.targetOffsetLu}:linear=true`;
      execute(run, 'ffmpeg', ['-v', 'error', '-y', '-i', candidate, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', '-af', filter, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', String(media.duration), '-movflags', '+faststart', masteredFile], 'audio mastering');
      media = validateRender(masteredFile, expected, { run });
      audio = measureAudio(masteredFile, measurementOptions);
      if (!inProfile(audio, profile)) throw new Error(`encoded audio outside profile: ${audio.integratedLufs} LUFS, ${audio.truePeakDbtp} dBTP`);
      renameSync(masteredFile, candidate);
      mastered = true;
    }
    const receipt = {
      schemaVersion: 1, file: basename(final), sha256: createHash('sha256').update(readFileSync(candidate)).digest('hex'), bytes: statSync(candidate).size,
      expected, video: { ...media.video, fps: media.fps, duration: media.duration }, audio: audio ? { ...media.audio, ...audio } : null,
      profile, beforeAudio: before, mastered, encode,
      toolchain: { node: process.version, ffmpeg: version('ffmpeg', run), ffprobe: version('ffprobe', run), ...toolchain },
      checks: { probe: true, dimensions: true, frameRate: true, duration: true, declaredAudio: true, decode: true, audioProfile: audio ? inProfile(audio, profile) : null },
    };
    writeFileSync(receiptPending, `${JSON.stringify(receipt, null, 2)}\n`);
    // Keep MP4/receipt promotion and rollback together across concurrent processes.
    // A contender fails without touching the active delivery or its old master.
    try { lockFd = openSync(promotionLock, 'wx'); }
    catch (error) { if (error.code === 'EEXIST') throw new Error(`render promotion already active: ${promotionLock}`); throw error; }
    writeFileSync(lockFd, `${JSON.stringify({ pid: process.pid, file: basename(final) })}\n`);
    // A hardlink allows rollback if the receipt rename fails after promoting the MP4.
    hadMaster = existsSync(final);
    if (hadMaster) linkSync(final, oldMaster);
    renameSync(candidate, final); promoted = true;
    renameSync(receiptPending, receiptFile);
    return receipt;
  } catch (error) {
    if (promoted) {
      if (hadMaster) renameSync(oldMaster, final);
      else rmSync(final, { force: true });
    }
    throw error;
  } finally {
    if (lockFd !== undefined) { closeSync(lockFd); rmSync(promotionLock, { force: true }); }
    rmSync(work, { recursive: true, force: true });
  }
}

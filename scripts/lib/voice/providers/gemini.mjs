// Gemini 3.8 TTS over REST (ADR-0023, RD-06-05..08): speech, prebuilt voice list, voice design, voice replication.
// Plain fetch, no SDK (ADR-0007). The key is GEMINI_TTS_API_KEY: GEMINI_API_KEY would make hyperframes snapshot
// send frames to Gemini (RD-02-24).
export const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
export const GEMINI_KEY_ENV = 'GEMINI_TTS_API_KEY';
export const CONSENT_ID = 'Saya pemilik suara ini dan saya menyetujui Google menggunakan suara ini untuk membuat model suara sintetis.';

export function geminiKey(env = process.env) {
  const key = env[GEMINI_KEY_ENV];
  if (!key) throw new Error(`${GEMINI_KEY_ENV} is not set; add it to .env (see .env.example)`);
  return key;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// 429 and 5xx are retried with 1 s, 2 s, 4 s backoff; any other error fails at once.
export async function geminiFetch(path, { method = 'GET', body, key, fetchImpl = fetch, sleep = wait, retries = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(`${GEMINI_BASE}${path}`, {
      method,
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // not JSON; the raw text goes into the error below
    }
    if (res.ok) return json;
    if (!(res.status === 429 || res.status >= 500) || attempt >= retries) {
      throw new Error(`Gemini ${method} ${path.split('?')[0]} failed: HTTP ${res.status} ${json?.error?.message || text.slice(0, 200)}`.trim());
    }
    await sleep(1000 * 2 ** attempt);
  }
}

export function speechRequest({ model, text, voice, style, language }) {
  const config = { voice };
  if (language) config.language = language;
  return {
    model,
    input: style ? [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }] : text,
    response_format: { type: 'audio' },
    generation_config: { speech_config: [config] },
  };
}

export function audioFromInteraction(body) {
  for (const step of body?.steps || []) {
    for (const c of step.content || []) if (c.type === 'audio' && c.data) return { mime: c.mime_type || '', data: Buffer.from(c.data, 'base64') };
  }
  throw new Error('Gemini returned no audio');
}

export async function geminiSay({ text, model, voice, style, language, key, fetchImpl, sleep }) {
  const body = await geminiFetch('/interactions', { method: 'POST', body: speechRequest({ model, text, voice, style, language }), key, fetchImpl, sleep });
  const { mime, data } = audioFromInteraction(body);
  if (!mime.includes('wav')) throw new Error(`Gemini returned ${mime || 'unknown audio'}, expected audio/wav`);
  return data;
}

export async function listPrebuiltVoices({ key, fetchImpl, sleep }) {
  const voices = [];
  let token = '';
  do {
    const q = new URLSearchParams({ type: 'prebuilt', page_size: '100' });
    if (token) q.set('page_token', token);
    const page = await geminiFetch(`/voices?${q}`, { key, fetchImpl, sleep });
    voices.push(...(page?.voices || []));
    token = page?.next_page_token || '';
  } while (token);
  return voices;
}

export function designRequest({ model, name, prompt, language = 'id-ID', gender }) {
  const voice = { model, type: 'prompted', display_name: name, language_code: language, prompted: { input: prompt } };
  if (gender) voice.gender = gender;
  return { store: true, voice };
}

export function replicateRequest({ model, name, source, consent }) {
  return {
    store: true,
    voice: {
      model,
      type: 'replicated',
      display_name: name,
      replicated: {
        source_audio: { mime_type: 'audio/wav', data: source.toString('base64') },
        consent_audio: { mime_type: 'audio/wav', data: consent.toString('base64') },
      },
    },
  };
}

// Never retried: a retry after a timeout could store the same voice twice.
export async function createVoice(request, { key, fetchImpl, sleep }) {
  const v = await geminiFetch('/voices', { method: 'POST', body: request, key, fetchImpl, sleep, retries: 0 });
  if (!v?.id) throw new Error('Gemini did not return a stored voice id');
  const sample = v.prompted?.sample_audio?.data || v.sample_audio?.data;
  return {
    id: v.id,
    model: v.model || request.voice.model,
    type: v.type || request.voice.type,
    displayName: v.display_name || request.voice.display_name,
    expireTime: v.expire_time || null,
    sample: sample ? Buffer.from(sample, 'base64') : null,
  };
}

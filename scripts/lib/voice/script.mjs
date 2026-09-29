// Script text helpers for the voice adapter (ADR-0023, RD-06-02): paragraphs, inline Gemini tags, caption words.
export const TAG_RE = /<([a-z][a-z ]*)>/g;
const PAUSE = { 'short pause': ',', 'long pause': '.' };

// Markdown script file -> the narration: it ends at the first "## " section (## Fakta and other notes follow it),
// and HTML comments and heading lines ("# ", "### ", ...) are dropped. "#1" or "#AI" in a line stay.
export function scriptBody(md) {
  const text = String(md).replace(/<!--[\s\S]*?-->/g, '');
  const notes = text.search(/^[ \t]*##\s/m);
  return (notes < 0 ? text : text.slice(0, notes)).split('\n').filter((l) => !/^\s*#{1,6}\s/.test(l)).join('\n');
}

export function splitParagraphs(text) {
  return String(text).replace(/\r\n/g, '\n').split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export const stripTags = (p) => p.replace(TAG_RE, ' ').replace(/\s+([,.!?])/g, '$1').replace(/\s+/g, ' ').trim();

// Gemini reads the tags; other providers get a comma for <short pause>, a full stop for <long pause>, nothing else.
export function forProvider(p, provider) {
  if (provider === 'gemini') return p;
  return p
    .replace(TAG_RE, (m, name) => PAUSE[name] ?? ' ')
    .replace(/\s+([,.])/g, '$1')
    .replace(/([.,!?])[,.]+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export const scriptWords = (text) => splitParagraphs(text).flatMap((p) => stripTags(p).split(' ').filter(Boolean));

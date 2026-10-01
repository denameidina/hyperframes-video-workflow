// Small closed-schema subset used by this server. No client-supplied executable/argv.
export const str = (extra = {}) => ({ type: 'string', minLength: 1, maxLength: 4000, ...extra });
export const bool = { type: 'boolean' };
export const num = (minimum = 0, maximum = 86400) => ({ type: 'number', minimum, maximum });
export const integer = (minimum = 0, maximum = 1000) => ({ type: 'integer', minimum, maximum });
export const choice = (...values) => str({ enum: values });
export const list = (items = str()) => ({ type: 'array', items, maxItems: 1000 });
export const object = (properties = {}, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
export const slug = str({ pattern: '^[a-z0-9][a-z0-9-]*$', maxLength: 120 });
export const approval = { human_confirmed: bool, approval_note: str({ maxLength: 2000 }) };

export function validate(schema, value, label = 'arguments') {
  const fail = (why) => { throw new Error(`${label}: ${why}`); };
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail('must be an object');
    for (const k of Object.keys(value)) if (!Object.hasOwn(schema.properties, k)) fail(`unknown field ${k}`);
    for (const k of schema.required) if (!Object.hasOwn(value, k)) fail(`missing ${k}`);
    for (const [k, v] of Object.entries(value)) validate(schema.properties[k], v, `${label}.${k}`);
  } else if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length > schema.maxItems) fail(`must be an array of at most ${schema.maxItems} items`);
    value.forEach((v, i) => validate(schema.items, v, `${label}[${i}]`));
  } else if (schema.type === 'string') {
    if (typeof value !== 'string' || value.includes('\0') || value.length < schema.minLength || value.length > schema.maxLength) fail(`must be a string (${schema.minLength}–${schema.maxLength} characters, without NUL)`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail('invalid format');
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') fail('must be boolean');
  } else if (schema.type === 'number' || schema.type === 'integer') {
    if (!Number.isFinite(value) || (schema.type === 'integer' && !Number.isInteger(value)) || value < schema.minimum || value > schema.maximum) fail(`must be ${schema.type} in ${schema.minimum}–${schema.maximum}`);
  }
  if (schema.enum && !schema.enum.includes(value)) fail(`must be one of ${schema.enum.join(', ')}`);
}
export function confirm(args) {
  if (args.human_confirmed !== true || !args.approval_note?.trim()) throw new Error('Explicit human confirmation and a nonempty approval_note are required; ask the user to review the concrete result first.');
}
export function need(o, ...keys) {
  for (const k of keys) if (o[k] === undefined || o[k] === '') throw new Error(`missing ${k} for this action`);
}

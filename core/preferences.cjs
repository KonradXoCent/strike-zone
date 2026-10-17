'use strict';
const fs = require('node:fs');
const DEFAULTS = Object.freeze({ language: 'pl', theme: 'night' });
function normalize(value = {}) {
  return { language: ['pl', 'en'].includes(value.language) ? value.language : 'pl', theme: ['night', 'forest', 'sand'].includes(value.theme) ? value.theme : 'night' };
}
function preferences(file) {
  let current; try { current = normalize(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch { current = { ...DEFAULTS }; }
  return { get: () => ({ ...current }), set(input) {
    if (!input || typeof input !== 'object' || Object.keys(input).some(k => !['language', 'theme'].includes(k)) || ('language' in input && !['pl', 'en'].includes(input.language)) || ('theme' in input && !['night', 'forest', 'sand'].includes(input.theme))) throw new Error('Invalid preferences');
    const next = normalize({ ...current, ...input });
    fs.writeFileSync(file + '.tmp', JSON.stringify(next), { mode: 0o600 }); fs.renameSync(file + '.tmp', file); current = next; return { ...current };
  } };
}
module.exports = { preferences, normalize };

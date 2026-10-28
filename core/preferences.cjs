'use strict';
const fs = require('node:fs');
const DEFAULTS = Object.freeze({ language: 'pl', theme: 'night', fullscreen: false });
const THEMES=['night','forest','sand','mirage','dust','ancient','nuke'];
const FLAGS=['muteUnfocused','reducedMotion','autoGoalReplay'];
function normalize(value = {}) {
  return { language: ['pl', 'en'].includes(value.language) ? value.language : 'pl', theme: THEMES.includes(value.theme) ? value.theme : 'night', fullscreen: value.fullscreen === true,
    ...(Object.hasOwn(value,'fpsLimit')?{fpsLimit:[0,30,60,120].includes(value.fpsLimit)?value.fpsLimit:60}:{}),...Object.fromEntries(FLAGS.filter(k=>typeof value[k]==='boolean').map(k=>[k,value[k]])) };
}
function preferences(file) {
  let current; try { current = normalize(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch { current = { ...DEFAULTS }; }
  let seeded=fs.existsSync(file);
  const api={ get: () => ({ ...current }), seed(input){if(seeded)return api.get();seeded=true;return api.set(input);}, set(input) {
    if (!input || typeof input !== 'object' || Object.keys(input).some(k => !['language','theme','fullscreen','fpsLimit',...FLAGS].includes(k)) || ('language' in input && !['pl', 'en'].includes(input.language)) || ('theme' in input && !THEMES.includes(input.theme)) || ('fullscreen' in input && typeof input.fullscreen !== 'boolean') || ('fpsLimit' in input&&! [0,30,60,120].includes(input.fpsLimit)) || FLAGS.some(k=>k in input&&typeof input[k]!=='boolean')) throw new Error('Invalid preferences');
    const next = normalize({ ...current, ...input });
    fs.writeFileSync(file + '.tmp', JSON.stringify(next), { mode: 0o600 }); fs.renameSync(file + '.tmp', file); current = next; return { ...current };
  } };return api;
}
module.exports = { preferences, normalize };

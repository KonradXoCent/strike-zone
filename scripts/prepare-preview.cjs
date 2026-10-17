'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function makePreview() {
  let html = fs.readFileSync(path.join(root, 'game-source/index.html'), 'utf8');
  let sdk = fs.readFileSync(path.join(root, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js'), 'utf8');
  const license = fs.readFileSync(path.join(root, 'node_modules/@supabase/supabase-js/LICENSE'), 'utf8');
  const tag = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>';
  if (!html.includes(tag)) throw new Error('Missing pinned Supabase script.');
  // Inline scripts also work in HTML viewers that block data: script URLs.
  // The pinned UMD's optional chunk loader needs an explicit inline fallback.
  const automaticPath = 'if(!e)throw new Error("Automatic publicPath is not supported in this browser");';
  if (sdk.split(automaticPath).length !== 2) throw new Error('Review the pinned SDK inline publicPath fallback.');
  sdk = sdk.replace(automaticPath, 'if(!e)e="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";');
  const embedded = ('/* Supabase SDK 2.45.4; inline packaging fallback for optional chunks.\n' + license + '\n*/\n' + sdk).replace(/<\/script/gi, '<\\/script');
  html = html.replace(tag, () => '<script id="sz-embedded-account-sdk">\n' + embedded + '\n</script>');
  if (html.split('\nsbInit();').length !== 2) throw new Error('Missing expected standalone account initializer.');
  // The preview initializes immediately in preview-account.js, without a health gate.
  html = html.replace('\nsbInit();', '\n/* Test account initialization is owned by preview-account.js. */');
  const account = fs.readFileSync(path.join(__dirname, 'preview-account.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
  return html.replace('</body>', () => '<script id="sz-test-preview-account">\n' + account + '\n</script></body>');
}
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Pass the destination index.html path.');
  const output = path.resolve(process.argv[2]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, makePreview());
  console.log('Testowy HTML z logowaniem zapisany: ' + output);
}
module.exports = { makePreview };

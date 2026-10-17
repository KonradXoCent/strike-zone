'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function makePreview() {
  let html = fs.readFileSync(path.join(root, 'game-source/index.html'), 'utf8');
  const sdk = fs.readFileSync(path.join(root, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js'));
  const license = fs.readFileSync(path.join(root, 'node_modules/@supabase/supabase-js/LICENSE'), 'utf8');
  const tag = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>';
  if (!html.includes(tag)) throw new Error('Missing pinned Supabase script.');
  // A script URL keeps the SDK webpack publicPath working in file:// previews.
  const embedded = Buffer.concat([Buffer.from('/* Supabase SDK 2.45.4\n' + license + '\n*/\n'), sdk]);
  html = html.replace(tag, '<script src="data:text/javascript;base64,' + embedded.toString('base64') + '"></script>');
  const account = fs.readFileSync(path.join(__dirname, 'preview-account.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
  return html.replace('</body>', '<script id="sz-test-preview-account">\n' + account + '\n</script></body>');
}
if (require.main === module) {
  if (!process.argv[2]) throw new Error('Pass the destination index.html path.');
  const output = path.resolve(process.argv[2]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, makePreview());
  console.log('Testowy HTML z logowaniem zapisany: ' + output);
}
module.exports = { makePreview };

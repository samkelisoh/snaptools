/* Validates the Play Store listing copy against Google's hard limits.
 * Play silently truncates or rejects over-length fields, so check before upload.
 *     node tools/check-listing.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const md = fs.readFileSync(path.join(__dirname, '../STORE_LISTING.md'), 'utf8');

// Pull the fenced code blocks that follow each heading.
function blockAfter(heading) {
  const i = md.indexOf(heading);
  if (i === -1) return null;
  const m = /```\n([\s\S]*?)\n```/.exec(md.slice(i));
  return m ? m[1] : null;
}

const LIMITS = [
  ['App name',          '## App name',          30],
  ['Short description', '## Short description', 80],
  ['Full description',  '## Full description',  4000]
];

let fail = 0;
console.log('\nGoogle Play field limits\n' + '─'.repeat(52));

for (const [label, heading, limit] of LIMITS) {
  const text = blockAfter(heading);
  if (text === null) { console.log(`❌ ${label}: block not found`); fail++; continue; }
  const first = text.split('\n')[0];
  const len = (label === 'Full description' ? text : first).length;
  const ok = len <= limit;
  if (!ok) fail++;
  console.log(
    `${ok ? '✅' : '❌'} ${label.padEnd(18)} ${String(len).padStart(4)} / ${limit}` +
    (ok ? `  (${limit - len} spare)` : `  OVER BY ${len - limit}`)
  );
}

// Alternative names are also subject to the 30-char limit.
const altBlock = blockAfter('## App name');
const alts = md.slice(md.indexOf('Alternatives'), md.indexOf('## Short description'));
const altNames = (/```\n([\s\S]*?)\n```/.exec(alts) || [, ''])[1].split('\n').filter(Boolean);
altNames.forEach(n => {
  const ok = n.length <= 30;
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} alt name         ${String(n.length).padStart(4)} / 30   "${n}"`);
});

// Placeholders must be replaced before submitting.
console.log('\nPlaceholder check\n' + '─'.repeat(52));
const policy = fs.readFileSync(path.join(__dirname, '../docs/privacy-policy.html'), 'utf8');
const placeholders = (policy.match(/\[YOUR [A-Z ]+\]/g) || []);
if (placeholders.length) {
  console.log(`⚠️  ${placeholders.length} placeholder(s) still in privacy policy:`);
  [...new Set(placeholders)].forEach(p => console.log('     ' + p));
  console.log('   → Play requires a working contact. Replace before submitting.');
} else {
  console.log('✅ no placeholders left in privacy policy');
}

// Policy must cover every category declared in the data safety table.
console.log('\nPolicy / data-safety consistency\n' + '─'.repeat(52));
const need = [
  ['IP address',        /IP address/i],
  ['product interactions', /product interactions|app interactions/i],
  ['diagnostic info',   /[Dd]iagnostic/],
  ['advertising ID',    /advertising \(?ad\)? ID|advertising ID/i]
];
need.forEach(([label, re]) => {
  const ok = re.test(policy);
  if (!ok) fail++;
  console.log(`${ok ? '✅' : '❌'} policy mentions ${label}`);
});

console.log('\n' + (fail === 0 ? '✅ listing checks passed' : `❌ ${fail} problem(s)`) + '\n');
process.exit(fail === 0 ? 0 : 1);

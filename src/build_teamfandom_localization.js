const fs = require('fs');
const path = require('path');
const { parseKeyValues } = require('./file_parser');

/**
 * Builds JSON localization assets from Valve teamfandom localization files.
 *
 * Input:  dota2/resource/localization/teamfandom_<lang>.txt
 * Output: localization/teamfandom_<lang>.json (object: { tokenKey: translatedString })
 *
 * This lets you deploy without committing the full `dota2/` folder.
 */

const repoRoot = path.join(__dirname, '..');
const inputDir = path.join(repoRoot, 'dota2', 'resource', 'localization');
const outputDir = path.join(repoRoot, 'localization');

function main() {
  ensureDir(outputDir);

  const files = fs.readdirSync(inputDir).filter((f) => /^teamfandom_.+\.txt$/.test(f));
  if (files.length === 0) {
    console.error(`No teamfandom_*.txt files found under: ${inputDir}`);
    process.exitCode = 1;
    return;
  }

  let totalOut = 0;

  for (const file of files) {
    const lang = file.replace(/^teamfandom_/, '').replace(/\.txt$/, '');
    const inputPath = path.join(inputDir, file);

    const raw = fs.readFileSync(inputPath, 'utf8');
    const parsed = parseKeyValues(raw);
    const tokens = parsed?.lang?.Tokens;

    if (!tokens || typeof tokens !== 'object') {
      console.warn(`Skipping ${file}: couldn't find lang.Tokens`);
      continue;
    }

    const outputPath = path.join(outputDir, `teamfandom_${lang}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(tokens, null, 2) + '\n', 'utf8');
    totalOut++;
  }

  console.log(`Wrote ${totalOut} localization JSON files to: ${outputDir}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

main();



const fs = require('fs');
const path = require('path');
const { parseKeyValues } = require('./file_parser');

/**
 * Builds JSON localization assets used by voice-line entries.
 *
 * Input:  dota2/resource/localization/{teamfandom,dota}_<lang>.txt
 * Output: localization/{teamfandom,dota}_<lang>.json
 *
 * This lets you deploy without committing the full `dota2/` folder.
 */

const repoRoot = path.join(__dirname, '..');
const dotaRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(repoRoot, 'dota2');
const inputDir = path.join(dotaRoot, 'resource', 'localization');
const outputDir = path.join(repoRoot, 'localization');
const localizationFamilies = ['teamfandom', 'dota'];

function main() {
  ensureDir(outputDir);

  const familyPattern = new RegExp(`^(${localizationFamilies.join('|')})_.+\\.txt$`);
  const files = fs.readdirSync(inputDir).filter((file) => familyPattern.test(file)).sort();
  if (files.length === 0) {
    console.error(`No supported localization files found under: ${inputDir}`);
    process.exitCode = 1;
    return;
  }

  let totalOut = 0;

  for (const file of files) {
    const inputPath = path.join(inputDir, file);

    const raw = fs.readFileSync(inputPath, 'utf8');
    const parsed = parseKeyValues(raw);
    const tokens = parsed?.lang?.Tokens;

    if (!tokens || typeof tokens !== 'object') {
      console.warn(`Skipping ${file}: couldn't find lang.Tokens`);
      continue;
    }

    const outputTokens = file.startsWith('dota_')
      ? Object.fromEntries(
          Object.entries(tokens).filter(([key]) =>
            key.startsWith('dota_chatwheel_translation_darkcarnival_') ||
            key.startsWith('dota_chatwheel_source_')
          )
        )
      : tokens;
    const outputPath = path.join(outputDir, file.replace(/\.txt$/, '.json'));
    fs.writeFileSync(outputPath, JSON.stringify(outputTokens, null, 2) + '\n', 'utf8');
    totalOut++;
  }

  console.log(`Wrote ${totalOut} localization JSON files to: ${outputDir}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

main();



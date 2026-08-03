const fs = require('fs');
const path = require('path');
const { parseKeyValues } = require('./file_parser');
const { soundToS3Url } = require('./voice_line_s3_sound_link');

const repoRoot = path.join(__dirname, '..');
const dotaRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(repoRoot, 'dota2');
const chatWheelsDir = path.join(dotaRoot, 'scripts', 'chat_wheels');
const mainChatWheelFile = path.join(dotaRoot, 'scripts', 'chat_wheel.txt');
const allVoiceLines = [];
const allParsedData = {};

const localizationData = loadEnglishLocalization();
const releaseLinesBySound = loadReleaseLines();
const soundEventFiles = loadSoundEventFiles();

const filesToProcess = fs.readdirSync(chatWheelsDir)
  .filter((file) => file.endsWith('.txt'))
  .sort()
  .map((file) => path.join(chatWheelsDir, file));
filesToProcess.push(mainChatWheelFile);

for (const filePath of filesToProcess) {
  processChatWheelFile(filePath);
}

allVoiceLines.sort((a, b) =>
  a.category.localeCompare(b.category) ||
  String(a.source || '').localeCompare(String(b.source || '')) ||
  String(a.message_id || '').localeCompare(String(b.message_id || ''), undefined, { numeric: true })
);

const outputPath = path.join(__dirname, 'voice_line_list.json');
const simplifiedPath = path.join(__dirname, 'voice_lines_simplified.json');
fs.writeFileSync(outputPath, `${JSON.stringify(allParsedData, null, 2)}\n`);
fs.writeFileSync(simplifiedPath, `${JSON.stringify({ voice_lines: allVoiceLines }, null, 2)}\n`);

const entriesWithUrl = allVoiceLines.filter((line) => line.sound_url).length;
console.log(`Processed ${filesToProcess.length} chat-wheel files`);
console.log(`Created ${simplifiedPath} with ${allVoiceLines.length} voice lines`);
console.log(`Entries with S3 URLs: ${entriesWithUrl}`);
console.log(`Entries without S3 URLs: ${allVoiceLines.length - entriesWithUrl}`);

function processChatWheelFile(filePath) {
  const fileName = path.basename(filePath);
  const parsedData = parseKeyValues(fs.readFileSync(filePath, 'utf8'));
  const messages = parsedData.chat_wheel?.messages;

  if (!messages) {
    return;
  }

  allParsedData[fileName] = parsedData;
  const isMainChatWheel = fileName === 'chat_wheel.txt';

  for (const [key, value] of Object.entries(messages)) {
    if (!value.sound || (isMainChatWheel && !shouldIncludeMainEntry(key))) {
      continue;
    }

    const releaseLine = releaseLinesBySound.get(value.sound);
    const resolvedLabel = resolveLocalization(value.label);
    const resolvedMessage = resolveLocalization(value.message);
    if (hasUnresolvedLocalization(resolvedLabel) || hasUnresolvedLocalization(resolvedMessage)) {
      continue;
    }

    const category = getVoiceLineCategory(fileName, key);
    const audioPath = getPlayableAudioPath(value.sound, releaseLine);
    const soundUrl = soundToS3Url(value.sound, audioPath);
    const localizationKey = releaseLine?.localization_key || stripTokenPrefix(value.translation);
    const localizationFallbackKey = releaseLine?.localization_label_key;
    const resolvedSource = resolveLocalization(value.source);

    const voiceLineEntry = {
      id: key,
      message_id: value.message_id,
      label: resolvedLabel,
      message: resolvedMessage,
      sound: value.sound,
      source: getVoiceLineSource(category, releaseLine, resolvedSource),
      all_chat: value.all_chat === '1',
      file_source: fileName,
      category
    };

    if (soundUrl) voiceLineEntry.sound_url = soundUrl;
    if (audioPath) voiceLineEntry.audio_path = audioPath;
    if (localizationKey) voiceLineEntry.localization_key = localizationKey;
    if (localizationFallbackKey) {
      voiceLineEntry.localization_fallback_key = localizationFallbackKey;
    }

    allVoiceLines.push(voiceLineEntry);
  }
}

function loadEnglishLocalization() {
  const tokens = {};
  for (const family of ['teamfandom', 'dota']) {
    const filePath = path.join(dotaRoot, 'resource', 'localization', `${family}_english.txt`);
    const parsed = parseKeyValues(fs.readFileSync(filePath, 'utf8'));
    Object.assign(tokens, parsed.lang?.Tokens || {});
  }
  return tokens;
}

function loadReleaseLines() {
  const manifestPath = path.join(dotaRoot, 'output', 'ti2026_voice_lines.json');
  if (!fs.existsSync(manifestPath)) return new Map();

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return new Map(manifest.voice_lines.map((line) => [line.sound_event, line]));
}

function loadSoundEventFiles() {
  const soundEventsPath = path.join(dotaRoot, 'soundevents', 'game_sounds.vsndevts');
  if (!fs.existsSync(soundEventsPath)) return new Map();

  const data = fs.readFileSync(soundEventsPath, 'utf8');
  const mappings = new Map();
  const eventPattern = /^\s*([A-Za-z0-9_.]+)\s*=\s*\{([\s\S]*?)^\s*\}/gm;
  let match;
  while ((match = eventPattern.exec(data)) !== null) {
    const fileMatch = match[2].match(/vsnd_files\s*=\s*"([^"]+)"/);
    if (fileMatch) mappings.set(match[1], fileMatch[1]);
  }
  return mappings;
}

function resolveLocalization(value) {
  if (typeof value === 'string' && value.startsWith('#')) {
    return localizationData[value.slice(1)] || value;
  }
  return value;
}

function hasUnresolvedLocalization(value) {
  return typeof value === 'string' && value.startsWith('#');
}

function stripTokenPrefix(value) {
  return typeof value === 'string' && value.startsWith('#') ? value.slice(1) : undefined;
}

function shouldIncludeMainEntry(key) {
  return key.startsWith('Community_TI14') ||
    key.startsWith('Community_TI15') ||
    key.startsWith('VoiceOfGod') ||
    key.startsWith('dc_');
}

function getPlayableAudioPath(sound, releaseLine) {
  const releasePath = releaseLine?.audio_files_on_disk?.find((file) => /\.(mp3|wav)$/i.test(file));
  if (releasePath) return releasePath;

  const soundEventPath = soundEventFiles.get(sound);
  if (!soundEventPath) return undefined;

  const basePath = soundEventPath.replace(/\.vsnd$/i, '');
  for (const extension of ['.mp3', '.wav']) {
    const candidate = `${basePath}${extension}`;
    if (fs.existsSync(path.join(repoRoot, candidate))) return candidate;
  }
  return undefined;
}

function getVoiceLineSource(category, releaseLine, resolvedSource) {
  if (releaseLine?.voice_actor) return releaseLine.voice_actor;
  if (releaseLine?.team_name) return releaseLine.team_name;
  if (releaseLine?.community_bundle) return releaseLine.community_bundle;
  if (resolvedSource && !hasUnresolvedLocalization(resolvedSource)) return resolvedSource;
  return category === 'Dark_Carnival' ? 'Dark Carnival' : category;
}

function getVoiceLineCategory(fileName, entryKey) {
  if (entryKey.startsWith('dc_')) return 'Dark_Carnival';
  if (entryKey.startsWith('Community_TI15') ||
      fileName === 'stickers_chat_wheel_13.txt' ||
      fileName.startsWith('teamfandom_chat_wheel_13_')) {
    return 'TI_2026';
  }
  if (entryKey.startsWith('Community_TI14') || entryKey.startsWith('VoiceOfGod')) {
    return 'TI_2025';
  }
  if (entryKey.toLowerCase().startsWith('team')) return 'Team';
  if (fileName.includes('ti2021_casters_chat_wheel.txt')) return 'TI_2021';
  if (fileName.includes('stickers_chat_wheel_6.txt')) return 'TI_2022';
  if (fileName.includes('stickers_chat_wheel_10.txt')) return 'TI_2023';
  if (fileName.includes('stickers_chat_wheel_11.txt')) return 'TI_2024';
  if (fileName.includes('stickers_chat_wheel_12.txt')) return 'TI_2025';
  return 'Other';
}
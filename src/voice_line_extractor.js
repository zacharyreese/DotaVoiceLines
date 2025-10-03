const fs = require("fs");
const path = require("path");
const { parseKeyValues } = require("./file_parser");

// Directory containing chat wheel files
const chatWheelsDir = '../dota2/scripts/chat_wheels';
const mainChatWheelFile = '../dota2/scripts/chat_wheel.txt';
const localizationFile = '../dota2/resource/localization/teamfandom_english.txt';

const allVoiceLines = [];
const allParsedData = {};
let localizationData = {};

let filesProcessed = 0;
let filesToProcess = [];

// First, load the localization file
console.log('Loading localization file...');
try {
  const localizationContent = fs.readFileSync(localizationFile, 'utf8');
  const parsed = parseKeyValues(localizationContent);
  if (parsed.lang?.Tokens) {
    localizationData = parsed.lang.Tokens;
    console.log(`Loaded ${Object.keys(localizationData).length} localization entries`);
  }
} catch (err) {
  console.error('Error loading localization file:', err);
}

// Read all files from the chat_wheels directory
console.log(`\nScanning directory: ${chatWheelsDir}`);
try {
  const files = fs.readdirSync(chatWheelsDir);
  filesToProcess = files
    .filter(file => file.endsWith('.txt'))
    .map(file => path.join(chatWheelsDir, file));
  
  // Add the main chat_wheel.txt file
  filesToProcess.push(mainChatWheelFile);
  
  console.log(`Found ${filesToProcess.length} .txt files to process (including main chat_wheel.txt)\n`);
} catch (err) {
  console.error('Error reading chat_wheels directory:', err);
  process.exit(1);
}

// Helper function to resolve localization strings
function resolveLocalization(value) {
  if (typeof value === 'string' && value.startsWith('#')) {
    const key = value.substring(1); // Remove the '#' prefix
    return localizationData[key] || value; // Return original if not found
  }
  return value;
}

// Process each file
filesToProcess.forEach((filePath) => {
  // Extract just the file name
  const fileName = path.basename(filePath);
  
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading file ${filePath}:`, err);
      filesProcessed++;
      checkIfComplete();
      return;
    }

    try {
      const parsedData = parseKeyValues(data);
      
      // Skip if the file doesn't have the expected structure
      if (!parsedData.chat_wheel?.messages) {
        console.log(`Skipped ${fileName}: No chat_wheel.messages structure found`);
        filesProcessed++;
        checkIfComplete();
        return;
      }
      
      // Store parsed data for this file
      allParsedData[fileName] = parsedData;
      
      let voiceLinesFound = 0;
      let skippedDueToLocalization = 0;
      
      // Check if this is the main chat_wheel.txt file
      const isMainChatWheel = fileName === 'chat_wheel.txt';
      
      // Collect voice lines from this file (only entries with sound property)
      Object.entries(parsedData.chat_wheel.messages).forEach(([key, value]) => {
        // Only process entries that have a sound property
        if (value.sound) {
          // If this is the main chat_wheel.txt, only include entries starting with Community_TI14 or VoiceOfGod
          if (isMainChatWheel && !key.startsWith('Community_TI14') && !key.startsWith('VoiceOfGod')) {
            return;
          }
          
          const resolvedLabel = resolveLocalization(value.label);
          const resolvedMessage = resolveLocalization(value.message);
          
          // Skip if localization failed (still has '#' prefix)
          if ((typeof resolvedLabel === 'string' && resolvedLabel.startsWith('#')) ||
              (typeof resolvedMessage === 'string' && resolvedMessage.startsWith('#'))) {
            skippedDueToLocalization++;
            return;
          }
          
          allVoiceLines.push({
            id: key,
            message_id: value.message_id,
            label: resolvedLabel,
            message: resolvedMessage,
            sound: value.sound,
            source: isMainChatWheel ? 'TI_2025' : value.source,
            all_chat: value.all_chat === "1",
            file_source: fileName,
            category: isMainChatWheel ? 'TI_2025' : getVoiceLineCategory(fileName, key)
          });
          voiceLinesFound++;
        }
      });
      
      if (skippedDueToLocalization > 0) {
        console.log(`Processed ${fileName}: Found ${voiceLinesFound} voice lines (skipped ${skippedDueToLocalization} due to missing localization)`);
      } else {
        console.log(`Processed ${fileName}: Found ${voiceLinesFound} voice lines`);
      }
      
      filesProcessed++;
      checkIfComplete();
      
    } catch (parseErr) {
      console.log(`Skipped ${fileName}: Parse error - ${parseErr.message}`);
      filesProcessed++;
      checkIfComplete();
    }
  });
});

// Check if all files have been processed
function checkIfComplete() {
  if (filesProcessed === filesToProcess.length) {
    // Write the complete parsed data to JSON file
    const outputPath = "voice_line_list.json";
    fs.writeFileSync(outputPath, JSON.stringify(allParsedData, null, 2));
    console.log(`\nSuccessfully converted all files to ${outputPath}`);
    
    // Write simplified version with all voice lines
    const simplifiedData = {
      voice_lines: allVoiceLines
    };
    
    const simplifiedPath = "voice_lines_simplified.json";
    fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedData, null, 2));
    console.log(`Created simplified version: ${simplifiedPath}`);
    console.log(`Total voice lines found: ${allVoiceLines.length}`);
  }
}

function getVoiceLineCategory(fileName, entryKey) {
  // Check if the entry key starts with 'team'
  if (entryKey && entryKey.toLowerCase().startsWith('team')) {
    return 'Team';
  }
  
  // Check for predefined categories based on file name
  if (fileName.includes('ti2021_casters_chat_wheel.txt')) {
    return 'TI_2021';
  } else if (fileName.includes('stickers_chat_wheel_6.txt')) {
    return 'TI_2022';
  } else if (fileName.includes('stickers_chat_wheel_10.txt')) {
    return 'TI_2023';
  } else if (fileName.includes('stickers_chat_wheel_11.txt')) {
    return 'TI_2024';
  } else if (fileName.includes('stickers_chat_wheel_12.txt')) {
    return 'TI_2025';
  }
  
  // Default category for unrecognized files
  return 'Other';
}
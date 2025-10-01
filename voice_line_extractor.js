const fs = require("fs");
const { parseKeyValues } = require("./file_parser");

// Files to process
const filesToProcess = [
  'dota2/scripts/chat_wheels/stickers_chat_wheel_6.txt',
  'dota2/scripts/chat_wheels/stickers_chat_wheel_10.txt',
  'dota2/scripts/chat_wheels/stickers_chat_wheel_11.txt',
  'dota2/scripts/chat_wheels/stickers_chat_wheel_12.txt',
  'dota2/scripts/chat_wheels/ti2021_casters_chat_wheel.txt',
];
const allVoiceLines = [];
const allParsedData = {};

let filesProcessed = 0;

// Process each stickers file
filesToProcess.forEach((filePath) => {

  // Extract just the file name (e.g., "stickers_chat_wheel_6.txt") from the path
  const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
  
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading file ${filePath}:`, err);
      filesProcessed++;
      checkIfComplete();
      return;
    }

    try {
      const parsedData = parseKeyValues(data);
      
      // Store parsed data for this file
      allParsedData[fileName] = parsedData;
      
      console.log(`Processed ${filePath}: Found ${Object.keys(parsedData.chat_wheel?.messages || {}).length} voice lines`);
      
      // Collect voice lines from this file
      if (parsedData.chat_wheel?.messages) {
        Object.entries(parsedData.chat_wheel.messages).forEach(([key, value]) => {
          allVoiceLines.push({
            id: key,
            message_id: value.message_id,
            label: value.label,
            message: value.message,
            sound: value.sound,
            source: value.source,
            all_chat: value.all_chat === "1",
            file_source: fileName,
            category: getVoiceLineCategory(fileName)
          });
        });
      }
      
      filesProcessed++;
      checkIfComplete();
      
    } catch (parseErr) {
      console.error(`Error parsing KeyValues from ${filePath}:`, parseErr);
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

function getVoiceLineCategory(fileName) {
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
}
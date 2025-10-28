// Base S3 URL
const S3_BASE_URL = 'https://s3.supernovasolutions.dev/dota2voicelines/sounds';

/**
 * Converts a sound string to an S3 URL
 * Examples: 
 * - "talent.season10.89511038.1" -> "https://s3.supernovasolutions.dev/dota2voicelines/sounds/teamfancontent/ti_2023/89511038_1.wav"
 * - "talent.season12.96803083.1" -> "https://s3.supernovasolutions.dev/dota2voicelines/sounds/talentcontent/season_12/96803083_1.wav"
 * - "teamfandom.ti2021.aui_2000" -> "https://s3.supernovasolutions.dev/dota2voicelines/sounds/teamfancontent/ti_2021/aui.wav"
 * - "stickers.season6.37147003" -> "https://s3.supernovasolutions.dev/dota2voicelines/sounds/teamfancontent/ti_2022/37147003.wav"
 * - "teamfandom.12.wxc.3" -> "https://s3.supernovasolutions.dev/dota2voicelines/sounds/talentcontent/season_12/community_broadcasts/wxc_3.wav"
 * - "teamfandom.7.8261554.141835" -> "https://s3.supernovasolutions.dev/dota2voicelines/sounds/teamfancontent/season_7/8261554/141835.wav"
 */
function soundToS3Url(sound) {
  const parts = sound.split('.');
  
  // Handle talent.seasonXX.ID.SUBID format
  if (parts.length === 4 && parts[0] === 'talent') {
    const [, seasonPart, id, subId] = parts;
    
    // Convert "season12" to "season_12" format
    const seasonNumber = seasonPart.replace('season', '');
    
    // Special case: season10 files are in teamfancontent/ti_2023
    if (seasonNumber === '10') {
      return `${S3_BASE_URL}/teamfancontent/ti_2023/${id}_${subId}.wav`;
    }
    
    const seasonFolder = `season_${seasonNumber}`;
    
    // Build the S3 URL
    // Format: talentcontent/season_XX/ID_SUBID.wav
    return `${S3_BASE_URL}/talentcontent/${seasonFolder}/${id}_${subId}.wav`;
  }
  
  // Handle teamfandom.12.FOLDER.FILE format (TI_2025 community broadcasts)
  if (parts.length === 4 && parts[0] === 'teamfandom' && parts[1] === '12') {
    const [, , folder, file] = parts;
    
    // Build the S3 URL
    // Format: talentcontent/season_12/community_broadcasts/FOLDER_FILE.wav
    return `${S3_BASE_URL}/talentcontent/season_12/community_broadcasts/${folder}_${file}.wav`;
  }
  
  // Handle teamfandom.SEASON.FOLDER.FILE format (Team voice lines)
  if (parts.length === 4 && parts[0] === 'teamfandom' && parts[1] !== 'ti2021') {
    const [, season, folder, file] = parts;
    
    // Build the S3 URL
    // Format: teamfancontent/season_SEASON/FOLDER/FILE.wav
    return `${S3_BASE_URL}/teamfancontent/season_${season}/${folder}/${file}.wav`;
  }
  
  // Handle teamfandom.ti2021.NAME format
  if (parts.length === 3 && parts[0] === 'teamfandom' && parts[1] === 'ti2021') {
    let name = parts[2];
    
    // If name contains _ or /, only take the first part
    if (name.includes('_')) {
      name = name.split('_')[0];
    } else if (name.includes('/')) {
      name = name.split('/')[0];
    }
    
    // Convert to lowercase
    name = name.toLowerCase();
    
    // Build the S3 URL
    // Format: teamfancontent/ti_2021/name.wav
    return `${S3_BASE_URL}/teamfancontent/ti_2021/${name}.wav`;
  }
  
  // Handle stickers.season6.ID format (TI_2022)
  if (parts.length === 3 && parts[0] === 'stickers' && parts[1] === 'season6') {
    const id = parts[2];
    
    // Build the S3 URL
    // Format: teamfancontent/ti_2022/ID.wav
    return `${S3_BASE_URL}/teamfancontent/ti_2022/${id}.wav`;
  }
  
  return null; // Return null for unsupported formats
}

// Export function for use as a module
module.exports = {
  soundToS3Url
};

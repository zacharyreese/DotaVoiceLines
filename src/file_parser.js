// Function to parse Valve KeyValues format to JSON
function parseKeyValues(data) {
  const lines = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const result = {};
  const stack = [result];
  let currentKey = null;

  for (const line of lines) {
    // Skip comments
    if (line.startsWith('//')) continue;
    
    // Handle opening brace
    if (line === '{') {
      if (currentKey) {
        const newObj = {};
        const parent = stack[stack.length - 1];
        parent[currentKey] = newObj;
        stack.push(newObj);
        currentKey = null;
      }
      continue;
    }
    
    // Handle closing brace
    if (line === '}') {
      if (stack.length > 1) {
        stack.pop();
      }
      continue;
    }
    
    // Handle key-value pairs
    const match = line.match(/^"([^"]+)"\s*(?:"([^"]*)")?$/);
    if (match) {
      const key = match[1];
      const value = match[2];
      
      if (value !== undefined) {
        // It's a key-value pair
        const parent = stack[stack.length - 1];
        parent[key] = value;
      } else {
        // It's just a key (expecting an object next)
        currentKey = key;
      }
    }
  }
  
  return result;
}

module.exports = { parseKeyValues };


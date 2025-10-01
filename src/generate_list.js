const fs = require('fs');
const path = require('path');

// Read the JSON file
const jsonPath = path.join(__dirname, 'voice_lines_simplified.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Category mapping
const categoryTitles = {
    'TI_2021': 'The International 2021',
    'TI_2022': 'The International 2022',
    'TI_2023': 'The International 2023',
    'TI_2024': 'The International 2024',
    'TI_2025': 'The International 2025'
};

// Group voice lines by category
const groupedByCategory = {};
data.voice_lines.forEach(line => {
    const category = line.category || 'Other';
    if (!groupedByCategory[category]) {
        groupedByCategory[category] = [];
    }
    groupedByCategory[category].push(line);
});

// Sort each category by Creator (source)
Object.keys(groupedByCategory).forEach(category => {
    groupedByCategory[category].sort((a, b) => {
        const sourceA = (a.source || '').toLowerCase();
        const sourceB = (b.source || '').toLowerCase();
        return sourceA.localeCompare(sourceB);
    });
});

// Generate HTML
let html = '';

// Sort categories by TI year (newest first or oldest first based on preference)
const categoryOrder = ['TI_2025', 'TI_2024', 'TI_2023', 'TI_2022', 'TI_2021'];

categoryOrder.forEach(category => {
    if (groupedByCategory[category] && groupedByCategory[category].length > 0) {
        const title = categoryTitles[category] || category;
        html += `<div class="category-section">
    <h2>${title}</h2>
    <table>
        <thead>
            <tr>
                <th>Voice Line</th>
                <th>Creator</th>
                <th>ID</th>
            </tr>
        </thead>
        <tbody>
`;
        
        groupedByCategory[category].forEach(line => {
            html += `            <tr>
                <td class="voice-line">${escapeHtml(line.message)}</td>
                <td class="creator">${escapeHtml(line.source || 'Unknown')}</td>
                <td class="id">${escapeHtml(line.message_id)}</td>
            </tr>
`;
        });
        
        html += `        </tbody>
    </table>
</div>
`;
    }
});

// Helper function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Write the HTML to a file
const outputPath = path.join(__dirname, 'voice_lines_list.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log(`HTML table generated successfully: ${outputPath}`);


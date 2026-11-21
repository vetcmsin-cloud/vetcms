const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'client', 'src', 'components', 'document-designer', 'LabReportRenderer.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace all non-ASCII chars inside JSX comments {/* ... */}
content = content.replace(/\{\/\*[^*]*\*\/\}/g, (match) => {
    return match.replace(/[^\x00-\x7F]+/g, '--');
});

// Also replace any non-ASCII in regular // comments
content = content.replace(/\/\/[^\n]*/g, (match) => {
    return match.replace(/[^\x00-\x7F]+/g, '--');
});

fs.writeFileSync(file, content, 'utf8');

// Final check
const final = fs.readFileSync(file, 'utf8');
const remaining = (final.match(/[^\x00-\x7F]{2,}/g) || []).length;
console.log(`Done! Remaining garbled sequences: ${remaining}`);

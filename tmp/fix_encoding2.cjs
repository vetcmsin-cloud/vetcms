const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'client', 'src', 'components', 'document-designer', 'LabReportRenderer.tsx');
let content = fs.readFileSync(file, 'utf8');

// Remove all non-ASCII comparisons from filter conditions by replacing patterns like:
// String(v).trim() !== "GARBLED" &&
// with nothing (just remove that clause)
content = content.replace(/String\(v\)\.trim\(\)\s*!==\s*"[^\x00-\x7F]+"\s*&&\s*/g, '');
content = content.replace(/&&\s*String\(v\)\.trim\(\)\s*!==\s*"[^\x00-\x7F]+"/g, '');

// Also replace any standalone garbled strings used as return values
content = content.replace(/return\s+"[^\x00-\x7F]+"\s*;/g, 'return "";');

fs.writeFileSync(file, content, 'utf8');
console.log('Done! Cleaned all garbled non-ASCII comparisons.');

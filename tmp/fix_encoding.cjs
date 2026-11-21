const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'client', 'src', 'components', 'document-designer', 'LabReportRenderer.tsx');
let content = fs.readFileSync(file, 'utf8');

// The garbled sequences are corrupted Unicode characters from double-encoding.
// Replace all multi-byte garbled sequences that appear in string literals.
// Common patterns: Ã¢â‚¬â€" = em-dash (—), Ã¢â‚¬â€œ = left quote ("), etc.

// Fix 1: Garbled em-dash in string literals (—)
content = content.replace(/\|\|\s*"[^\x00-\x7F]+"/g, '|| ""');
content = content.replace(/val\s*!==\s*"[^\x00-\x7F]+"/g, 'val !== ""');
content = content.replace(/value\s*===\s*"[^\x00-\x7F]+"/g, 'value === ""');

// Fix 2: Return statements with garbled strings
content = content.replace(/return\s*"[^\x00-\x7F]+"\s*;/g, 'return "";');

// Fix 3: Any remaining garbled sequences in JSX text content (between > and <)
// These would be inline text. Replace with —
content = content.replace(/>([^\x00-\x7F<>]{2,})</g, '>—<');

// Fix 4: Comments with garbled chars
content = content.replace(/\/\/[^\n]*[^\x00-\x7F][^\n]*/g, (match) => {
    return match.replace(/[^\x00-\x7F]+/g, '...');
});

fs.writeFileSync(file, content, 'utf8');
console.log('Done! All garbled sequences fixed.');

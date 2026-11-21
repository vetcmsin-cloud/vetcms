import fs from 'fs';
const file = 'client/src/components/NewInvoiceTerminal.tsx';
let content = fs.readFileSync(file, 'utf8');

// The qty cell is occurrence 3 of the onKeyDown pattern
// After: \r\n                     />\r\n  (21 spaces before />)
// We need to find the exact qty one — it's the one that has:
// className="font-black text-rose-600 pr-2" before it

const qtyMarker = 'className="font-black text-rose-600 pr-2"';
const qtyIdx = content.indexOf(qtyMarker);
if (qtyIdx < 0) {
  console.log('ERROR: qty marker not found');
  process.exit(1);
}

// Find the onKeyDown line that follows this marker
const searchFrom = qtyIdx;
const onKeyDownStr = 'onKeyDown={e => { if (!isInvoiceReadOnly) handleRowKeyDown(e, row.id); }}';
const kdIdx = content.indexOf(onKeyDownStr, searchFrom);
if (kdIdx < 0) {
  console.log('ERROR: onKeyDown not found after qty marker');
  process.exit(1);
}

// Insert onFocus line right after the onKeyDown line
// Find the end of the onKeyDown line
const lineEnd = content.indexOf('\r\n', kdIdx);
const insertPos = lineEnd + 2; // after \r\n

// Extract the leading whitespace from the onKeyDown line to match indentation
const lineStart = content.lastIndexOf('\n', kdIdx) + 1;
const indent = content.substring(lineStart, kdIdx);

const onFocusLine = indent + 'onFocus={e => e.target.select()}\r\n';

content = content.substring(0, insertPos) + onFocusLine + content.substring(insertPos);
fs.writeFileSync(file, content, 'utf8');
console.log('SUCCESS: Added onFocus={e => e.target.select()} to qty EditCell');

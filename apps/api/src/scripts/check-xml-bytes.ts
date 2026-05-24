import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'last-signed-invoice.xml');
const buf = fs.readFileSync(filePath);

console.log('Total bytes:', buf.length);
console.log('First 20 bytes (hex):', buf.subarray(0, 20).toString('hex'));
console.log('First 20 bytes (ascii):', buf.subarray(0, 20).toString('ascii'));
console.log('Has UTF-8 BOM:', buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF);
console.log('Declared encoding:', buf.toString('ascii', 0, 200).match(/encoding="([^"]+)"/)?.[1]);

// Check if the file actually has non-ASCII bytes that would differ between ISO-8859-1 and UTF-8
let nonAsciiCount = 0;
const nonAsciiPositions: number[] = [];
for (let i = 0; i < buf.length; i++) {
  if (buf[i] > 127) {
    nonAsciiCount++;
    if (nonAsciiPositions.length < 10) nonAsciiPositions.push(i);
  }
}
console.log('Non-ASCII byte count:', nonAsciiCount);
if (nonAsciiPositions.length > 0) {
  console.log('First non-ASCII positions:', nonAsciiPositions);
  for (const pos of nonAsciiPositions) {
    console.log(`  Position ${pos}: 0x${buf[pos].toString(16)} context: ...${buf.subarray(Math.max(0, pos-10), pos+10).toString('latin1')}...`);
  }
}

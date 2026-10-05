const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const chunkToCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(chunkToCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateIconPNG(size, isMaskable = false) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * (isMaskable ? 0.45 : 0.42);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deep dark navy/slate background
      let r = 13, g = 18, b = 32, a = 255;

      // Glow / gradient circle
      if (dist <= radius) {
        const factor = dist / radius;
        // Electric blue to neon purple gradient
        const t = (x + y) / (width + height);
        // Neon Indigo/Cyan/Purple gradient
        r = Math.floor(59 * (1 - t) + 168 * t);
        g = Math.floor(130 * (1 - t) + 85 * t);
        b = Math.floor(246 * (1 - t) + 247 * t);

        // Inner play/download arrow shape
        // In the center, draw a stylized download arrow
        const nx = (x - cx) / (radius * 0.55);
        const ny = (y - cy) / (radius * 0.55);
        
        const inStem = Math.abs(nx) <= 0.18 && ny >= -0.55 && ny <= 0.1;
        const inHead = ny > 0.05 && ny <= 0.55 && Math.abs(nx) <= (0.55 - ny) * 1.0;
        const inTray = ny >= 0.58 && ny <= 0.72 && Math.abs(nx) <= 0.65;
        
        if (inStem || inHead || inTray) {
          r = 255; g = 255; b = 255; a = 255;
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generateIconPNG(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generateIconPNG(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generateIconPNG(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateIconPNG(180, false));
console.log('PNG Icons successfully generated in public/');

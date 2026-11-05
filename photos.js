// Turns a picked photo into small JPEGs that fit inside a Firestore document
// (1 MiB max), so photos can live in the free database instead of paid file storage.
const FULL = 1600;           // longest side of the viewable photo, in pixels
const THUMB = 480;           // longest side of the grid thumbnail
const MAX_CHARS = 900_000;   // stay safely under Firestore's 1 MiB per document

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this photo')); };
    img.src = url;
  });
}

function encode(img, max, quality) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return { data: canvas.toDataURL('image/jpeg', quality), w, h };
}

export async function preparePhoto(file) {
  const [img, taken] = await Promise.all([loadImage(file), readTakenDate(file)]);
  let max = FULL, quality = 0.82, full;
  for (;;) {
    full = encode(img, max, quality);
    if (full.data.length <= MAX_CHARS) break;
    quality -= 0.08;
    if (quality < 0.55) { max = Math.round(max * 0.8); quality = 0.75; }
  }
  const thumb = encode(img, THUMB, 0.72);
  return {
    full: full.data,
    thumb: thumb.data,
    w: full.w,
    h: full.h,
    takenAt: taken || new Date(file.lastModified || Date.now()),
  };
}

export function dataUrlToBlob(url) {
  const [head, b64] = url.split(',');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: head.match(/:(.*?);/)[1] });
}

// Reads "date taken" from a JPEG's EXIF data, so photos sort by when they were taken,
// not when they were uploaded. Returns null if the file has no such date.
async function readTakenDate(file) {
  try {
    const v = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (v.getUint16(0) !== 0xFFD8) return null;
    let off = 2;
    while (off + 10 < v.byteLength) {
      const marker = v.getUint16(off);
      if ((marker & 0xFF00) !== 0xFF00) return null;
      if (marker === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) return parseExifDate(v, off + 10);
      off += 2 + v.getUint16(off + 2);
    }
  } catch {}
  return null;
}

function parseExifDate(v, tiff) {
  const le = v.getUint16(tiff) === 0x4949;
  const u16 = o => v.getUint16(o, le);
  const u32 = o => v.getUint32(o, le);
  const find = (ifd, tag) => {
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (u16(e) === tag) return e;
    }
    return null;
  };
  const str = e => {
    const p = tiff + u32(e + 8);
    let s = '';
    for (let i = 0; i < 19; i++) s += String.fromCharCode(v.getUint8(p + i));
    return s;
  };
  const ifd0 = tiff + u32(tiff + 4);
  const exifPtr = find(ifd0, 0x8769);
  const original = exifPtr && find(tiff + u32(exifPtr + 8), 0x9003);
  const fallback = find(ifd0, 0x0132);
  const s = original ? str(original) : fallback ? str(fallback) : '';
  const m = s.match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
  return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}

/**
 * xhs-lite signing — pure-JS port of Cloxl/xhshow (MIT).
 *
 * Generates the Xiaohongshu web request signatures WITHOUT a browser, a DOM,
 * or eval: x-s, x-s-common, x-t, x-b3-traceid, x-xray-traceid. Runs in a
 * Cloudflare Worker / any V8 isolate.
 *
 * Verified byte-for-byte against the Python reference (see test/verify.mjs).
 * Upstream algorithm: https://github.com/Cloxl/xhshow
 */

// ==================== Config constants (from xhshow CryptoConfig) ====================

const STANDARD_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CUSTOM_B64 = 'ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5';
const X3_B64 = 'MfgqrsbcyzPQRStuvC7mn501HIJBo2DEFTKdeNOwxWXYZap89+/A4UVLhijkl63G';

const HEX_KEY =
  '71a302257793271ddd273bcee3e4b98d9d7935e1da33f5765e2ea8afb6dc77a5' +
  '1a499d23b67c20660025860cbf13d4540d92497f58686c574e508f46e1956344' +
  'f39139bf4faf22a3eef120b79258145b2feb5193b6478669961298e79bedca64' +
  '6e1a693a926154a5a7a1bd1cf0dedb742f917a747a1e388b234f2277516db711' +
  '6035439730fa61e9822a0eca7bff72d8';

const VERSION_BYTES = [121, 104, 96, 41];
const PAYLOAD_LENGTH = 144;
const A1_LENGTH = 52;
const APP_ID_LENGTH = 10;
const A3_PREFIX = [2, 97, 51, 16];
const ENV_TABLE = [115, 248, 83, 102, 103, 201, 181, 131, 99, 94, 4, 68, 250, 132, 21];
const ENV_CHECKS_DEFAULT = [0, 1, 18, 1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0];
const HASH_IV = [1831565813, 461845907, 2246822507, 3266489909];

const SEQUENCE_VALUE_MIN = 15, SEQUENCE_VALUE_MAX = 50;
const WINDOW_PROPS_LENGTH_MIN = 1000, WINDOW_PROPS_LENGTH_MAX = 1200;
const ENV_FINGERPRINT_TIME_OFFSET_MIN = 10, ENV_FINGERPRINT_TIME_OFFSET_MAX = 50;

const X3_PREFIX = 'mns0301_';
const XYS_PREFIX = 'XYS_';
const B1_SECRET_KEY = 'xhswebmplfbt';

const SIGNATURE_DATA_TEMPLATE = { x0: '4.2.6', x1: 'xhs-pc-web', x2: 'Windows', x3: '', x4: '' };
const SIGNATURE_XSCOMMON_TEMPLATE = {
  s0: 5, s1: '', x0: '1', x1: '4.2.6', x2: 'Windows', x3: 'xhs-pc-web', x4: '4.86.0',
  x5: '', x6: '', x7: '', x8: '', x9: -596800761, x10: 0, x11: 'normal',
};
const PUBLIC_USERAGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0';

// ==================== Injectable RNG (so tests can be deterministic) ====================

export const RNG = {
  // Mirrors Python random.randint(a, b) inclusive. Override in tests.
  randint(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  },
  randbytes(n) {
    const out = new Uint8Array(n);
    (globalThis.crypto || require('crypto').webcrypto).getRandomValues(out);
    return out;
  },
};

// ==================== byte / int helpers ====================

const u32 = (v) => v >>> 0;
const rotl = (v, n) => u32((v << n) | (v >>> (32 - n)));

// little-endian byte array; uses division so 8-byte (>32-bit) values are exact
function intToLeBytes(val, length = 4) {
  const arr = [];
  let v = val;
  for (let i = 0; i < length; i++) {
    arr.push(v & 0xff);
    v = Math.floor(v / 256);
  }
  return arr;
}

const utf8 = (s) => new TextEncoder().encode(s);

// ==================== MD5 (pure JS, returns lowercase hex) ====================

function md5Hex(bytes) {
  if (typeof bytes === 'string') bytes = utf8(bytes);
  const s = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const K = [];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;

  const ml = bytes.length * 8;
  const withOne = bytes.length + 1;
  const padLen = ((withOne + 8 + 63) & ~63) - withOne - 8; // bytes of zero padding
  const total = bytes.length + 1 + padLen + 8;
  const msg = new Uint8Array(total);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  // 64-bit little-endian length
  let lenLo = ml >>> 0;
  let lenHi = Math.floor(ml / 4294967296) >>> 0;
  for (let i = 0; i < 4; i++) { msg[total - 8 + i] = (lenLo >>> (8 * i)) & 0xff; }
  for (let i = 0; i < 4; i++) { msg[total - 4 + i] = (lenHi >>> (8 * i)) & 0xff; }

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

  for (let off = 0; off < total; off += 64) {
    const M = new Array(16);
    for (let i = 0; i < 16; i++) {
      M[i] = (msg[off + i * 4]) | (msg[off + i * 4 + 1] << 8) |
             (msg[off + i * 4 + 2] << 16) | (msg[off + i * 4 + 3] << 24);
      M[i] >>>= 0;
    }
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | (~D >>> 0)); g = (7 * i) % 16; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + rotl(F, s[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }

  const toHex = (n) => {
    let h = '';
    for (let i = 0; i < 4; i++) h += ((n >>> (8 * i)) & 0xff).toString(16).padStart(2, '0');
    return h;
  };
  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

// ==================== base64 (byte[] -> alphabet) ====================

function bytesToStdB64(bytes) {
  let out = '';
  const n = bytes.length;
  for (let i = 0; i < n; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < n ? bytes[i + 1] : 0;
    const b2 = i + 2 < n ? bytes[i + 2] : 0;
    out += STANDARD_B64[b0 >> 2];
    out += STANDARD_B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < n ? STANDARD_B64[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < n ? STANDARD_B64[b2 & 63] : '=';
  }
  return out;
}

function translateAlphabet(s, to) {
  let out = '';
  for (const ch of s) {
    const idx = STANDARD_B64.indexOf(ch);
    out += idx === -1 ? ch : to[idx]; // '=' and any other char pass through
  }
  return out;
}

const encodeCustom = (bytes) => translateAlphabet(bytesToStdB64(bytes), CUSTOM_B64);
const encodeX3 = (bytes) => translateAlphabet(bytesToStdB64(bytes), X3_B64);
const encodeCustomStr = (str) => encodeCustom(utf8(str));

// ==================== CRC32 (JS-style, signed) ====================

const CRC_POLY = 0xedb88320;
let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  CRC_TABLE = new Uint32Array(256);
  for (let d = 0; d < 256; d++) {
    let r = d;
    for (let k = 0; k < 8; k++) r = (r & 1) ? ((r >>> 1) ^ CRC_POLY) : (r >>> 1);
    CRC_TABLE[d] = r >>> 0;
  }
  return CRC_TABLE;
}
// js string_mode: charCodeAt & 0xFF per char; matches (-1 ^ c ^ POLY) >>> 0, signed
function crc32JsInt(str) {
  const tbl = crcTable();
  let c = 0xffffffff;
  for (let i = 0; i < str.length; i++) {
    const b = str.charCodeAt(i) & 0xff;
    c = (tbl[(c ^ b) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  const u = ((0xffffffff ^ c) ^ CRC_POLY) >>> 0;
  return u & 0x80000000 ? u - 0x100000000 : u;
}

// ==================== RC4 (ARC4) ====================

function rc4(keyBytes, dataBytes) {
  const S = new Uint8Array(256);
  for (let i = 0; i < 256; i++) S[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + keyBytes[i % keyBytes.length]) & 0xff;
    const t = S[i]; S[i] = S[j]; S[j] = t;
  }
  const out = new Uint8Array(dataBytes.length);
  let a = 0, b = 0;
  for (let k = 0; k < dataBytes.length; k++) {
    a = (a + 1) & 0xff;
    b = (b + S[a]) & 0xff;
    const t = S[a]; S[a] = S[b]; S[b] = t;
    out[k] = dataBytes[k] ^ S[(S[a] + S[b]) & 0xff];
  }
  return out;
}

// ==================== custom_hash_v2 (a3 field) ====================

function customHashV2(inputBytes) {
  let [s0, s1, s2, s3] = HASH_IV;
  const length = inputBytes.length;
  s0 = u32(s0 ^ length);
  s1 = u32(s1 ^ u32(length << 8));
  s2 = u32(s2 ^ u32(length << 16));
  s3 = u32(s3 ^ u32(length << 24));

  const dv = new DataView(new Uint8Array(inputBytes).buffer);
  for (let i = 0; i < Math.floor(length / 8); i++) {
    const v0 = dv.getUint32(i * 8, true);
    const v1 = dv.getUint32(i * 8 + 4, true);
    s0 = rotl(u32(u32(s0 + v0) ^ s2), 7);
    s1 = rotl(u32(u32(v0 ^ s1) + s3), 11);
    s2 = rotl(u32(u32(s2 + v1) ^ s0), 13);
    s3 = rotl(u32(u32(s3 ^ v1) + s1), 17);
  }

  const t0 = u32(s0 ^ length);
  const t1 = u32(s1 ^ t0);
  const t2 = u32(s2 + t1);
  const t3 = u32(s3 ^ t2);

  const r0 = rotl(t0, 9), r1 = rotl(t1, 13), r2 = rotl(t2, 17), r3 = rotl(t3, 19);
  s0 = u32(r0 + r2);
  s1 = u32(r1 ^ r3);
  s2 = u32(r2 + s0);
  s3 = u32(r3 ^ s1);

  const result = [];
  for (const s of [s0, s1, s2, s3]) result.push(...intToLeBytes(s, 4));
  return result;
}

// ==================== content string / api path ====================

// Python urllib.parse.quote(value, safe=",")  (utf-8, keeps A-Za-z0-9 _.-~ and ,)
function pyQuote(value, safeExtra) {
  const keep = new Set();
  const always = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-~";
  for (const c of always) keep.add(c);
  for (const c of safeExtra) keep.add(c);
  let out = '';
  const bytes = utf8(value);
  for (const byte of bytes) {
    const ch = String.fromCharCode(byte);
    if (byte < 0x80 && keep.has(ch)) out += ch;
    else out += '%' + byte.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}

function buildContentString(method, uri, payload) {
  payload = payload || {};
  if (method.toUpperCase() === 'POST') {
    return uri + jsonCompact(payload);
  }
  const keys = Object.keys(payload);
  if (keys.length === 0) return uri;
  const parts = keys.map((key) => {
    const value = payload[key];
    let vstr;
    if (Array.isArray(value)) vstr = value.map(String).join(',');
    else if (value !== null && value !== undefined) vstr = String(value);
    else vstr = '';
    return `${key}=${pyQuote(vstr, ',')}`;
  });
  return `${uri}?${parts.join('&')}`;
}

function extractApiPath(uriWithData) {
  const brace = uriWithData.indexOf('{');
  const q = uriWithData.indexOf('?');
  if (brace !== -1 && q !== -1) return uriWithData.slice(0, Math.min(brace, q));
  if (brace !== -1) return uriWithData.slice(0, brace);
  if (q !== -1) return uriWithData.slice(0, q);
  return uriWithData;
}

// Python json.dumps(obj, separators=(",",":"), ensure_ascii=False)
function jsonCompact(obj) {
  return JSON.stringify(obj);
}

function extractUri(url) {
  if (!url) throw new Error('URL must be a non-empty string');
  url = url.trim();
  if (url.startsWith('http')) {
    const u = new URL(url);
    return u.pathname;
  }
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

// ==================== payload array (mns0301) ====================

function hexToBytes(hex) {
  const out = [];
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
  return out;
}

function buildPayloadArray(dValue, a1Value, appId, stringParam, timestampSec) {
  const seed = RNG.randint(0, 0xffffffff);
  const seedByte = seed & 0xff;

  const payload = [...VERSION_BYTES];
  payload.push(...intToLeBytes(seed, 4));

  const tsMs = Math.floor(timestampSec * 1000);
  const tsBytes = intToLeBytes(tsMs, 8);
  payload.push(...tsBytes);

  const timeOffset = RNG.randint(ENV_FINGERPRINT_TIME_OFFSET_MIN, ENV_FINGERPRINT_TIME_OFFSET_MAX);
  const effectiveTsMs = Math.floor((timestampSec - timeOffset) * 1000);
  payload.push(...intToLeBytes(effectiveTsMs, 8));

  const sequenceValue = RNG.randint(SEQUENCE_VALUE_MIN, SEQUENCE_VALUE_MAX);
  payload.push(...intToLeBytes(sequenceValue, 4));

  const windowPropsLength = RNG.randint(WINDOW_PROPS_LENGTH_MIN, WINDOW_PROPS_LENGTH_MAX);
  payload.push(...intToLeBytes(windowPropsLength, 4));

  const uriLength = utf8(stringParam).length;
  payload.push(...intToLeBytes(uriLength, 4));

  const md5Bytes = hexToBytes(dValue);
  for (let i = 0; i < 8; i++) payload.push(md5Bytes[i] ^ seedByte);

  const a1Full = utf8(a1Value).slice(0, A1_LENGTH);
  const a1Bytes = new Uint8Array(A1_LENGTH);
  a1Bytes.set(a1Full);
  payload.push(a1Bytes.length);
  payload.push(...a1Bytes);

  const appFull = utf8(appId).slice(0, APP_ID_LENGTH);
  const appBytes = new Uint8Array(APP_ID_LENGTH);
  appBytes.set(appFull);
  payload.push(appBytes.length);
  payload.push(...appBytes);

  const part11 = [1, seedByte ^ ENV_TABLE[0]];
  for (let i = 1; i < 15; i++) part11.push(ENV_TABLE[i] ^ ENV_CHECKS_DEFAULT[i]);
  payload.push(...part11);

  const apiPath = extractApiPath(stringParam);
  const hexMd5 = md5Hex(apiPath);
  const md5PathBytes = hexToBytes(hexMd5);
  const hashInput = [...tsBytes, ...md5PathBytes];
  const hashed = customHashV2(hashInput);
  payload.push(...A3_PREFIX, ...hashed.map((b) => b ^ seedByte));

  return payload;
}

function xorTransform(sourceInts) {
  const key = hexToBytes(HEX_KEY);
  const out = new Uint8Array(sourceInts.length);
  for (let i = 0; i < sourceInts.length; i++) {
    out[i] = (i < key.length ? (sourceInts[i] ^ key[i]) : sourceInts[i]) & 0xff;
  }
  return out;
}

// ==================== public: sign x-s ====================

export function signXs(method, uri, a1Value, { appId = 'xhs-pc-web', payload = null, timestampSec = null } = {}) {
  uri = extractUri(uri);
  if (timestampSec === null) timestampSec = Date.now() / 1000;
  const contentString = buildContentString(method, uri, payload);
  const dValue = md5Hex(contentString);

  const payloadArray = buildPayloadArray(dValue, a1Value, appId, contentString, timestampSec);
  const xorResult = xorTransform(payloadArray);
  const x3sig = encodeX3(xorResult.slice(0, PAYLOAD_LENGTH));

  const sigData = { ...SIGNATURE_DATA_TEMPLATE, x3: X3_PREFIX + x3sig };
  return XYS_PREFIX + encodeCustomStr(jsonCompact(sigData));
}

// ==================== public: sign x-s-common ====================

export function generateB1(fp) {
  const keys = ['x33', 'x34', 'x35', 'x36', 'x37', 'x38', 'x39', 'x42', 'x43', 'x44',
    'x45', 'x46', 'x48', 'x49', 'x50', 'x51', 'x52', 'x82'];
  const b1fp = {};
  for (const k of keys) b1fp[k] = fp[k];
  const b1json = jsonCompact(b1fp);

  const cipher = rc4(utf8(B1_SECRET_KEY), utf8(b1json));
  // ciphertext bytes -> latin1 string -> python quote(safe="!*'()~_-")
  let cipherStr = '';
  for (const b of cipher) cipherStr += String.fromCharCode(b);
  const encodedUrl = pyQuote(cipherStr, "!*'()~_-");

  const b = [];
  const chunks = encodedUrl.split('%').slice(1);
  for (const c of chunks) {
    b.push(parseInt(c.slice(0, 2), 16));
    for (const ch of c.slice(2)) b.push(ch.charCodeAt(0));
  }
  return encodeCustom(b);
}

export function signXsCommon(cookieDict, fingerprint) {
  const a1 = cookieDict.a1;
  const fp = fingerprint || generateFingerprint(cookieDict, PUBLIC_USERAGENT);
  const b1 = generateB1(fp);
  const x9 = crc32JsInt(b1);

  const s = { ...SIGNATURE_XSCOMMON_TEMPLATE };
  s.x5 = a1;
  s.x8 = b1;
  s.x9 = x9;
  return encodeCustomStr(jsonCompact(s));
}

// ==================== fingerprint (runtime; randomized) ====================

const GPU_VENDORS = [
  'Google Inc. (Intel)|ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'Google Inc. (Intel)|ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x0000250F) Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)',
  'Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 6600 (0x000073FF) Direct3D11 vs_5_0 ps_5_0, D3D11)',
];
const SCREEN_RES = ['1366;768', '1600;900', '1920;1080', '2560;1440', '3840;2160'];
const BROWSER_PLUGINS = 'PDF Viewer,Chrome PDF Viewer,Chromium PDF Viewer,Microsoft Edge PDF Viewer,WebKit built-in PDF';
const CANVAS_HASH = '742cc32c';
const VOICE_HASH = '10311144241322244122';
const FONTS = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", sans-serif, BlinkMacSystemFont, "Helvetica Neue", Arial, "PingFang SC", "PingFang TC", "PingFang HK", "Microsoft Yahei", "Microsoft JhengHei"';

const pick = (arr) => arr[RNG.randint(0, arr.length - 1)];
function randMd5() {
  return md5Hex(RNG.randbytes(32));
}

export function generateFingerprint(cookies, userAgent) {
  const cookieString = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  const [w, h] = pick(SCREEN_RES).split(';').map(Number);
  const incognito = RNG.randint(0, 99) < 95 ? 'true' : 'false';
  const [vendor, renderer] = pick(GPU_VENDORS).split('|');
  const x78y = RNG.randint(2350, 2450);
  return {
    x1: userAgent, x2: 'false', x3: 'zh-CN', x4: pick([16, 24, 30, 32]), x5: pick([2, 4, 8, 16]),
    x6: '24', x7: `${vendor},${renderer}`, x8: pick([4, 6, 8, 12, 16]),
    x9: `${w};${h}`, x10: `${w};${h}`, x11: '-480', x12: 'Asia/Shanghai',
    x13: incognito, x14: incognito, x15: incognito, x16: 'false', x17: 'false', x18: 'un', x19: 'Win32', x20: '',
    x21: BROWSER_PLUGINS, x22: randMd5(), x23: 'false', x24: 'false', x25: 'false', x26: 'false', x27: 'false',
    x28: '0,false,false', x29: '4,7,8', x30: 'swf object not loaded',
    x33: '0', x34: '0', x35: '0', x36: `${RNG.randint(1, 20)}`,
    x37: '0|0|0|0|0|0|0|0|0|1|0|0|0|0|0|0|0|0|1|0|0|0|0|0',
    x38: '0|0|1|0|1|0|0|0|0|0|1|0|1|0|1|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0',
    x39: 0, x40: '0', x41: '0', x42: '3.4.4', x43: randMd5(), x44: `${Date.now()}`,
    x45: '__SEC_CAV__1-1-1-1-1|__SEC_WSA__|', x46: 'false', x47: '1|0|0|0|0|0',
    x48: '', x49: '{list:[],type:}', x50: '', x51: '', x52: '',
    x55: '380,380,360,400,380,400,420,380,400,400,360,360,440,420',
    x56: `${vendor}|${renderer}|${randMd5()}|35`, x57: cookieString, x58: '180', x59: '2', x60: '63',
    x61: '1291', x62: '2047', x63: '0', x64: '0', x65: '0',
    x66: { referer: '', location: 'https://www.xiaohongshu.com/explore', frame: 0 },
    x67: '1|0', x68: '0', x69: '326|1292|30', x70: ['location'], x71: 'true', x72: 'complete', x73: '1191',
    x74: '0|0|0', x75: 'Google Inc.', x76: 'true', x77: '1|1|1|1|1|1|1|1|1|1',
    x78: { x: 0, y: x78y, left: 0, right: 290.828125, bottom: x78y + 18, height: 18, top: x78y, width: 290.828125, font: FONTS },
    x82: '_0x17a2|_0x1954', x31: '124.04347527516074', x79: '144|599565058866',
    x53: randMd5(), x54: VOICE_HASH, x80: '1|[object FileSystemDirectoryHandle]',
  };
}

// ==================== trace ids + x-t ====================

const HEX_CHARS = 'abcdef0123456789';

export function b3TraceId() {
  let s = '';
  for (let i = 0; i < 16; i++) s += HEX_CHARS[RNG.randint(0, 15)];
  return s;
}

export function xrayTraceId(timestampMs = null, seq = null) {
  if (timestampMs === null) timestampMs = Date.now();
  if (seq === null) seq = RNG.randint(0, 8388607);
  // (timestamp << 23 | seq) as 16 hex chars — needs BigInt (>2^53)
  const part1 = ((BigInt(timestampMs) << 23n) | BigInt(seq)).toString(16).padStart(16, '0');
  let part2 = '';
  for (let i = 0; i < 16; i++) part2 += HEX_CHARS[RNG.randint(0, 15)];
  return part1 + part2;
}

export function xT(timestampSec = null) {
  return Math.floor((timestampSec === null ? Date.now() / 1000 : timestampSec) * 1000);
}

// ==================== convenience: full header set ====================

export function signHeaders(method, uri, cookieDict, { appId = 'xhs-pc-web', params = null, payload = null, timestampSec = null } = {}) {
  if (timestampSec === null) timestampSec = Date.now() / 1000;
  const m = method.toUpperCase();
  const requestData = m === 'GET' ? params : payload;
  const a1 = cookieDict.a1;
  if (!a1) throw new Error("Missing 'a1' in cookies");
  return {
    'x-s': signXs(m, uri, a1, { appId, payload: requestData, timestampSec }),
    'x-s-common': signXsCommon(cookieDict),
    'x-t': String(xT(timestampSec)),
    'x-b3-traceid': b3TraceId(),
    'x-xray-traceid': xrayTraceId(Math.floor(timestampSec * 1000)),
  };
}

export const _internals = {
  md5Hex, encodeCustom, encodeCustomStr, encodeX3, crc32JsInt, rc4, customHashV2,
  buildContentString, pyQuote, intToLeBytes,
};

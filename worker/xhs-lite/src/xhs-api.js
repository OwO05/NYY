/**
 * xhs-lite API layer — talks to the Xiaohongshu web API directly using the
 * pure-JS signatures from sign.js. No browser, no eval. Runs in a Worker.
 *
 * Responses are normalized to the same shape the SullyOS frontend already
 * consumes (the "bridge" REST contract), so no frontend rewrite is needed.
 */

import { signHeaders, _internals } from './sign.js';

const EDITH = 'https://edith.xiaohongshu.com';
const CREATOR = 'https://creator.xiaohongshu.com';
const WWW = 'https://www.xiaohongshu.com';

const IMG_FORMATS = ['jpg', 'webp', 'avif'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0';

// ==================== cookie helpers ====================

export function parseCookies(cookieStr) {
  const out = {};
  if (!cookieStr) return out;
  for (const part of cookieStr.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

// ==================== signed request core ====================

function baseHeaders(cookieStr) {
  return {
    accept: 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'content-type': 'application/json;charset=UTF-8',
    origin: WWW,
    referer: WWW + '/',
    'user-agent': UA,
    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Microsoft Edge";v="138"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'x-mns': 'unload',
    cookie: cookieStr,
  };
}

async function signedGet(base, uri, params, cookieStr, cookieDict) {
  // Build the query exactly as sign.js signs it, so URL == signed content.
  const query = buildSignedQuery(params);
  const sig = signHeaders('GET', uri, cookieDict, { params: params || {} });
  const url = base + uri + (query ? '?' + query : '');
  const resp = await fetch(url, { method: 'GET', headers: { ...baseHeaders(cookieStr), ...sig } });
  return resp.json();
}

async function signedPost(base, uri, payload, cookieStr, cookieDict, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  const sig = signHeaders('POST', uri, cookieDict, { payload });
  const resp = await fetch(base + uri, {
    method: 'POST',
    headers: { ...baseHeaders(cookieStr), ...sig, ...extraHeaders },
    body,
  });
  return resp.json();
}

// mirrors sign.js buildContentString GET encoding (urllib quote safe=",")
function buildSignedQuery(params) {
  if (!params) return '';
  const keys = Object.keys(params);
  if (!keys.length) return '';
  return keys.map((k) => {
    const v = params[k];
    let s;
    if (Array.isArray(v)) s = v.map(String).join(',');
    else if (v !== null && v !== undefined) s = String(v);
    else s = '';
    return `${k}=${_internals.pyQuote(s, ',')}`;
  }).join('&');
}

// ==================== note normalization (-> frontend shape) ====================

function pickCover(noteCard) {
  const cover = noteCard?.cover || {};
  const url = cover.url_default || cover.url_pre || cover.url || (cover.info_list?.[0]?.url) || '';
  return url ? url.replace(/^http:\/\//, 'https://') : undefined;
}

function normItem(item) {
  const nc = item.note_card || item.noteCard || item;
  const user = nc.user || {};
  const interact = nc.interact_info || nc.interactInfo || {};
  const likedRaw = interact.liked_count ?? interact.likedCount ?? 0;
  return {
    id: item.id || nc.note_id || nc.id || '',
    note_id: item.id || nc.note_id || nc.id || '',
    noteId: item.id || nc.note_id || nc.id || '',
    xsec_token: item.xsec_token || nc.xsec_token || '',
    xsecToken: item.xsec_token || nc.xsec_token || '',
    title: nc.display_title || nc.title || '',
    display_title: nc.display_title || nc.title || '',
    desc: nc.desc || '',
    type: nc.type || item.model_type || '',
    user: { nickname: user.nickname || user.nick_name || '', user_id: user.user_id || user.userId || '' },
    nickname: user.nickname || '',
    author: user.nickname || '',
    authorId: user.user_id || '',
    interact_info: { liked_count: String(likedRaw) },
    liked_count: String(likedRaw),
    cover: { url_default: pickCover(nc) || '' },
  };
}

function normComment(c) {
  const u = c.user_info || c.user || {};
  return {
    id: c.id || '',
    comment_id: c.id || '',
    commentId: c.id || '',
    content: c.content || '',
    nickname: u.nickname || '',
    author_name: u.nickname || '',
    user: { nickname: u.nickname || '', user_id: u.user_id || '' },
    like_count: c.like_count || '0',
    likes: c.like_count || '0',
    sub_comments: Array.isArray(c.sub_comments) ? c.sub_comments.map(normComment) : [],
  };
}

// ==================== read operations ====================

export async function checkLogin(cookieStr) {
  const ck = parseCookies(cookieStr);
  const r = await signedGet(EDITH, '/api/sns/web/v2/user/me', null, cookieStr, ck);
  const d = r?.data || {};
  const loggedIn = !!(r?.success && (d.user_id || d.userId || d.guest === false));
  return {
    logged_in: loggedIn,
    nickname: d.nickname || '',
    user_id: d.user_id || d.userId || '',
    red_id: d.red_id || '',
    raw: r,
  };
}

export async function listFeeds(cookieStr, { category = 'homefeed_recommend', cursorScore = '', noteIndex = 0, refreshType = 1 } = {}) {
  const ck = parseCookies(cookieStr);
  const payload = {
    cursor_score: cursorScore, num: 20, refresh_type: refreshType, note_index: noteIndex,
    unread_begin_note_id: '', unread_end_note_id: '', unread_note_count: 0,
    category, search_key: '', need_num: 10, image_formats: IMG_FORMATS, need_filter_image: false,
  };
  const r = await signedPost(EDITH, '/api/sns/web/v1/homefeed', payload, cookieStr, ck);
  const items = r?.data?.items || [];
  return { feeds: items.map(normItem), cursor_score: r?.data?.cursor_score, success: !!r?.success, msg: r?.msg, raw_error: r?.success ? undefined : r };
}

const SORT_MAP = { general: 'general', time: 'time_descending', hot: 'popularity_descending', comment: 'comment_descending', collect: 'collect_descending' };

export async function search(cookieStr, keyword, { page = 1, sort = 'general' } = {}) {
  const ck = parseCookies(cookieStr);
  const payload = {
    keyword, page, page_size: 20, search_id: genSearchId(), sort: SORT_MAP[sort] || 'general',
    note_type: 0, ext_flags: [],
    filters: [
      { tags: [SORT_MAP[sort] || 'general'], type: 'sort_type' },
      { tags: ['不限'], type: 'filter_note_type' },
      { tags: ['不限'], type: 'filter_note_time' },
      { tags: ['不限'], type: 'filter_note_range' },
      { tags: ['不限'], type: 'filter_pos_distance' },
    ],
    geo: '', image_formats: IMG_FORMATS,
  };
  const r = await signedPost(EDITH, '/api/sns/web/v1/search/notes', payload, cookieStr, ck);
  const items = (r?.data?.items || []).filter((it) => it.id && (it.note_card || it.model_type === 'note'));
  return { feeds: items.map(normItem), success: !!r?.success, msg: r?.msg, raw_error: r?.success ? undefined : r };
}

export async function getFeedDetail(cookieStr, feedId, xsecToken, { xsecSource = 'pc_feed', loadComments = true } = {}) {
  const ck = parseCookies(cookieStr);
  const payload = {
    source_note_id: feedId, image_formats: IMG_FORMATS, extra: { need_body_topic: '1' },
    xsec_source: xsecSource || 'pc_feed', xsec_token: xsecToken || '',
  };
  const r = await signedPost(EDITH, '/api/sns/web/v1/feed', payload, cookieStr, ck, { 'xy-direction': '13' });
  const item = r?.data?.items?.[0];
  const nc = item?.note_card || {};
  const note = {
    note_id: feedId,
    title: nc.title || '',
    content: nc.desc || '',
    desc: nc.desc || '',
    user: nc.user || {},
    interact_info: nc.interact_info || {},
    image_list: nc.image_list || [],
    xsec_token: xsecToken || '',
  };
  let comments = [];
  if (loadComments) {
    try {
      const cr = await signedGet(EDITH, '/api/sns/web/v2/comment/page', {
        note_id: feedId, cursor: '', top_comment_id: '', image_formats: 'jpg,webp,avif', xsec_token: xsecToken || '',
      }, cookieStr, ck);
      comments = (cr?.data?.comments || []).map(normComment);
    } catch { /* comments are best-effort */ }
  }
  return { data: { note, comments: { list: comments } }, success: !!r?.success, msg: r?.msg, raw_error: r?.success ? undefined : r };
}

export async function userProfile(cookieStr, userId, xsecToken) {
  const ck = parseCookies(cookieStr);
  const info = await signedGet(EDITH, '/api/sns/web/v1/user/otherinfo', { target_user_id: userId }, cookieStr, ck);
  let notes = [];
  try {
    const posted = await signedGet(EDITH, '/api/sns/web/v1/user_posted', {
      num: 30, cursor: '', user_id: userId, image_formats: 'jpg,webp,avif',
      xsec_token: xsecToken || '', xsec_source: 'pc_note',
    }, cookieStr, ck);
    notes = (posted?.data?.notes || []).map(normItem);
  } catch { /* best-effort */ }
  const basic = info?.data?.basic_info || {};
  return { basic_info: basic, notes, feeds: notes, success: !!info?.success };
}

// ==================== write operations ====================

export async function likeFeed(cookieStr, feedId, unlike = false) {
  const ck = parseCookies(cookieStr);
  const uri = unlike ? '/api/sns/web/v1/note/dislike' : '/api/sns/web/v1/note/like';
  const r = await signedPost(EDITH, uri, { note_oid: feedId }, cookieStr, ck);
  return { success: !!r?.success, msg: r?.msg, raw: r };
}

export async function favoriteFeed(cookieStr, feedId, unfavorite = false) {
  const ck = parseCookies(cookieStr);
  const uri = unfavorite ? '/api/sns/web/v1/note/uncollect' : '/api/sns/web/v1/note/collect';
  const payload = unfavorite ? { note_ids: feedId } : { note_id: feedId };
  const r = await signedPost(EDITH, uri, payload, cookieStr, ck);
  return { success: !!r?.success, msg: r?.msg, raw: r };
}

export async function postComment(cookieStr, feedId, content, { targetCommentId = null, xsecToken = '' } = {}) {
  const ck = parseCookies(cookieStr);
  const payload = { note_id: feedId, content, at_users: [] };
  if (xsecToken) payload.xsec_token = xsecToken;
  if (targetCommentId) payload.target_comment_id = targetCommentId;
  const r = await signedPost(EDITH, '/api/sns/web/v1/comment/post', payload, cookieStr, ck);
  return { success: !!r?.success, msg: r?.msg, comment: r?.data?.comment, raw: r };
}

// ==================== publish (image notes via 图床 URLs) ====================

export async function publishNote(cookieStr, { title = '', content = '', images = [], tags = [], isPrivate = false }) {
  const ck = parseCookies(cookieStr);
  const fileInfos = [];
  for (const imgUrl of images) {
    const info = await uploadImageFromUrl(cookieStr, ck, imgUrl);
    fileInfos.push(info);
  }

  let desc = content;
  const hashTags = [];
  for (const t of tags) {
    const name = String(t).replace(/^#/, '');
    desc += ` #${name}[话题]#`;
    hashTags.push({ id: '', link: '', name, type: 'topic' });
  }

  const data = buildImageNoteData(title, desc, isPrivate ? 2 : 1, fileInfos, hashTags);
  const r = await signedPost(EDITH, '/web_api/sns/v2/note', data, cookieStr, ck);
  return { success: !!r?.success, msg: r?.msg, note_id: r?.data?.id, raw: r };
}

async function uploadImageFromUrl(cookieStr, ck, imgUrl) {
  // 1) fetch image bytes from the 图床/CDN URL
  const imgResp = await fetch(imgUrl);
  if (!imgResp.ok) throw new Error(`图片下载失败 ${imgResp.status}: ${imgUrl}`);
  const buf = new Uint8Array(await imgResp.arrayBuffer());
  const mime = imgResp.headers.get('content-type') || 'image/png';
  const { width, height } = imageSize(buf) || { width: 1080, height: 1080 };

  // 2) request an upload permit (signed GET)
  const sigHeaders = signHeaders('GET', '/api/media/v1/upload/creator/permit', ck, {
    params: { biz_name: 'spectrum', scene: 'image', file_count: '1', version: '1', source: 'web' },
  });
  const permitUrl = CREATOR + '/api/media/v1/upload/creator/permit?' +
    buildSignedQuery({ biz_name: 'spectrum', scene: 'image', file_count: '1', version: '1', source: 'web' });
  const permitResp = await fetch(permitUrl, {
    method: 'GET',
    headers: { ...baseHeaders(cookieStr), ...sigHeaders, referer: CREATOR + '/publish/publish' },
  });
  const permitJson = await permitResp.json();
  const permit = permitJson?.data?.uploadTempPermits?.[0];
  if (!permit) throw new Error('获取上传凭证失败: ' + JSON.stringify(permitJson).slice(0, 200));

  const xt = sigHeaders['x-t'];
  const fileIds = permit.fileIds[0].split('/').pop();
  const token = permit.token;
  const uploadAddr = permit.uploadAddr || 'ros-upload.xiaohongshu.com';
  const uploadHost = uploadAddr.replace(/^https?:\/\//, '');
  const uploadBase = uploadAddr.startsWith('http') ? uploadAddr : `https://${uploadAddr}`;

  // 3) compute the COS upload signature (pure HMAC-SHA1 / SHA1)
  const message = `${String(xt).slice(0, 10)};${String(permit.expireTime).slice(0, 10)}`;
  const signature = await cosUploadSignature(message, fileIds, buf.length, uploadHost);

  // 4) PUT the bytes
  const putResp = await fetch(`${uploadBase}/spectrum/${fileIds}`, {
    method: 'PUT',
    headers: {
      accept: '*/*',
      authorization: `q-sign-algorithm=sha1&q-ak=null&q-sign-time=${message}&q-key-time=${message}&q-header-list=content-length;host&q-url-param-list=&q-signature=${signature}`,
      origin: CREATOR,
      referer: CREATOR + '/',
      'user-agent': UA,
      'x-cos-security-token': token,
      cookie: cookieStr,
    },
    body: buf,
  });
  if (!putResp.ok) throw new Error(`图片上传失败 ${putResp.status}`);

  return { fileIds, width, height, file_size: buf.length, mime_type: mime };
}

// COS signature: getSignature() from Spider_XHS xhs_creator_signature.js
async function cosUploadSignature(message, fileId, contentLength, host) {
  host = host || 'ros-upload.xiaohongshu.com';
  const signKey = await hmacSha1Hex('null', message);
  const newMessage = `put\n/spectrum/${fileId}\n\ncontent-length=${contentLength}&host=${host}\n`;
  const params = await sha1Hex(newMessage);
  const finalMsg = `sha1\n${message}\n${params}\n`;
  return hmacSha1Hex(signKey, finalMsg);
}

async function sha1Hex(str) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha1Hex(key, msg) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildImageNoteData(title, desc, privacyType, fileInfos, hashTags) {
  const images = fileInfos.map((f) => ({
    file_id: `spectrum/${f.fileIds}`,
    width: f.width,
    height: f.height,
    metadata: { source: -1 },
    stickers: { version: 2, floating: [] },
    extra_info_json: JSON.stringify({ mimeType: f.mime_type || 'image/png', image_metadata: { bg_color: '', origin_size: (f.file_size || 0) / 1024 } }),
  }));
  const contextJson = JSON.stringify({
    recommend_title: { recommend_title_id: '', is_use: 3, used_index: -1 },
    recommendTitle: [], recommend_topics: { used: [] },
  });
  return {
    common: {
      type: 'normal', title, note_id: '', desc,
      source: '{"type":"web","ids":"","extraInfo":"{\\"subType\\":\\"official\\",\\"systemId\\":\\"web\\"}"}',
      ats: [], hash_tag: hashTags, post_loc: {},
      privacy_info: { op_type: 1, type: privacyType, user_ids: [] },
      goods_info: {}, biz_relations: [], capa_trace_info: { contextJson },
    },
    image_info: { images },
    video_info: null,
  };
}

// ==================== utilities ====================

const _BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';
function intToBase36(big) {
  if (big === 0n) return '0';
  let s = '';
  while (big > 0n) { s = _BASE36[Number(big % 36n)] + s; big /= 36n; }
  return s;
}
function genSearchId() {
  const ts = BigInt(Date.now());
  const rand = BigInt(Math.ceil(0x7ffffffe * Math.random()));
  return intToBase36((ts << 64n) + rand);
}

// minimal JPEG/PNG/WebP dimension probe (best-effort; falls back to square)
function imageSize(buf) {
  try {
    if (buf[0] === 0x89 && buf[1] === 0x50) { // PNG
      const dv = new DataView(buf.buffer);
      return { width: dv.getUint32(16), height: dv.getUint32(20) };
    }
    if (buf[0] === 0xff && buf[1] === 0xd8) { // JPEG
      let o = 2;
      while (o < buf.length) {
        if (buf[o] !== 0xff) { o++; continue; }
        const marker = buf[o + 1];
        if (marker >= 0xc0 && marker <= 0xc3) {
          const dv = new DataView(buf.buffer);
          return { height: dv.getUint16(o + 5), width: dv.getUint16(o + 7) };
        }
        o += 2 + ((buf[o + 2] << 8) | buf[o + 3]);
      }
    }
    if (buf[8] === 0x57 && buf[9] === 0x45) { // WEBP "WE"
      if (buf[12] === 0x56 && buf[15] === 0x20) { // VP8 lossy
        const w = ((buf[27] << 8) | buf[26]) & 0x3fff;
        const h = ((buf[29] << 8) | buf[28]) & 0x3fff;
        return { width: w, height: h };
      }
    }
  } catch { /* ignore */ }
  return null;
}

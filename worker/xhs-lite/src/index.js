/**
 * xhs-lite Worker — a cloud signing+proxy for the Xiaohongshu web API.
 *
 * Replaces the heavy local stack (Chrome + CDP + Python/Go + cloudflared) with
 * a single stateless Worker. The user logs into xiaohongshu.com once, pastes
 * their cookie into SullyOS, and the Worker signs every request with the
 * pure-JS algorithm in sign.js. No browser, no eval, no local daemon.
 *
 * REST contract is identical to scripts/xhs-bridge.mjs, so the SullyOS frontend
 * (bridge mode) works against this Worker with only a cookie added.
 *
 * Auth: cookie is read from (in order) the `x-xhs-cookie` request header, the
 * JSON body `cookie` field, or the XHS_COOKIE Worker secret.
 */

import * as xhs from './xhs-api.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-xhs-cookie',
  'Access-Control-Max-Age': '86400',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const handlers = {
  'check-login': (b, ck) => xhs.checkLogin(ck),

  'search': (b, ck) => xhs.search(ck, b.keyword || '', { sort: b.sort_by, page: b.page }),

  'list-feeds': (b, ck) => xhs.listFeeds(ck, { category: b.category, cursorScore: b.cursor_score, noteIndex: b.note_index }),

  'get-feed-detail': (b, ck) => xhs.getFeedDetail(ck, b.feed_id, b.xsec_token, {
    xsecSource: b.xsec_source, loadComments: b.load_all_comments !== false,
  }),

  'post-comment': (b, ck) => xhs.postComment(ck, b.feed_id, b.content, { xsecToken: b.xsec_token }),

  'reply-comment': (b, ck) => xhs.postComment(ck, b.feed_id, b.content, {
    targetCommentId: b.comment_id, xsecToken: b.xsec_token,
  }),

  'like-feed': (b, ck) => xhs.likeFeed(ck, b.feed_id, !!b.unlike),

  'favorite-feed': (b, ck) => xhs.favoriteFeed(ck, b.feed_id, !!b.unfavorite),

  'user-profile': (b, ck) => xhs.userProfile(ck, b.user_id, b.xsec_token),

  'publish': (b, ck) => xhs.publishNote(ck, {
    title: b.title, content: b.content, images: b.images || [], tags: b.tags || [],
    isPrivate: b.visibility === 'private' || !!b.is_private,
  }),

  // Not available in cookie-based lite mode:
  'login': async () => ({ error: 'lite 模式用 cookie 登录，无需扫码。请在设置里粘贴 cookie。' }),
  'get-qrcode': async () => ({ error: 'lite 模式不支持二维码登录，请粘贴 cookie。' }),
  'delete-cookies': async () => ({ ok: true }),
  'publish-video': async () => ({ error: '视频发布暂未在 lite 模式实现。' }),
  'long-article': async () => ({ error: '长文发布暂未在 lite 模式实现。' }),
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/health' || path === '/health' || path === '/') {
      return json({ status: 'ok', backend: 'xhs-lite', signing: 'xhshow-pure-js' });
    }

    const m = path.match(/^\/api\/(.+)$/);
    if (!m) return json({ error: 'Not found. Use /api/<command>' }, 404);

    const command = m[1];
    const handler = handlers[command];
    if (!handler) return json({ error: `Unknown command: ${command}. Available: ${Object.keys(handlers).join(', ')}` }, 404);

    let body = {};
    if (request.method === 'POST') {
      try { body = await request.json(); } catch { /* allow empty */ }
    }

    const cookie = request.headers.get('x-xhs-cookie') || body.cookie || env.XHS_COOKIE || '';
    if (!cookie) return json({ error: '未配置 cookie。请在 SullyOS 设置里粘贴小红书 cookie，或给 Worker 设置 XHS_COOKIE secret。' }, 401);
    if (!cookie.includes('a1=')) return json({ error: 'cookie 缺少 a1 字段，请复制完整的小红书 cookie。' }, 400);

    try {
      const result = await handler(body, cookie);
      return json(result);
    } catch (e) {
      return json({ error: e.message || String(e) }, 500);
    }
  },
};

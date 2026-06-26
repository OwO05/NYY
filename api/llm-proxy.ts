/**
 * 通用 OpenAI 兼容 LLM 同源代理（Vercel Serverless）。
 *
 * 为什么要它：
 *   纯前端在浏览器里直连第三方 API，受同源策略约束——对方不返回
 *   Access-Control-Allow-Origin（如 Pioneer）就会被 CORS 预检挡死。
 *   而「浏览器 → 本站 /api/llm-proxy（同源，不跨域）→ 第三方（服务器到服务器，没有 CORS）」
 *   这条链路第一段不跨域、第二段没 CORS，于是任何没开 CORS 的源都能用。
 *   这跟 api/minimax/* 是同一思路，只是做成「转发到客户端指定 base_url」的通用版。
 *
 * 客户端约定：
 *   - 把真正要打的完整上游地址放在请求头 `x-llm-target`
 *     （例：https://api.pioneer.ai/v1/chat/completions）。
 *   - 鉴权头（Authorization / X-API-Key）、Content-Type、Accept 原样带上，这里透传。
 *   - method / body 原样转发。响应流式透传回去（status、content-type 保留）。
 *
 * 安全：只允许公网 http(s) 目标，挡掉 loopback / 私网 / link-local，避免被当成 SSRF 跳板。
 */

// 单次最长执行时间放宽到 60s（Hobby 计划上限），给长文本生成留余量。
export const config = { maxDuration: 60 };

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key,X-LLM-Target,Accept');
}

// 拒绝内网/环回/链路本地目标，避免 SSRF。
function isUnsafeTarget(parsed: URL): boolean {
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (host === '::1' || host === '0.0.0.0') return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]); const b = Number(v4[2]);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  if (/^f[cd][0-9a-f]{2}:/i.test(host) || /^fe[89ab][0-9a-f]:/i.test(host)) return true;
  return false;
}

export default async function handler(req: any, res: any) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const targetRaw = typeof req.headers['x-llm-target'] === 'string' ? req.headers['x-llm-target'] : '';
  if (!targetRaw) {
    res.status(400).json({ error: 'Missing X-LLM-Target header' });
    return;
  }

  let target: URL;
  try {
    target = new URL(targetRaw);
  } catch {
    res.status(400).json({ error: 'Invalid X-LLM-Target URL' });
    return;
  }
  if (isUnsafeTarget(target)) {
    res.status(400).json({ error: 'Target host not allowed' });
    return;
  }

  // 透传鉴权/内容头，丢掉 host/origin/cookie 等会干扰上游的。
  const fwdHeaders: Record<string, string> = {};
  const auth = req.headers['authorization'];
  const xApiKey = req.headers['x-api-key'];
  const accept = req.headers['accept'];
  if (typeof auth === 'string' && auth) fwdHeaders['Authorization'] = auth;
  if (typeof xApiKey === 'string' && xApiKey) fwdHeaders['X-API-Key'] = xApiKey;
  if (typeof accept === 'string' && accept) fwdHeaders['Accept'] = accept;

  // body：Vercel 已把 JSON body 解析成对象，转发时重新序列化（LLM 接口都是 JSON）。
  let body: string | undefined;
  if (req.method === 'POST') {
    fwdHeaders['Content-Type'] = 'application/json';
    if (req.body !== undefined && req.body !== null) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
  }

  try {
    const upstream = await fetch(target.toString(), {
      method: req.method,
      headers: fwdHeaders,
      body,
    });

    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);

    // 流式透传：边收边写，既支持 SSE 流，也避开缓冲式响应体大小上限。
    if (upstream.body && typeof (upstream.body as any).getReader === 'function') {
      const reader = (upstream.body as any).getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } else {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    }
  } catch (err: any) {
    res.status(502).json({ error: `Upstream fetch failed: ${err?.message || 'unknown'}` });
  }
}

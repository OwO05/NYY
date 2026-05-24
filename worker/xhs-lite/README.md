# XHS Lite — 小红书 Lite 版后端（Cloudflare Worker）

一个**无浏览器、无隧道、无 Python、无扫码**的小红书后端。把它部署到 Cloudflare（免费档即可），
在 SullyOS 设置里填上 Worker 地址 + 粘贴一次小红书 cookie，角色就能浏览 / 搜索 / 看详情 /
点赞 / 收藏 / 评论 / 发帖（带图）。

它替代了原来那套重的本地链路（Chrome + CDP + Go/Python + cloudflared），是**新增**的第三种后端，
不影响原有的 MCP / Skills 模式。

## 为什么能做到

小红书的签名分两类：

- **`x-s` / `x-s-common` / `x-t`**：纯数学算法。本 Worker 用 `src/sign.js` 纯 JS 实现
  （移植自 [Cloxl/xhshow](https://github.com/Cloxl/xhshow)，MIT），**无 eval、无 DOM**，
  并用 Python 原版做了逐字节比对验证（见 `test/`）。
- **图片上传签名 `getSignature`**：就是一段 HMAC-SHA1 + SHA1（来自 Spider_XHS 的
  `xhs_creator_signature.js`），用 Web Crypto `crypto.subtle` 实现。

所以发帖带图也成立：Worker 直接 `fetch` 你图床/CDN 上的图片字节 → 算上传签名 →
`PUT` 到小红书 ROS → 拿 `file_id` 发帖。

> ⚠️ 已知风险：Spider_XHS 给「搜索 / 笔记详情」额外加了 `x-rap-param`（JSVMP，Worker 跑不了，已省略）。
> 多数情况下不带也能用；若小红书对这两个接口强制要求，请用真实 cookie 实测，必要时再补。
> 签名算法会随小红书改版失效，到时同步上游 xhshow 更新 `src/sign.js` 即可。

## 部署

需要一个 Cloudflare 账号 + 安装 `wrangler`。

```bash
cd worker/xhs-lite
npm install
npx wrangler login
npm run deploy
```

部署完会得到一个地址，例如 `https://xhs-lite.<你的账号>.workers.dev`。

## 在 SullyOS 里配置

1. 浏览器登录 [xiaohongshu.com](https://www.xiaohongshu.com)，F12 → Application → Cookies，
   复制**完整 cookie 字符串**（必须含 `a1` 和 `web_session`）。
2. SullyOS → 设置 → 实时感知 → 小红书：
   - **服务器 URL** 填：`https://xhs-lite.<你的账号>.workers.dev/api`（注意结尾的 `/api`）
   - **小红书 Cookie** 粘贴上一步复制的 cookie
   - 点「测试连接」，显示账号昵称即成功。

cookie 存在你本地（SullyOS 配置）里，每次请求通过 `x-xhs-cookie` 头发给你自己的 Worker。
（可选）也可以不在前端填 cookie，而是给 Worker 设一个服务端默认 cookie：
`npx wrangler secret put XHS_COOKIE`。

## REST 接口

与 `scripts/xhs-bridge.mjs` 完全兼容（前端 bridge 模式直接复用）：

`POST /api/<command>`，command ∈
`check-login` `search` `list-feeds` `get-feed-detail` `post-comment`
`reply-comment` `like-feed` `favorite-feed` `user-profile` `publish`

cookie 来源优先级：`x-xhs-cookie` 头 → body.cookie → `XHS_COOKIE` secret。

## 验证签名

```bash
# 1) 准备 Python 参考（一次性）
git clone https://github.com/Cloxl/xhshow /tmp/xhshow
pip install pycryptodome
# 2) 生成参考向量并比对
cd test
PYTHONPATH=/tmp/xhshow/src python3 oracle.py > vectors.json
node verify.mjs   # 期望 10 passed, 0 failed
```

## 文件

| 文件 | 作用 |
|------|------|
| `src/sign.js` | 纯 JS 签名（x-s / x-s-common / x-t / traceid / b1 / 上传签名） |
| `src/xhs-api.js` | 小红书 web API 封装 + 响应归一化（对齐前端 bridge 契约） |
| `src/index.js` | Worker 入口：路由 / CORS / cookie |
| `test/oracle.py` | Python 参考 oracle（确定性向量） |
| `test/verify.mjs` | JS 与 Python 逐字节比对 |

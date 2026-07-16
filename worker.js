// gh-proxy + proxy-rule 合并版
// 核心功能：GitHub 加速代理
// 附加功能：直连规则订阅

const CONFIG = {
  GH_PROXY: {
    JSDELIVR: true,
    CF_CACHE_TTL: 3600,
    ALLOWED_DOMAINS: new Set([
      'github.com',
      'raw.githubusercontent.com',
      'gist.githubusercontent.com',
      'gist.github.com',
      'objects.githubusercontent.com',
      'github.io',
    ]),
  },
  PROXY_RULE: {
    GITHUB_RAW_BASE: 'https://raw.githubusercontent.com/seraluce/proxy-rule/main',
    CACHE_TTL: 86400,
  },
  GIT_PATHS: /^(\/[^/]+\/[^/]+\/)?(info\/refs|HEAD|objects\/|git-upload-pack|git-receive-pack)/,
};

const INDEX_HTML = buildIndexHTML();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, If-None-Match, If-Modified-Since, Referer',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, ETag, Range',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...CORS_HEADERS, ...SECURITY_HEADERS } });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // GitHub 加速
    if (path.startsWith('/gh/')) {
      const targetUrl = path.slice(4);
      return handleGHProxy(request, targetUrl);
    }

    // 直连规则
    if (path.startsWith('/rules')) {
      return handleProxyRule(request, path);
    }

    // 首页
    if (path === '/' || path === '/index.html') {
      return new Response(INDEX_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS },
      });
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
    });
  },
};

function isAllowedDomain(hostname) {
  return hostname === 'github.com' || CONFIG.GH_PROXY.ALLOWED_DOMAINS.has(hostname)
    || [...CONFIG.GH_PROXY.ALLOWED_DOMAINS].some(d => hostname.endsWith('.' + d));
}

function isGitRequest(url) {
  const ua = '';
  return CONFIG.GIT_PATHS.test(url.pathname);
}

function toJsDelivrUrl(url) {
  const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/);
  if (!match) return null;
  const [, user, repo, path] = match;
  return `https://cdn.jsdelivr.net/gh/${user}/${repo}@${path}`;
}

function getForwardHeaders(request) {
  const h = new Headers();
  h.set('User-Agent', 'GH-Proxy/2.0');

  const range = request.headers.get('Range');
  if (range) h.set('Range', range);

  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch) h.set('If-None-Match', ifNoneMatch);

  const ifModifiedSince = request.headers.get('If-Modified-Since');
  if (ifModifiedSince) h.set('If-Modified-Since', ifModifiedSince);

  const referer = request.headers.get('Referer');
  if (referer) h.set('Referer', referer);

  return h;
}

function buildProxyResponse(response) {
  const headers = new Response(response.headers).headers;
  Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => headers.set(k, v));

  headers.set('Cache-Control', `public, max-age=${CONFIG.GH_PROXY.CF_CACHE_TTL}`);

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

async function handleGHProxy(request, targetUrl) {
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing target URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
    });
  }

  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const target = new URL(targetUrl);

    if (!isAllowedDomain(target.hostname)) {
      return new Response(JSON.stringify({ error: 'Domain not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
      });
    }

    // jsDelivr 跳转
    if (CONFIG.GH_PROXY.JSDELIVR && target.hostname === 'github.com') {
      const jsDelivrUrl = toJsDelivrUrl(target);
      if (jsDelivrUrl) return Response.redirect(jsDelivrUrl, 302);
    }

    // Git 协议特殊处理
    if (isGitRequest(target)) {
      return handleGitProxy(request, target);
    }

    // 标准代理
    const proxyHeaders = getForwardHeaders(request);
    const response = await fetch(target.href, { headers: proxyHeaders });
    return buildProxyResponse(response);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
    });
  }
}

async function handleGitProxy(request, target) {
  const proxyHeaders = getForwardHeaders(request);
  proxyHeaders.set('User-Agent', 'git/2.0');

  const response = await fetch(target.href, { headers: proxyHeaders });
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => headers.set(k, v));

  return new Response(response.body, { status: response.status, headers });
}

async function handleProxyRule(request, path) {
  if (path === '/rules') {
    return new Response(JSON.stringify({
      name: '中国直连域名规则集',
      files: {
        'direct.txt': '/rules/direct.txt',
        'direct_clash.yaml': '/rules/direct_clash.yaml',
      },
      quickLinks: {
        'TXT (简短)': '/rules/direct',
        'Clash': '/rules/clash',
      },
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        ...CORS_HEADERS,
        ...SECURITY_HEADERS,
      },
    });
  }

  const fileMap = {
    '/rules/direct': 'direct.txt',
    '/rules/clash': 'direct_clash.yaml',
    '/rules/txt': 'direct.txt',
    '/rules/yaml': 'direct_clash.yaml',
    '/rules/direct.txt': 'direct.txt',
    '/rules/direct_clash.yaml': 'direct_clash.yaml',
  };

  const filePath = fileMap[path];
  if (!filePath) {
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
    });
  }

  const githubUrl = `${CONFIG.PROXY_RULE.GITHUB_RAW_BASE}/${filePath}`;

  try {
    const response = await fetch(githubUrl, {
      headers: { 'User-Agent': 'GH-Proxy/2.0' },
    });

    if (response.status === 403) {
      return new Response(JSON.stringify({ error: 'GitHub API rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
      });
    }

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `File not found: ${filePath}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
      });
    }

    const content = await response.text();
    const contentType = filePath.endsWith('.yaml')
      ? 'text/yaml; charset=utf-8'
      : 'text/plain; charset=utf-8';

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${CONFIG.PROXY_RULE.CACHE_TTL}, stale-while-revalidate=43200`,
        ...CORS_HEADERS,
        ...SECURITY_HEADERS,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
    });
  }
}

function buildIndexHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GH Proxy</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      min-height: 100vh;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 2rem; }
    header { text-align: center; margin-bottom: 3rem; }
    h1 { color: #58a6ff; font-size: 2.5rem; margin-bottom: 0.5rem; }
    .subtitle { color: #8b949e; font-size: 1.1rem; }

    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .card h2 {
      color: #58a6ff;
      font-size: 1.2rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .input-group {
      display: flex;
      gap: 0.5rem;
    }
    input {
      flex: 1;
      padding: 0.875rem 1rem;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      color: #c9d1d9;
      font-size: 1rem;
      transition: border-color 0.2s;
    }
    input:focus { outline: none; border-color: #58a6ff; }
    input::placeholder { color: #484f58; }

    button {
      padding: 0.875rem 1.5rem;
      background: #238636;
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #2ea043; }

    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .links a {
      padding: 0.5rem 1rem;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #58a6ff;
      text-decoration: none;
      font-size: 0.9rem;
      transition: background 0.2s;
    }
    .links a:hover { background: #30363d; }

    code {
      display: block;
      background: #21262d;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.9rem;
      margin-top: 0.5rem;
      word-break: break-all;
    }

    .hint {
      color: #8b949e;
      font-size: 0.9rem;
      margin-top: 1rem;
    }

    footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #30363d;
      color: #484f58;
      font-size: 0.9rem;
    }
    footer a { color: #58a6ff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>GH Proxy</h1>
      <p class="subtitle">GitHub 加速 & 直连规则订阅</p>
    </header>

    <div class="card">
      <h2>  GitHub 加速</h2>
      <div class="input-group">
        <input type="text" id="gh-input" placeholder="粘贴 GitHub 链接，如 https://github.com/...">
        <button onclick="proxyGH()">加速</button>
      </div>
      <p class="hint">支持 Release 下载、Archive 源码、Raw 文件、Git Clone</p>
      <div class="links">
        <a href="/rules">直连规则</a>
        <a href="/rules/direct">TXT 格式</a>
        <a href="/rules/clash">Clash 格式</a>
      </div>
    </div>

    <div class="card">
      <h2>  使用方式</h2>
      <p style="margin-bottom: 0.5rem; color: #8b949e;">在 GitHub URL 前加上 <code style="display:inline; padding: 0.2rem 0.5rem;">/gh/</code> 或直接访问：</p>
      <code>https://your-domain/gh/https://github.com/user/repo/releases/download/v1.0/file.zip</code>
      <p style="margin-top: 1rem; margin-bottom: 0.5rem; color: #8b949e;">Git Clone 加速：</p>
      <code>git clone https://your-domain/gh/https://github.com/user/repo.git</code>
    </div>

    <div class="card">
      <h2>  直连规则订阅</h2>
      <div class="links">
        <a href="/rules/direct.txt">direct.txt</a>
        <a href="/rules/direct_clash.yaml">direct_clash.yaml</a>
      </div>
      <p class="hint">用于 Clash、V2Ray 等代理工具的中国域名直连规则</p>
    </div>

    <footer>
      <p>Based on <a href="https://github.com/hunshcn/gh-proxy" target="_blank">gh-proxy</a> & <a href="https://github.com/seraluce/proxy-rule" target="_blank">proxy-rule</a></p>
    </footer>
  </div>

  <script>
    function proxyGH() {
      const input = document.getElementById('gh-input');
      const url = input.value.trim();
      if (!url) return;

      let target = url;
      if (url.includes('/gh/')) {
        target = url.split('/gh/')[1];
      } else if (url.match(/^https?:\\/\\//)) {
        target = url;
      }

      window.open('/gh/' + target, '_blank');
    }

    document.getElementById('gh-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') proxyGH();
    });
  </script>
</body>
</html>`;
}

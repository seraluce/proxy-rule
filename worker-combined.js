// 合并 Worker：proxy-rule + gh-proxy
// 功能：直连规则代理 + GitHub 加速代理

const CONFIG = {
  // proxy-rule 配置
  PROXY_RULE: {
    GITHUB_RAW_BASE: 'https://raw.githubusercontent.com/seraluce/proxy-rule/main',
    CACHE_TTL: 86400, // 24小时缓存
  },
  
  // gh-proxy 配置
  GH_PROXY: {
    PREFIX: '/proxy',
    JSDELIVR: true,
    ENABLE_KV_CACHE: true,
    KV_CACHE_TTL: 86400,
    KV_MAX_SIZE: 20 * 1024 * 1024, // 20MB
    ENABLE_CF_CACHE: true,
    CF_CACHE_TTL: 3600,
  },
};

// 路径映射
const PROXY_RULE_PATHS = {
  '/': 'direct.txt',
  '/direct': 'direct.txt',
  '/clash': 'direct_clash.yaml',
  '/yaml': 'direct_clash.yaml',
  '/direct.txt': 'direct.txt',
  '/direct_clash.yaml': 'direct_clash.yaml',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. 检查是否是 proxy-rule 的路径
    if (path in PROXY_RULE_PATHS) {
      return handleProxyRule(request, path);
    }

    // 2. 检查是否是 gh-proxy 的路径
    if (path.startsWith(CONFIG.GH_PROXY.PREFIX + '/')) {
      return handleGHProxy(request, env);
    }

    // 3. 根路径 - 返回使用说明
    if (path === '/') {
      return new Response(getIndexHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 4. 其他路径 - 404
    return new Response('Not Found', { status: 404 });
  },
};

// 处理 proxy-rule 请求
async function handleProxyRule(request, path) {
  const filePath = PROXY_RULE_PATHS[path];
  const githubUrl = `${CONFIG.PROXY_RULE.GITHUB_RAW_BASE}/${filePath}`;

  try {
    const response = await fetch(githubUrl, {
      headers: { 'User-Agent': 'ProxyRule Worker/1.0' },
    });

    if (response.status === 403) {
      return new Response('GitHub API rate limit exceeded', {
        status: 429,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (!response.ok) {
      return new Response(`File not found: ${filePath}`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
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
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(`Error: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// 处理 gh-proxy 请求
async function handleGHProxy(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const prefix = CONFIG.GH_PROXY.PREFIX;

  // 提取目标 URL
  let targetUrl = path.slice(prefix.length + 1);
  if (!targetUrl) {
    return new Response('Missing target URL', { status: 400 });
  }

  // 补全协议
  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const target = new URL(targetUrl);

    // 只允许 GitHub 相关域名
    const allowedDomains = [
      'github.com',
      'raw.githubusercontent.com',
      'gist.githubusercontent.com',
      'gist.github.com',
    ];

    if (!allowedDomains.some(d => target.hostname === d || target.hostname.endsWith('.' + d))) {
      return new Response('Domain not allowed', { status: 403 });
    }

    // 构造代理请求
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'User-Agent': 'GH-Proxy/1.0',
      },
    });

    const response = await fetch(proxyRequest);

    // 复制响应头并添加 CORS
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');

    // 根据内容类型设置缓存
    const contentType = response.headers.get('content-type') || '';
    if (CONFIG.GH_PROXY.ENABLE_CF_CACHE) {
      newHeaders.set('Cache-Control', `public, max-age=${CONFIG.GH_PROXY.CF_CACHE_TTL}`);
    }

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// 首页 HTML
function getIndexHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub 加速 & 代理规则</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { color: #58a6ff; margin-bottom: 1.5rem; text-align: center; }
    .section {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .section h2 { color: #58a6ff; margin-bottom: 1rem; font-size: 1.2rem; }
    .input-group {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    input {
      flex: 1;
      padding: 0.75rem;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #c9d1d9;
      font-size: 1rem;
    }
    input:focus { outline: none; border-color: #58a6ff; }
    button {
      padding: 0.75rem 1.5rem;
      background: #238636;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover { background: #2ea043; }
    .links { margin-top: 1rem; }
    .links a {
      display: inline-block;
      padding: 0.5rem 1rem;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #58a6ff;
      text-decoration: none;
      margin: 0.25rem;
      font-size: 0.9rem;
    }
    .links a:hover { background: #30363d; }
    code {
      background: #21262d;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 0.9rem;
    }
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #238636;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 6px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>GitHub 加速 & 代理规则</h1>
    
    <div class="section">
      <h2>GitHub 加速</h2>
      <p style="margin-bottom: 1rem; color: #8b949e;">在 GitHub URL 前加上 <code>/proxy/</code> 即可加速</p>
      <div class="input-group">
        <input type="text" id="gh-input" placeholder="粘贴 GitHub 链接...">
        <button onclick="proxyGH()">加速</button>
      </div>
      <div class="links">
        <a href="/direct">直连规则 (TXT)</a>
        <a href="/clash">直连规则 (Clash)</a>
        <a href="/direct.txt">direct.txt</a>
        <a href="/direct_clash.yaml">direct_clash.yaml</a>
      </div>
    </div>

    <div class="section">
      <h2>使用示例</h2>
      <p style="margin-bottom: 0.5rem;">下载 GitHub Release：</p>
      <code>/proxy/https://github.com/user/repo/releases/download/v1.0/file.zip</code>
      <p style="margin-top: 1rem; margin-bottom: 0.5rem;">克隆仓库：</p>
      <code>git clone /proxy/https://github.com/user/repo.git</code>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    function proxyGH() {
      const input = document.getElementById('gh-input');
      const url = input.value.trim();
      if (!url) return;
      window.open('/proxy/' + url, '_blank');
    }
    
    document.getElementById('gh-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') proxyGH();
    });
  </script>
</body>
</html>`;
}

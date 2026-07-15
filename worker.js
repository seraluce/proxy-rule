export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 严格校验路径，只允许预定义的路径列表（安全考虑）
    const allowedPaths = {
      '/': 'direct.txt',
      '/direct': 'direct.txt',
      '/clash': 'direct_clash.yaml',
      '/yaml': 'direct_clash.yaml',
      '/direct.txt': 'direct.txt',
      '/direct_clash.yaml': 'direct_clash.yaml',
    };

    // 如果路径不在允许列表中，直接返回 404
    if (!(path in allowedPaths)) {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const filePath = allowedPaths[path];
    const githubBase = 'https://raw.githubusercontent.com/seraluce/proxy-rule/main';
    const githubUrl = `${githubBase}/${filePath}`;

    try {
      const response = await fetch(githubUrl, {
        headers: {
          'User-Agent': 'ProxyRule Worker/1.0',
        },
      });

      // 处理 GitHub 限流 (403)
      if (response.status === 403) {
        return new Response('GitHub API rate limit exceeded, please try again later', {
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
      
      // 根据文件类型设置 Content-Type
      const contentType = filePath.endsWith('.yaml') 
        ? 'text/yaml; charset=utf-8' 
        : 'text/plain; charset=utf-8';

      // 优化缓存策略：24小时缓存，同时支持 stale-while-revalidate
      return new Response(content, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      return new Response(`Error: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  },
};

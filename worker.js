export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 支持的文件映射
    const fileMap = {
      '/': '/direct.txt',
      '/direct.txt': '/direct.txt',
      '/direct_clash.yaml': '/direct_clash.yaml',
      '/clash': '/direct_clash.yaml',
      '/txt': '/direct.txt',
    };

    // GitHub Raw 地址
    const githubBase = 'https://raw.githubusercontent.com/seraluce/proxy-rule/main';
    
    // 获取实际文件路径
    const filePath = fileMap[path] || path;
    const githubUrl = `${githubBase}${filePath}`;

    try {
      const response = await fetch(githubUrl, {
        headers: {
          'User-Agent': 'ProxyRule Worker/1.0',
        },
      });

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

      return new Response(content, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
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

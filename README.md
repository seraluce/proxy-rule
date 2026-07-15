# 中国直连域名规则集

自动合并维护的中国直连域名规则，用于代理工具（Clash、V2Ray、Shadowrocket 等）实现国内域名直连。

## 数据来源

- **geosite.dat**: v2fly 社区维护的域名分类数据（cn/gov/edu/mil）
- **外部规则源**: 可在 `sources.txt` 中自定义添加
- **自定义规则**: 支持在 `custom.txt` 中添加个人规则

## 订阅地址

### GitHub 直连（可能不稳定）

| 格式 | 地址 |
|------|------|
| 纯域名列表 | `https://raw.githubusercontent.com/seraluce/proxy-rule/main/direct.txt` |
| Clash 格式 | `https://raw.githubusercontent.com/seraluce/proxy-rule/main/direct_clash.yaml` |

### Cloudflare Workers（推荐）

部署 Worker 后，使用自定义域名访问：

| 格式 | 地址 |
|------|------|
| 纯域名列表 | `https://你的域名/direct.txt` |
| Clash 格式 | `https://你的域名/direct_clash.yaml` |
| 简化路径 | `https://你的域名/txt` 或 `https://你的域名/clash` |

## 文件说明

| 文件 | 说明 |
|------|------|
| `direct.txt` | 纯域名列表，一行一个域名 |
| `direct_clash.yaml` | Clash 规则格式（payload 列表） |
| `sources.txt` | 外部规则源 URL 列表 |
| `custom.txt` | 自定义域名规则（可选） |

## 自定义规则

在项目根目录创建 `custom.txt` 文件，每行一个域名：

```
example.com
test.example.org
```

规则会在每次更新时自动合并到 `direct.txt` 中。

## 更新频率

- **自动更新**: 每天 UTC 6:00（北京时间 14:00）
- **手动更新**: 在 Actions 页面点击 "Run workflow"

## 使用方法

### Clash

在 Clash 配置中添加：

```yaml
rules:
  - GEOSITE,cn,DIRECT
  - GEOSITE,category-gov,DIRECT
  - GEOSITE,category-edu,DIRECT
  # 或使用自定义规则集
  # - RULE-SET,https://raw.githubusercontent.com/seraluce/proxy-rule/main/direct_clash.yaml,DIRECT
```

### V2Ray/Xray

在 routing rules 中添加直连域名列表的引用。

## 贡献

欢迎提交 Issue 和 Pull Request 来完善规则集。

---

## Cloudflare Workers 部署指南

由于 GitHub Raw 在中国大陆访问不稳定，推荐使用 Cloudflare Workers 代理订阅源。

### 部署步骤

1. **登录 Cloudflare Dashboard**
   - 访问 https://dash.cloudflare.com
   - 注册/登录账号

2. **创建 Worker**
   - 左侧菜单选择 `Workers & Pages`
   - 点击 `Create Application`
   - 选择 `Create Worker`
   - 输入名称（如 `proxy-rule`），点击 `Deploy`

3. **配置 Worker 代码**
   - 点击刚创建的 Worker
   - 点击 `Edit Code`
   - 删除默认代码，粘贴 `worker.js` 文件中的内容
   - 点击 `Save and Deploy`

4. **绑定自定义域名**（推荐）
   - 在 Worker 详情页，选择 `Triggers` 标签
   - 点击 `Add Custom Domain`
   - 输入你的域名（如 `sub.example.com`）
   - 按提示添加 CNAME 记录到 `workers.dev`
   - 等待 DNS 生效（通常几分钟）

5. **获取订阅地址**
   - 部署成功后，访问 `https://你的域名/direct.txt` 测试
   - 将地址填入代理工具的订阅配置中

### Worker 代码

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const fileMap = {
      '/': '/direct.txt',
      '/direct.txt': '/direct.txt',
      '/direct_clash.yaml': '/direct_clash.yaml',
      '/clash': '/direct_clash.yaml',
      '/txt': '/direct.txt',
    };

    const githubBase = 'https://raw.githubusercontent.com/seraluce/proxy-rule/main';
    const filePath = fileMap[path] || path;
    const githubUrl = `${githubBase}${filePath}`;

    try {
      const response = await fetch(githubUrl, {
        headers: { 'User-Agent': 'ProxyRule Worker/1.0' },
      });

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
```

### 注意事项

- Worker 免费版每天有 100,000 次请求限额
- 建议配置缓存（已设置 `max-age=3600`）
- 自定义域名需要域名已托管在 Cloudflare

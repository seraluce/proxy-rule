# GH Proxy

GitHub 加速代理 & 中国直连域名规则集。

## 功能

| 功能 | 路径 | 说明 |
|------|------|------|
| GitHub 加速 | `/gh/https://github.com/...` | Release、Archive、Raw 文件下载 |
| Git Clone | `git clone https://域名/gh/https://github.com/.../repo.git` | 仓库克隆加速 |
| 直连规则 | `/rules/direct` | 纯域名列表 |
| Clash 规则 | `/rules/clash` | Clash 格式 |

## 快速开始

### Cloudflare Workers 部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 创建 Worker，粘贴 `worker.js` 内容
3. 绑定自定义域名
4. 开始使用

### 使用示例

```bash
# GitHub Release 加速下载
https://your-domain/gh/https://github.com/user/repo/releases/download/v1.0/app.zip

# Git Clone 加速
git clone https://your-domain/gh/https://github.com/user/repo.git

# 下载直连规则
https://your-domain/rules/direct
https://your-domain/rules/clash
```

## 路径说明

| 路径 | 功能 |
|------|------|
| `/` | 使用说明页面 |
| `/gh/https://github.com/...` | GitHub 加速代理 |
| `/rules` | 规则列表 (JSON) |
| `/rules/direct` 或 `/rules/txt` | 直连规则 TXT 格式 |
| `/rules/clash` 或 `/rules/yaml` | 直连规则 Clash 格式 |
| `/rules/direct.txt` | 直连规则 (完整路径) |
| `/rules/direct_clash.yaml` | Clash 规则 (完整路径) |

## 支持的 GitHub 链接

- Release 下载: `https://github.com/user/repo/releases/download/...`
- Archive 源码: `https://github.com/user/repo/archive/refs/heads/...`
- Raw 文件: `https://raw.githubusercontent.com/user/repo/...`
- Gist: `https://gist.githubusercontent.com/...`

## 直连规则数据来源

- **geosite.dat**: v2fly 社区维护的域名分类数据 (cn/gov/edu/mil)
- **自定义规则**: 支持在 `custom.txt` 中添加个人规则

## 文件说明

| 文件 | 说明 |
|------|------|
| `worker.js` | Worker 主程序 |
| `direct.txt` | 直连域名列表 |
| `direct_clash.yaml` | Clash 格式规则 |
| `sources.txt` | 外部规则源 URL |
| `custom.txt` | 自定义域名规则 |

## 自定义规则

在 `custom.txt` 中添加域名，每行一个：

```
example.com
test.example.org
```

规则会在 GitHub Actions 自动更新时合并到 `direct.txt`。

## 更新频率

- **自动更新**: 每天 UTC 6:00 (北京时间 14:00)
- **手动更新**: 在 Actions 页面点击 "Run workflow"

## 本地开发

Worker 可直接在 Cloudflare 编辑器中测试，也可使用 Wrangler CLI：

```bash
npm install
npx wrangler dev
```

## License

MIT

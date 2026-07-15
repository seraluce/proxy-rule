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
| 纯域名列表 | `https://你的域名/direct` |
| Clash 格式 | `https://你的域名/clash` |
| 带扩展名 | `https://你的域名/direct.txt` 或 `https://你的域名/direct_clash.yaml` |

### GitHub 加速（集成 gh-proxy）

Worker 同时支持 GitHub 加速功能，访问路径格式：

| 功能 | 格式 |
|------|------|
| 加速下载 | `https://你的域名/proxy/https://github.com/...` |
| 加速克隆 | `git clone https://你的域名/proxy/https://github.com/.../repo.git` |

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
  # 或使用自定义规则集（推荐通过 Worker 域名访问）
  # - RULE-SET,https://你的域名/clash,DIRECT
  # 或直接使用 GitHub 地址（可能不稳定）
  # - RULE-SET,https://raw.githubusercontent.com/seraluce/proxy-rule/main/direct_clash.yaml,DIRECT
```

### V2Ray/Xray

在 routing rules 中添加直连域名列表：

```json
{
  "routing": {
    "rules": [
      {
        "type": "field",
        "domain": [
          "geosite:cn",
          "geosite:category-gov",
          "geosite:category-edu"
        ],
        "outboundTag": "direct"
      },
      {
        "type": "field",
        "domain": [
          "ext:direct.txt:*. cn"  // 如果使用本地文件
        ],
        "outboundTag": "direct"
      }
    ]
  }
}
```

或者使用在线订阅（推荐通过 Worker）：

```json
{
  "routing": {
    "rules": [
      {
        "type": "field",
        "domain": [
          "geosite:cn"
        ],
        "outboundTag": "direct"
      }
    ]
  }
}
```

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
   - 输入名称（如 `proxy-service`），点击 `Deploy`

3. **配置 Worker 代码**
   - 点击刚创建的 Worker
   - 点击 `Edit Code`
   - 删除默认代码，粘贴 `worker-combined.js` 文件中的内容（包含 proxy-rule + gh-proxy 功能）
   - 点击 `Save and Deploy`

4. **绑定自定义域名**（推荐）
   - 在 Worker 详情页，选择 `Triggers` 标签
   - 点击 `Add Custom Domain`
   - 输入你的域名（如 `sub.example.com`）
   - 按提示添加 CNAME 记录到 `workers.dev`
   - 等待 DNS 生效（通常几分钟）

5. **获取订阅地址**
   - 访问 `https://你的域名/direct` 测试直连规则
   - 访问 `https://你的域名/clash` 测试 Clash 格式
   - GitHub 加速：`https://你的域名/proxy/https://github.com/...`

### Worker 文件说明

| 文件 | 说明 |
|------|------|
| `worker.js` | 仅 proxy-rule 功能（简单版） |
| `worker-combined.js` | proxy-rule + gh-proxy 合并版（推荐） |

### Worker 代码

#### proxy-rule 单独版 (`worker.js`)

仅包含直连规则代理功能：
- 严格路径校验，防止路径遍历攻击
- 支持无扩展名访问（`/direct`、`/clash`）
- 24 小时缓存，支持 stale-while-revalidate
- 友好的错误提示（包括 GitHub 限流处理）

#### 合并版 (`worker-combined.js`) - 推荐

包含 proxy-rule + gh-proxy 双功能：

| 路径 | 功能 |
|------|------|
| `/` | 显示使用说明页面 |
| `/direct` 或 `/clash` | 直连规则代理 |
| `/proxy/https://github.com/...` | GitHub 加速代理 |

### 注意事项

- Worker 免费版每天有 100,000 次请求限额
- 缓存策略：`max-age=86400, stale-while-revalidate=43200`（24小时缓存）
- 自定义域名需要域名已托管在 Cloudflare

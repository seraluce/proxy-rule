# 中国直连域名规则集

自动合并维护的中国直连域名规则，用于代理工具（Clash、V2Ray、Shadowrocket 等）实现国内域名直连。

## 数据来源

- **geosite.dat**: v2fly 社区维护的域名分类数据（cn/gov/edu/mil）
- **外部规则源**: 可在 `sources.txt` 中自定义添加
- **自定义规则**: 支持在 `custom.txt` 中添加个人规则

## 订阅地址

| 格式 | 地址 |
|------|------|
| 纯域名列表 | `https://raw.githubusercontent.com/seraluce/proxy-rule/main/direct.txt` |
| Clash 格式 | `https://raw.githubusercontent.com/seraluce/proxy-rule/main/direct_clash.yaml` |

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

# 一键部署指南

本项目提供了自动化部署脚本，支持多个平台的一键部署。

## 快速开始

### macOS / Linux 系统

```bash
./deploy.sh
```

### Windows 系统

双击运行 `deploy.bat` 或在命令行中执行：
```cmd
deploy.bat
```

## 部署选项

脚本提供以下 5 种部署方式：

### 1. 本地预览 (推荐先测试)
- 在本地启动预览服务器
- 可以在浏览器中查看构建后的效果
- 按 `Ctrl+C` 停止服务器

### 2. 部署到 GitHub Pages
**前置要求：**
- 已初始化 Git 仓库
- 已关联 GitHub 远程仓库
- 需要在 GitHub 仓库设置中启用 GitHub Pages

**步骤：**
1. 脚本会自动安装 `gh-pages` 包
2. 将 `dist/` 目录推送到 `gh-pages` 分支
3. 访问 `https://<你的用户名>.github.io/<仓库名>/`

### 3. 部署到 Vercel
**前置要求：**
- 注册 Vercel 账号 (https://vercel.com)

**步骤：**
1. 脚本会自动安装 Vercel CLI
2. 首次部署需要登录授权
3. 按提示完成部署
4. 获得自动生成的域名

### 4. 部署到 Netlify
**前置要求：**
- 注册 Netlify 账号 (https://netlify.com)

**步骤：**
1. 脚本会自动安装 Netlify CLI
2. 首次部署需要登录授权
3. 按提示完成部署
4. 获得自动生成的域名

### 5. 仅构建 (手动部署)
- 只执行构建操作
- 构建文件位于 `dist/` 目录
- 可以手动上传到任何静态网站托管服务

## 手动部署方案

如果不使用自动化脚本，可以手动执行以下步骤：

```bash
# 1. 安装依赖
npm install

# 2. 构建项目
npm run build

# 3. 预览构建结果（可选）
npm run preview

# 4. 部署 dist/ 目录到你选择的平台
```

### 常见托管平台

| 平台 | 免费额度 | 特点 |
|------|---------|------|
| **Vercel** | 无限带宽 | 自动 HTTPS，全球 CDN，最简单 |
| **Netlify** | 100GB/月 | 表单处理，函数支持 |
| **GitHub Pages** | 1GB | 与 GitHub 集成紧密 |
| **Cloudflare Pages** | 无限带宽 | Cloudflare CDN，速度快 |

## 环境要求

- **Node.js**: v16.0.0 或更高版本
- **npm**: v7.0.0 或更高版本

检查版本：
```bash
node -v
npm -v
```

## 故障排查

### 依赖安装失败
```bash
# 清除缓存后重试
npm cache clean --force
npm install
```

### 构建失败
```bash
# 删除 node_modules 重新安装
rm -rf node_modules
npm install
npm run build
```

### GitHub Pages 404 错误
检查 [`vite.config.ts`](vite.config.ts) 中的 `base` 配置：
```typescript
export default defineConfig({
  base: '/你的仓库名/',  // 如果部署在子路径
  // 或
  base: '/',  // 如果部署在根域名
})
```

### 权限错误 (macOS/Linux)
```bash
chmod +x deploy.sh
./deploy.sh
```

## 持续部署 (CI/CD)

如果需要自动化部署，可以设置 GitHub Actions：

创建 `.github/workflows/deploy.yml`：
```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 技术支持

部署遇到问题？
1. 检查 Node.js 版本
2. 查看终端错误信息
3. 检查网络连接
4. 参考各平台官方文档

---

**提示**: 推荐优先使用 Vercel，部署最简单且速度快！

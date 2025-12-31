# GitHub Pages 部署指南

## 📖 完整部署流程

### 第一步：准备 Git 仓库

#### 1. 初始化本地仓库（如果还没有）
```bash
git init
git add .
git commit -m "Initial commit"
```

#### 2. 在 GitHub 上创建仓库
1. 访问 https://github.com/new
2. 仓库名填写：`pixelbead-sim` （可以使用其他名称）
3. 保持为 Public（公开仓库）
4. 不要勾选任何初始化选项
5. 点击 "Create repository"

#### 3. 关联远程仓库
```bash
# 替换 YOUR_USERNAME 为你的 GitHub 用户名
git remote add origin https://github.com/YOUR_USERNAME/pixelbead-sim.git
git branch -M main
git push -u origin main
```

### 第二步：配置项目

已配置完成：
- ✅ [`package.json`](package.json) 已添加 `deploy` 脚本
- ✅ [`vite.config.ts`](vite.config.ts) 已设置 `base: '/pixelbead-sim/'`
- ✅ `gh-pages` 依赖已安装

**重要提醒：** 如果你的仓库名不是 `pixelbead-sim`，需要修改 [`vite.config.ts`](vite.config.ts:8)：
```typescript
base: '/你的仓库名/',
```

### 第三步：部署到 GitHub Pages

#### 方法一：使用一键部署脚本（推荐）

**macOS/Linux:**
```bash
./deploy.sh
```
然后选择选项 `2` (部署到 GitHub Pages)

**Windows:**
```cmd
deploy.bat
```
然后选择选项 `2`

#### 方法二：手动命令部署

```bash
# 1. 安装依赖（首次需要）
npm install

# 2. 构建项目
npm run build

# 3. 部署到 GitHub Pages
npm run deploy
```

### 第四步：启用 GitHub Pages

1. 访问你的 GitHub 仓库页面
2. 点击顶部的 **Settings** (设置)
3. 在左侧菜单找到 **Pages**
4. 在 **Source** 下拉菜单中选择 **gh-pages** 分支
5. 文件夹保持为 **/ (root)**
6. 点击 **Save**

稍等 1-2 分钟，你的网站就会上线！

### 第五步：访问你的网站

你的网站地址为：
```
https://YOUR_USERNAME.github.io/pixelbead-sim/
```

将 `YOUR_USERNAME` 替换为你的 GitHub 用户名。

## 🔄 后续更新

每次修改代码后，重新部署：

```bash
# 提交代码到 main 分支
git add .
git commit -m "更新说明"
git push

# 重新部署到 GitHub Pages
npm run deploy
```

或者直接运行：
```bash
./deploy.sh  # macOS/Linux
# 或
deploy.bat   # Windows
```
选择选项 `2`

## 🛠️ 常见问题

### ❌ 问题 1: 404 页面错误

**原因：** `base` 路径配置不正确

**解决方案：**

检查 [`vite.config.ts`](vite.config.ts:8)：
```typescript
base: '/pixelbead-sim/',  // 必须与你的仓库名一致
```

如果仓库名是 `my-project`，则改为：
```typescript
base: '/my-project/',
```

如果使用自定义域名，改为：
```typescript
base: '/',
```

### ❌ 问题 2: gh-pages 分支不存在

**解决方案：**
```bash
# 重新部署会自动创建分支
npm run deploy
```

### ❌ 问题 3: 推送失败 (403 Forbidden)

**原因：** Git 权限问题

**解决方案：**

使用 SSH 方式（推荐）：
```bash
# 1. 生成 SSH 密钥（如果没有）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 2. 复制公钥并添加到 GitHub
cat ~/.ssh/id_ed25519.pub

# 3. 访问 https://github.com/settings/keys 添加 SSH key

# 4. 修改远程仓库地址为 SSH
git remote set-url origin git@github.com:YOUR_USERNAME/pixelbead-sim.git
```

或使用个人访问令牌（PAT）：
1. 访问 https://github.com/settings/tokens
2. 生成新令牌，勾选 `repo` 权限
3. 使用令牌作为密码推送

### ❌ 问题 4: 样式丢失或资源 404

**原因：** 相对路径问题

**解决方案：**

确保 [`vite.config.ts`](vite.config.ts:8) 的 `base` 配置正确，重新构建：
```bash
npm run build
npm run deploy
```

## 🎯 自动化部署 (GitHub Actions)

想要每次 push 自动部署？创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

配置后，每次 push 到 main 分支都会自动部署！

## 📊 部署检查清单

- [ ] Git 仓库已初始化
- [ ] 已创建 GitHub 远程仓库
- [ ] 已推送代码到 GitHub
- [ ] [`vite.config.ts`](vite.config.ts) 的 `base` 配置正确
- [ ] 已安装依赖 (`npm install`)
- [ ] 已执行构建 (`npm run build`)
- [ ] 已部署 (`npm run deploy`)
- [ ] GitHub Pages 已在仓库设置中启用
- [ ] 已等待 1-2 分钟让 GitHub Pages 生效

## 🌐 访问地址

完成所有步骤后，你的项目将发布在：
```
https://YOUR_USERNAME.github.io/pixelbead-sim/
```

祝你部署成功！🎉

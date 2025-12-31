#!/bin/bash

# PixelBead Sim 一键部署脚本
# 适用于 macOS/Linux 系统

echo "================================"
echo "  PixelBead Sim 一键部署脚本"
echo "================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Node.js 是否安装
echo "📦 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未检测到 Node.js，请先安装 Node.js (https://nodejs.org/)${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js 版本: $NODE_VERSION${NC}"
echo ""

# 检查 npm 是否可用
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ 未检测到 npm${NC}"
    exit 1
fi

# 安装依赖
echo "📥 安装项目依赖..."
if npm install; then
    echo -e "${GREEN}✅ 依赖安装成功${NC}"
else
    echo -e "${RED}❌ 依赖安装失败${NC}"
    exit 1
fi
echo ""

# 构建项目
echo "🔨 构建生产版本..."
if npm run build; then
    echo -e "${GREEN}✅ 构建成功 - 输出目录: dist/${NC}"
else
    echo -e "${RED}❌ 构建失败${NC}"
    exit 1
fi
echo ""

# 部署选项
echo "🚀 选择部署方式:"
echo "  1) 本地预览 (推荐先测试)"
echo "  2) 部署到 GitHub Pages"
echo "  3) 部署到 Vercel"
echo "  4) 部署到 Netlify"
echo "  0) 仅构建，手动部署"
echo ""
read -p "请选择 (0-4): " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}🌐 启动本地预览...${NC}"
        echo -e "${GREEN}提示: 按 Ctrl+C 停止预览服务器${NC}"
        npm run preview
        ;;
    2)
        echo ""
        echo -e "${YELLOW}📤 部署到 GitHub Pages...${NC}"
        
        # 检查是否安装 gh-pages
        if ! npm list gh-pages &> /dev/null; then
            echo "安装 gh-pages..."
            npm install --save-dev gh-pages
        fi
        
        # 添加部署脚本到 package.json（如果不存在）
        if ! grep -q "\"deploy\"" package.json; then
            echo "添加部署命令到 package.json..."
            # 这里需要手动添加，提示用户
            echo -e "${YELLOW}请在 package.json 的 scripts 中添加:${NC}"
            echo '  "deploy": "gh-pages -d dist"'
            echo ""
            echo "然后运行: npm run deploy"
        else
            npx gh-pages -d dist
            echo -e "${GREEN}✅ 已部署到 GitHub Pages${NC}"
        fi
        ;;
    3)
        echo ""
        echo -e "${YELLOW}📤 部署到 Vercel...${NC}"
        
        # 检查 vercel CLI
        if ! command -v vercel &> /dev/null; then
            echo "安装 Vercel CLI..."
            npm install -g vercel
        fi
        
        vercel --prod
        ;;
    4)
        echo ""
        echo -e "${YELLOW}📤 部署到 Netlify...${NC}"
        
        # 检查 netlify CLI
        if ! command -v netlify &> /dev/null; then
            echo "安装 Netlify CLI..."
            npm install -g netlify-cli
        fi
        
        netlify deploy --prod --dir=dist
        ;;
    0)
        echo ""
        echo -e "${GREEN}✅ 构建完成！${NC}"
        echo -e "部署文件位于: ${YELLOW}dist/${NC} 目录"
        echo ""
        echo "手动部署方案："
        echo "  - 上传 dist/ 目录到任何静态网站托管服务"
        echo "  - 或使用: python3 -m http.server --directory dist 8080"
        ;;
    *)
        echo -e "${RED}无效的选择${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}================================${NC}"

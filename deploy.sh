#!/bin/bash
# 一键编译并部署 Halo AIO (包含 MySQL 和所有环境)
set -e

echo "======================================"
echo "  Halo 2 AIO Production Deployment"
echo "======================================"

# 1. 检查并安装 Docker
if ! command -v docker &> /dev/null; then
    echo "未检测到 Docker，正在为您自动安装 Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    echo "Docker 安装完成！"
else
    echo "Docker 已安装: $(docker --version)"
fi

# 2. 检查并安装 Docker Compose
if ! docker compose version &> /dev/null; then
    echo "未检测到 Docker Compose 插件，请确保您的系统安装了最新版 docker-ce-cli。"
    exit 1
else
    echo "Docker Compose 已就绪: $(docker compose version)"
fi

echo "--------------------------------------"
echo "正在拉取环境、编译代码并构建容器镜像..."
echo "(首次编译 Java 代码可能需要 2-5 分钟，请耐心等待)"
echo "--------------------------------------"

# 3. 执行编译并后台启动容器
docker compose -f docker-compose.prod.yml up -d --build

echo "======================================"
echo "🎉 部署已成功提交后台执行！"
echo "======================================"
echo "您的 MySQL 和 Halo 容器正在启动。"
echo "由于 Halo 需要连接数据库并进行初始化，可能还需要等待 30-60 秒。"
echo ""
echo "👉 您可以通过以下命令查看实时启动日志："
echo "   docker compose -f docker-compose.prod.yml logs -f halo"
echo ""
echo "👉 启动完成后，请在浏览器访问: http://<服务器公网IP>:8090"
echo "======================================"

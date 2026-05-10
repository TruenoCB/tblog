#!/bin/bash
set -e

# 获取当前脚本所在绝对路径
BASE_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$BASE_DIR/backend"

echo "=========================================================="
echo " 开始编译 Halo 博客源码..."
echo "=========================================================="

# 清理可能残留的锁文件
find . -name "*.lock" -delete

# 执行完整编译 (后端 + 前端)
echo "=> 正在使用 Gradle 编译 (这可能需要几分钟)..."
./gradlew clean build -x test -x checkstyleMain -DfailOnNoGitDirectory=false --no-daemon --max-workers=2

echo "=========================================================="
echo " 编译完成！"
echo "=========================================================="

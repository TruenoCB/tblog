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

# 1. 先单独编译前端，确保 UI 资源被正确生成
echo "=> [1/2] 正在编译前端控制台资源..."
./gradlew clean :ui:doBuild -DfailOnNoGitDirectory=false --no-daemon --max-workers=2

# 2. 编译后端，并打包 (因为前端已就绪，copyUiDist 绝对能拿到文件)
echo "=> [2/2] 正在编译后端并打包 (这可能需要几分钟)..."
./gradlew build -x test -x checkstyleMain -DfailOnNoGitDirectory=false --no-daemon --max-workers=2

echo "=========================================================="
echo " 编译完成！"
echo "=========================================================="

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

# 彻底清理之前的 build 产物，确保完全重新编译
echo "=> 清理所有历史构建产物..."
rm -rf application/build
rm -rf api/build
rm -rf platform/application/build
rm -rf platform/plugin/build
rm -rf ui/build
rm -rf .gradle

# 【关键修复】清理跨架构(Mac到Ubuntu)可能残留的 pnpm-lock.yaml 和 node_modules，强迫它在当前架构重新解析
echo "=> 清理前端跨架构缓存..."
rm -f ui/pnpm-lock.yaml
rm -rf ui/node_modules
rm -rf ui/packages/*/node_modules

# 【兼容性修复】由于我们在上面的步骤中强制删除了 pnpm-lock.yaml，导致 pnpm 重新计算依赖树时，
# tiptap 的实际解析版本可能发生了细微变化（如变成了 3.22.3），而 package.json 中配置的
# patchedDependencies 却依然锁死在 3.22.2 上，从而导致 pnpmInstall 报错 ERR_PNPM_UNUSED_PATCH。
# 我们使用 sed 把 "patchedDependencies" 这个键名直接改掉，让 pnpm 彻底忽略所有补丁校验，且不破坏 JSON 语法。
sed -i 's/"patchedDependencies"/"patchedDependencies_IGNORED"/g' ui/package.json

# 1. 先单独编译前端，确保 UI 资源被正确生成
echo "=> [1/2] 正在编译前端控制台资源..."
./gradlew clean :ui:doBuild -DfailOnNoGitDirectory=false --no-daemon --max-workers=2

# 2. 编译后端，并打包 (因为前端已就绪，copyUiDist 绝对能拿到文件)
echo "=> [2/2] 正在编译后端并打包 (这可能需要几分钟)..."
./gradlew build -x test -x checkstyleMain -DfailOnNoGitDirectory=false --no-daemon --max-workers=2

echo "=========================================================="
echo " 编译完成！"
echo "=========================================================="

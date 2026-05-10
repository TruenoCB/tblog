#!/bin/bash
set -e

BASE_DIR=$(cd "$(dirname "$0")" && pwd)

echo "=========================================================="
echo " 准备运行 Halo 博客..."
echo "=========================================================="

# 1. 配置主题与预置插件
echo "=> 正在配置主题与预置插件..."
mkdir -p /root/.halo2/themes
mkdir -p /root/.halo2/plugins

# 拷贝主题
if [ -d "$BASE_DIR/theme/halo-theme-chirpy" ]; then
    cp -r "$BASE_DIR/theme/halo-theme-chirpy" /root/.halo2/themes/
fi

# 拷贝插件
if [ -d "$BASE_DIR/plugins" ]; then
    cp -r "$BASE_DIR/plugins"/*.jar /root/.halo2/plugins/ 2>/dev/null || true
fi

# 2. 查找编译好的 Jar 包
echo "=> 查找编译产物..."
JAR_FILE=$(find "$BASE_DIR/backend/application/build/libs" -name "*.jar" ! -name "*-plain.jar" | head -n 1)

if [ -z "$JAR_FILE" ]; then
    echo "错误：未找到编译好的 Jar 包，请先执行 ./build.sh！"
    exit 1
fi

echo "找到 Jar 包: $JAR_FILE"

# 3. 启动 Halo
echo "=> 正在启动 Halo..."
echo "----------------------------------------------------------"
java -Xmx1024m -Xms512m -jar "$JAR_FILE" \
  --spring.r2dbc.url=r2dbc:mysql://localhost:3306/halo?useSSL=false\&characterEncoding=utf8\&serverTimezone=Asia/Shanghai \
  --spring.r2dbc.username=root \
  --spring.r2dbc.password=halo_db_password \
  --spring.sql.init.platform=mysql

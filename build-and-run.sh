#!/bin/bash
set -e

echo "=========================================================="
echo " 开始编译并运行 Halo 博客..."
echo "=========================================================="

echo "=> [1/3] 正在使用 Gradle 编译后端 Java 代码 (这可能需要几分钟)..."
cd /workspace/backend

# 清理可能残留的锁文件并执行编译 (跳过 Git 信息强制校验)
find . -name "*.lock" -delete
./gradlew clean :application:assemble -DfailOnNoGitDirectory=false --no-daemon --max-workers=2

echo "=> [2/3] 正在配置主题与预置插件..."
mkdir -p /root/.halo2/themes /root/.halo2/plugins
# 拷贝 Chirpy 主题 (包含足迹地图)
cp -r /workspace/theme/halo-theme-chirpy /root/.halo2/themes/
# 拷贝四个核心插件
cp -r /workspace/plugins/*.jar /root/.halo2/plugins/

echo "=> [3/3] 正在启动 Halo..."
echo "----------------------------------------------------------"
cd /workspace
# 查找编译生成的 jar 包
# 修复：Halo 构建脚本输出的 jar 包可能以 halo- 或 application- 开头
JAR_FILE=$(find /workspace/backend/application/build/libs -name "*.jar" ! -name "*-plain.jar" | head -n 1)

if [ -z "$JAR_FILE" ]; then
    echo "❌ 错误: 找不到编译生成的 jar 包，请检查构建日志！"
    exit 1
fi

echo "找到可执行文件: $JAR_FILE"

# 启动编译好的 Jar 包，并强行指定连接到刚刚启动的本地 MySQL
java -Xmx1024m -Xms512m -jar "$JAR_FILE" \
  --spring.r2dbc.url=r2dbc:mysql://localhost:3306/halo?useSSL=false\&characterEncoding=utf8\&serverTimezone=Asia/Shanghai \
  --spring.r2dbc.username=root \
  --spring.r2dbc.password=halo_db_password \
  --spring.sql.init.platform=mysql

#!/bin/bash
set -e

echo "=> [0/3] 正在修复并初始化目录权限..."
# 解决因为 Docker 挂载数据卷导致 /var/lib/mysql 权限变成 root 的问题
chown -R mysql:mysql /var/lib/mysql
chmod 755 /var/lib/mysql
mkdir -p /var/run/mysqld
chown -R mysql:mysql /var/run/mysqld

# 修复 MinIO 数据目录权限
mkdir -p /data
chmod 755 /data

# 如果挂载的是全新空数据卷，底层数据库文件会丢失，需要重新初始化
if [ ! -d "/var/lib/mysql/mysql" ]; then
    echo "检测到全新的空数据卷，正在初始化 MySQL 系统表..."
    mysqld --initialize-insecure --user=mysql
fi

echo "=> [1/3] 正在启动内置 MinIO 对象存储服务..."
export MINIO_ROOT_USER=admin
export MINIO_ROOT_PASSWORD=minio_password
nohup minio server /data --console-address ":9001" > /var/log/minio.log 2>&1 &

echo "=> [2/3] 正在启动内置 MySQL 服务..."
service mysql start

echo "等待 MySQL 服务就绪..."
while true; do
    if mysql -u root -e "SELECT 1" &> /dev/null; then
        break
    elif mysql -u root -phalo_db_password -e "SELECT 1" &> /dev/null; then
        break
    fi
    sleep 1
done

echo "=> [3/3] 初始化 Halo 数据库与账号..."
# 判断是首次无密码登录，还是重启后的有密码登录
if mysql -u root -e "SELECT 1" &> /dev/null; then
    echo "首次初始化：设置数据库和密码..."
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS halo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'halo_db_password';"
    mysql -u root -e "FLUSH PRIVILEGES;"
else
    echo "检测到已存在密码，验证并确保数据库存在..."
    mysql -u root -phalo_db_password -e "CREATE DATABASE IF NOT EXISTS halo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
fi

echo "=========================================================="
echo " 🎉 环境已准备完毕！内置 MySQL 和 MinIO 已在后台运行。"
echo " 💻 您的代码已挂载/复制到 /workspace 目录下。"
echo " 🚀 您现在可以在容器内自由编译和运行博客了！"
echo ""
echo " 👉 快捷指令：在容器内输入 build-and-run.sh 即可一键编译并启动博客。"
echo "=========================================================="

# 如果用户通过 docker run 传递了命令则执行，否则挂起容器保持后台运行
if [ "$#" -gt 0 ]; then
    exec "$@"
else
    tail -f /dev/null
fi
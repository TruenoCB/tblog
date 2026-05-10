#!/bin/bash
set -e

echo "Starting Halo AIO Environment Initialization..."

# Variables
MYSQL_DATA_DIR="/data/mysql"
HALO_WORK_DIR="/data/halo"
MINIO_DATA_DIR="/data/minio"
SKELETON_DIR="/app/skeleton"

export MINIO_ROOT_USER=${MINIO_ROOT_USER:-"admin"}
export MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD:-"minioadmin123"}

# 1. Initialize and start MariaDB
echo "======================================"
echo "          Starting MariaDB            "
echo "======================================"
if [ ! -d "$MYSQL_DATA_DIR/mysql" ]; then
    echo "Initializing MariaDB data directory..."
    mkdir -p $MYSQL_DATA_DIR
    mysql_install_db --user=mysql --datadir=$MYSQL_DATA_DIR > /dev/null 2>&1
fi

echo "Starting MariaDB daemon in background..."
mysqld_safe --datadir=$MYSQL_DATA_DIR --user=mysql > /dev/null 2>&1 &

# Wait for MariaDB to be ready
echo "Waiting for MariaDB to start..."
until mysqladmin ping -u root --silent; do
    sleep 1
done
echo "MariaDB is ready!"

# Setup Halo Database
echo "Creating Halo database and user if not exists..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS halo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -e "GRANT ALL PRIVILEGES ON halo.* TO 'halo'@'localhost' IDENTIFIED BY 'halo123'; FLUSH PRIVILEGES;"
mysql -u root -e "GRANT ALL PRIVILEGES ON halo.* TO 'halo'@'%' IDENTIFIED BY 'halo123'; FLUSH PRIVILEGES;"


# 2. Start MinIO
echo "======================================"
echo "           Starting MinIO             "
echo "======================================"
mkdir -p $MINIO_DATA_DIR
echo "Starting MinIO server in background..."
minio server $MINIO_DATA_DIR --console-address ":9001" > /var/log/minio.log 2>&1 &
sleep 2
echo "MinIO started! API: 9000, Console: 9001"
echo "MinIO Root User: $MINIO_ROOT_USER"
echo "MinIO Root Password: $MINIO_ROOT_PASSWORD"


# 3. Setup Halo Skeleton (copy plugins and themes)
echo "======================================"
echo "          Setup Halo Workspace        "
echo "======================================"
mkdir -p $HALO_WORK_DIR/themes $HALO_WORK_DIR/plugins

echo "Copying pre-installed plugins..."
cp -rn $SKELETON_DIR/plugins/* $HALO_WORK_DIR/plugins/ 2>/dev/null || true

echo "Copying custom themes..."
cp -rn $SKELETON_DIR/themes/* $HALO_WORK_DIR/themes/ 2>/dev/null || true


# 4. Start Halo
echo "======================================"
echo "            Starting Halo             "
echo "======================================"
exec java -jar /app/halo.jar \
    --spring.r2dbc.url=r2dbc:mariadb://localhost:3306/halo \
    --spring.r2dbc.username=halo \
    --spring.r2dbc.password=halo123 \
    --spring.sql.init.platform=mysql \
    --halo.work-dir=$HALO_WORK_DIR \
    --halo.plugin.fixed-plugin-path=$HALO_WORK_DIR/plugins

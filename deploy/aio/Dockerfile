# ==============================================================================
# Stage 1: Runtime Environment
# We use Eclipse Temurin 21 JRE on Ubuntu Jammy (22.04) as the base
# ==============================================================================
FROM eclipse-temurin:21-jre-jammy

# Set environment variables to avoid interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies: MariaDB (for MySQL), wget (for MinIO)
RUN apt-get update && \
    apt-get install -y mariadb-server wget curl && \
    rm -rf /var/lib/apt/lists/*

# Install MinIO
RUN wget -q https://dl.min.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio && \
    chmod +x /usr/local/bin/minio

# ==============================================================================
# Stage 2: Configuration & Data Setup
# ==============================================================================

# Environment variables for default configuration
ENV HALO_WORK_DIR=/data/halo \
    MINIO_DATA_DIR=/data/minio \
    MYSQL_DATA_DIR=/data/mysql \
    MINIO_ROOT_USER=admin \
    MINIO_ROOT_PASSWORD=minioadmin123

# Create necessary directories
RUN mkdir -p /data/halo /data/minio /data/mysql /app/skeleton/plugins /app/skeleton/themes/halo-theme-chirpy

# ==============================================================================
# Stage 3: Copy Compiled Artifacts & Custom Resources
# ==============================================================================

WORKDIR /app

# Copy the compiled Halo backend JAR from the host machine
# Note: Make sure you've built the jar using `./gradlew build` before running `docker build`
COPY backend/application/build/libs/halo-*.jar /app/halo.jar

# Copy your customized Chirpy theme and plugins into the skeleton directory
COPY theme/halo-theme-chirpy /app/skeleton/themes/halo-theme-chirpy
COPY plugins /app/skeleton/plugins

# Remove any locally generated states from the skeleton
RUN rm -f /app/skeleton/plugins/disabled.txt

# Copy the entrypoint script
COPY deploy/aio/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# ==============================================================================
# Stage 4: Expose Ports & Volume
# ==============================================================================

# Expose ports:
# 8090 - Halo Blog System
# 9000 - MinIO API
# 9001 - MinIO Console
EXPOSE 8090 9000 9001

# Declare persistent data volume
VOLUME ["/data"]

# Start the entrypoint script
ENTRYPOINT ["/entrypoint.sh"]

#!/bin/bash

set -e  # Dừng script nếu có lỗi

BUILDER_NAME="mybuilder"

# Kiểm tra builder đã tồn tại chưa
if ! docker buildx inspect "$BUILDER_NAME" &>/dev/null; then
  echo "🔧 Creating new builder: $BUILDER_NAME"
  docker buildx create --name "$BUILDER_NAME" --use
else
  echo "✅ Using existing builder: $BUILDER_NAME"
  docker buildx use "$BUILDER_NAME"
fi

# Khởi tạo QEMU và kiểm tra builder
docker buildx inspect --bootstrap

# Build đa kiến trúc và push
echo "📦 Building and pushing multi-arch image..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t namchamchi/pixel-music:latest \
  --push .

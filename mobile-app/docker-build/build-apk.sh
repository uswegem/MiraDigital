#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "=== MiraDigital Android APK Builder ==="
echo "Building APK using Docker with x86_64 emulation..."
echo ""

# Create output directory
mkdir -p ./docker-build/output

# Build the Docker image
echo "Step 1: Building Docker image (this may take a while on first run)..."
docker build --platform linux/amd64 -t miradigital-android-builder -f docker-build/Dockerfile .

# Run the build
echo ""
echo "Step 2: Running Android build inside container..."
docker run --platform linux/amd64 --rm \
  -v "$(pwd)/docker-build/output:/output" \
  miradigital-android-builder

echo ""
echo "=== Build Complete ==="
echo "APK location: ./docker-build/output/app-release.apk"
ls -lh ./docker-build/output/

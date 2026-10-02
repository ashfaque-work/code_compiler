#!/usr/bin/env bash
# Builds every execution image. Run once before starting the runner.
set -euo pipefail

TAG="${IMAGE_TAG:-1}"
cd "$(dirname "$0")"

for lang in python node cpp java go rust; do
  echo "==> code-compiler/${lang}:${TAG}"
  docker build -f "Dockerfile.${lang}" -t "code-compiler/${lang}:${TAG}" .
done

echo "All execution images built."

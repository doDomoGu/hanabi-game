#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f deploy.env ]; then
  echo "缺少 deploy.env，请先填写服务器 IP、账号和密码。"
  exit 1
fi

# shellcheck disable=SC1091
source deploy.env
export SSHPASS

ECS_HOST="${ECS_HOST:-}"
ECS_USER="${ECS_USER:-root}"
ECS_PORT="${ECS_PORT:-22}"
APP_DIR="${APP_DIR:-/opt/hanabi-game}"

if [ -z "$ECS_HOST" ]; then
  echo "deploy.env 里缺少 ECS_HOST"
  exit 1
fi

if [ -z "${SSHPASS:-}" ]; then
  echo "deploy.env 里缺少 SSHPASS"
  exit 1
fi

SSH_TARGET="${ECS_USER}@${ECS_HOST}"
PASS_SSH="$(pwd)/deploy/ssh-pass.exp"
PASS_SCP="$(pwd)/deploy/scp-pass.exp"
chmod +x "$PASS_SSH" "$PASS_SCP"

BUNDLE="$(mktemp -t hanabi-game-deploy.XXXXXX).tgz"
trap 'rm -f "$BUNDLE"' EXIT

echo "打包项目..."
tar -czf "$BUNDLE" \
  --exclude node_modules \
  --exclude client/node_modules \
  --exclude client/dist \
  --exclude server/node_modules \
  --exclude server/data \
  --exclude .git \
  --exclude deploy.env \
  --exclude '*.log' \
  --exclude .DS_Store \
  .

echo "上传到 ${SSH_TARGET}..."
expect "$PASS_SCP" -- -P "$ECS_PORT" \
  -o StrictHostKeyChecking=accept-new \
  -o PreferredAuthentications=password \
  -o PubkeyAuthentication=no \
  "$BUNDLE" "${SSH_TARGET}:/tmp/hanabi-game-deploy.tgz"

echo "上传远端部署脚本..."
expect "$PASS_SCP" -- -P "$ECS_PORT" \
  -o StrictHostKeyChecking=accept-new \
  -o PreferredAuthentications=password \
  -o PubkeyAuthentication=no \
  deploy/remote-deploy.sh "${SSH_TARGET}:/tmp/hanabi-game-remote-deploy.sh"

echo "远端执行部署..."
expect "$PASS_SSH" -- -p "$ECS_PORT" \
  -o StrictHostKeyChecking=accept-new \
  -o PreferredAuthentications=password \
  -o PubkeyAuthentication=no \
  "$SSH_TARGET" "bash /tmp/hanabi-game-remote-deploy.sh"

echo ""
echo "部署完成。访问："
echo "  http://dodomogu.com/hanabi/"

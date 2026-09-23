#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/hanabi-game
NEW_DIR=/opt/hanabi-game.new
OLD_DIR=/opt/hanabi-game.old

rm -rf "$NEW_DIR"
mkdir -p "$NEW_DIR"
tar -xzf /tmp/hanabi-game-deploy.tgz -C "$NEW_DIR"
rm -f /tmp/hanabi-game-deploy.tgz

# 房间数据落盘在 server/data/rooms，升级时需要保留
if [ -d "$APP_DIR/server/data" ]; then
  cp -a "$APP_DIR/server/data" "$NEW_DIR/server/data"
fi

rm -rf "$OLD_DIR"
if [ -d "$APP_DIR" ]; then
  mv "$APP_DIR" "$OLD_DIR"
fi
mv "$NEW_DIR" "$APP_DIR"

cd "$APP_DIR"
npm install --registry=https://registry.npmjs.org
# npm 的可选依赖平台包已知 bug（https://github.com/npm/cli/issues/4828）：
# 本地打包用的 lock 文件在其他平台生成时，rollup 的 linux-x64 原生包不会被
# 正确安装，需要显式补装。
npm install --no-save @rollup/rollup-linux-x64-gnu@4.63.3 --registry=https://registry.npmjs.org
npm run build

cp deploy/hanabi-game.service /etc/systemd/system/hanabi-game.service

# nginx：本项目只维护自己的路由片段，由 dodomogu.conf 统一 include
mkdir -p /etc/nginx/conf.d/dodomogu.d
cp deploy/hanabi.conf /etc/nginx/conf.d/dodomogu.d/hanabi.conf

# 一次性迁移：早期手动部署时用的是裸 IP、根路径独立配置
# （/etc/nginx/conf.d/hanabi-game.conf），现已改为 dodomogu.com/hanabi/
# 子路径方案，两者的 server_name 不同不会互相覆盖，但根路径的独立配置
# 会一直占着 80 端口的根 location，需要移除。
rm -f /etc/nginx/conf.d/hanabi-game.conf

systemctl daemon-reload
systemctl enable hanabi-game.service
systemctl restart hanabi-game.service
nginx -t
nginx -s reload
systemctl --no-pager --full status hanabi-game.service | /usr/bin/grep -E '●|Active:'

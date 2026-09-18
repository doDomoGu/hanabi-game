# 花火牌 HANABI

Vue 3 + Node.js 在线协作卡牌，文件存储，WebSocket 同步，移动端优先。界面仅中文。

## 快速开始

```bash
npm install
npm run dev
```

- 前端：http://localhost:8090（代理到后端）
- 后端：http://localhost:3001
- WebSocket：`ws://localhost:3001/ws`
- 生产部署路径：`/hanabi/`（由 `client/.env.production` 配置）

生产构建：

```bash
npm run build
npm start
```

构建后由 Node 同时提供 API、WebSocket 与静态页面。

## 目录

```
client/   Vue 3 + Vite + Pinia
server/   Express + ws + JSON 文件存储
docs/     需求文档
```

## 当前约定

- 断线：只等重连，不代打、不跳过
- 无出牌倒计时
- 不做彩虹牌变体
- 房间数据：`server/data/rooms/*.json`

更完整说明见 [docs/需求文档.md](docs/需求文档.md)。

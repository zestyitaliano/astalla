/*
 * Lightweight proxy to MSW's hosted worker script. This keeps the repo lean while
 * still enabling mock APIs in development. If you prefer to vendor the worker
 * locally run `pnpm --filter apps/frontend msw init public/ --save false`.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

importScripts("https://cdn.jsdelivr.net/npm/msw@2.6.0/mockServiceWorker.js");

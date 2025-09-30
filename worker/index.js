import { getContainer, Container } from "@cloudflare/containers";

export class BackendContainer extends Container {
  defaultPort = 8000;  // 容器里后端监听的端口
  sleepAfter = "5m";   // 空闲 5 分钟后会停止容器
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 如果路径是 /api 开头，就转发给后端容器
    if (pathname.startsWith("/api")) {
      // 你可以用某个标识 / session id 取得 container 实例
      const container = getContainer(env.BACKEND_CONTAINER);
      return container.fetch(request);
    }

    // 否则作为前端请求（静态资源 / 页面）
    // 假设你前端打包成静态文件放 worker 里
    return fetch(request);
  }
};

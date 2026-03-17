// Deno Deploy 入口文件 - 用于托管 Vite 构建的静态文件
import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";

Deno.serve((req) => {
  return serveDir(req, {
    fsRoot: "dist",
    quiet: true,
  });
});

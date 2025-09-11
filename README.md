# Cloudflare-notebook
一个基于 **Cloudflare Workers + KV** 的简易记事本 / Pastebin。 
灵感来自pereorga/minimalist-web-notepad极简 PHP 版实现，这里用无服务器架构重写，支持多设备共享、自动保存、纯文本访问。

无需服务器、无需数据库，完全运行在 Cloudflare 边缘网络上。  

## 功能
- 直接通过 URL 创建和保存笔记，例如：
https://your-worker.workers.dev/hello （也可以绑定自定义域名访问）

- 自动保存笔记内容到 KV 存储。  
- 支持目录浏览：访问根目录 `/` 即可查看所有已保存的笔记列表。  

## 部署步骤（可视化操作）
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)  
 进入 **Workers & Pages**。

2. 新建 Worker  
 - 点击 **Create Worker**  
 - 删除默认示例代码，粘贴以下内容：
   ```javascript
   export default {
     async fetch(request, env) {
       const url = new URL(request.url);
       const path = url.pathname.slice(1);

       // 列出已保存的笔记
       if (!path) {
         const list = await env.NOTES.list();
         const files = list.keys.map(k => `<li><a href="/${k.name}">${k.name}</a></li>`).join("");
         return new Response(`<h1>笔记目录</h1><ul>${files}</ul>`, { headers: { "content-type": "text/html" } });
       }

       // 获取笔记
       if (request.method === "GET") {
         const content = await env.NOTES.get(path);
         return new Response(content || "空笔记，请通过 POST 保存内容。", {
           headers: { "content-type": "text/plain" },
         });
       }

       // 保存笔记
       if (request.method === "POST") {
         const content = await request.text();
         await env.NOTES.put(path, content);
         return new Response("保存成功: " + path);
       }

       return new Response("方法不支持", { status: 405 });
     },
   };
   ```

3. 创建并绑定 KV  
 - 在 Worker 页面 → **Settings → Variables → KV Namespace Bindings**  
 - 新建一个 KV 命名空间（例如 `notebook`）  
 - 绑定名称填 `NOTES`（需要和代码里一致）  

4. 部署并访问  
 - 点击 **Deploy**  
 - 访问 `https://your-worker.workers.dev/` → 查看笔记目录  
 - 访问 `https://your-worker.workers.dev/hello` → 查看名为 `hello` 的笔记  
 - 用 `curl` 或 Postman 发送 POST 请求保存笔记，例如：
   ```bash
   curl -X POST https://your-worker.workers.dev/hello -d "这是我的第一条笔记"
   ```

## 示例
- 访问 `/` → 列出所有笔记  
- 访问 `/note1` → 获取名为 `note1` 的内容  
- 通过 POST `/note1` → 保存新内容  

## License
MIT

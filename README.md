# Cloudflare-notebook
一个基于 **Cloudflare Workers + KV** 的简易记事本 / Pastebin。 
灵感来自pereorga/minimalist-web-notepad极简 PHP 版实现，这里用无服务器架构重写，支持多设备共享、自动保存、纯文本访问。

无需服务器、无需数据库，完全运行在 Cloudflare 边缘网络上。  

## 功能

- 根目录 `/` → 浏览已保存笔记  
- 简洁 URL 编辑器 → `/笔记名`  
- 纯文本输出 → `/笔记名?raw` 或 curl/wget  
- 自动生成随机笔记名（路径非法或为空时）  

---

## 部署步骤（网页控制台）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)  
   → **Workers & Pages**

2. **新建 Worker**  
   - 点击 **Create Worker**  
   - 删除默认代码  
   - 粘贴 `src/index.js` 的内容

3. **创建 KV 命名空间**  
   - Worker 页面 → **Settings → Variables → KV Namespace Bindings**  
   - 添加绑定 → 新建命名空间（例如 `notes`）  
   - 变量名填 `NOTES_KV`（与代码保持一致）

4. **保存并部署**  
   - 点击 **Save and Deploy**  
   - Cloudflare 会生成子域，例如 `https://your-worker.workers.dev/`(可以绑定自定义域更方便）

---

## 使用示例

- `/` → 查看笔记目录  
- `/abcde` → 编辑名为 `abcde` 的笔记  
- `/abcde?raw` → 纯文本输出  

---

## License

MIT

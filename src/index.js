export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let noteName = decodeURIComponent(url.pathname.slice(1) || url.searchParams.get("note") || "");
    function isValidNoteName(name){
      if(!name || name.length > 50) return false;
    // 排除控制字符和路径符号
    if(/[\u0000-\u001F\u007F\/\\]/.test(name)) return false;
      return true;
    }
  
    // 非法笔记名直接提示
    if(!isValidNoteName(noteName) && url.pathname !== "/"){
      return new Response(`<script>alert("笔记名非法");history.back();</script>`, 
        { headers:{ "Content-Type":"text/html;charset=UTF-8" } });
    }

    // 显示目录
    if (!noteName) {
      const listResult = await env.NOTES_KV.list();
      const links = listResult.keys.map(k => {
        const safeName = encodeURIComponent(k.name);
        return `<li><a href="/${safeName}">${k.name}</a></li>`;
      }).join("");
      return new Response(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>📒 Web Notes</title>
<style>
body { font-family: sans-serif; padding: 1em; }
li { margin: 0.5em 0; }
a { color: #0366d6; text-decoration: none; }
a:hover { text-decoration: underline; }
</style>
</head>
<body>
<h1>📒 Notes</h1>
<ul>${links}</ul>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // 保存笔记
    if (request.method === "POST") {
      const text = await request.text();
      if (text.length) {
        await env.NOTES_KV.put(noteName, text);
      } else {
        await env.NOTES_KV.delete(noteName);
      }
      return new Response("OK");
    }

    // 获取原始内容
    if (url.searchParams.has("raw")) {
      const content = await env.NOTES_KV.get(noteName);
      return new Response(content || "", {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    // 获取编辑器页面
    const content = await env.NOTES_KV.get(noteName) || "";
    return new Response(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${noteName}</title>
<style>
body {
  margin: 0;
  background: #ebeef1;
  font-family: sans-serif;
}
.container {
  position: absolute;
  top: 10px; right: 10px; bottom: 10px; left: 10px;
}
#content {
  margin: 0;
  padding: 10px;
  overflow-y: auto;
  resize: none;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 1px solid #ddd;
  outline: none;
  font-size: 16px;       /* 移动端更大字体 */
  line-height: 1.5;      /* 提升可读性 */
}
@media (prefers-color-scheme: dark) {
  body { background: #333b4d; }
  #content {
    background: #24262b;
    color: #fff;
    border-color: #495265;
  }
}
</style>
</head>
<body>
<div class="container">
  <textarea id="content">${escapeHTML(content)}</textarea>
</div>
<script>
const textarea = document.getElementById('content');
let content = textarea.value;
function uploadContent() {
  if (content !== textarea.value) {
    const temp = textarea.value;
    fetch(window.location.href, { method: "POST", body: temp })
      .then(() => { content = temp; setTimeout(uploadContent, 1000); })
      .catch(() => setTimeout(uploadContent, 1000));
  } else {
    setTimeout(uploadContent, 1000);
  }
}
textarea.focus();
uploadContent();
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));
}
</script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
};

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));
}

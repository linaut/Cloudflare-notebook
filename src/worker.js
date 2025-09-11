function generateRandomName() {
  const chars = "234579abcdefghjkmnpqrstwxyz";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let path = url.pathname.replace(/^\/+/, ""); // 去掉前导 /

    // 根目录显示笔记列表
    if (!path) {
      const list = await env.NOTES_KV.list({ prefix: "note:" });
      const items = list.keys.map(k => `<li><a href="/${k.name.replace(/^note:/, "")}">${k.name.replace(/^note:/, "")}</a></li>`).join("");
      return new Response(
        `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>笔记目录</title></head>
<body><h2>已保存的笔记</h2><ul>${items}</ul></body></html>`,
        { headers: { "Content-Type": "text/html; charset=UTF-8" } }
      );
    }

    // 如果名字非法或过长，重定向到随机名字
    if (path.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(path)) {
      const newName = generateRandomName();
      return Response.redirect(`${url.origin}/${newName}`, 302);
    }

    const key = `note:${path}`;

    // POST 保存笔记
    if (request.method === "POST") {
      const body = await request.text();
      if (body.length > 0) {
        await env.NOTES_KV.put(key, body);
      } else {
        await env.NOTES_KV.delete(key);
      }
      return new Response("OK");
    }

    // raw / curl / wget 输出纯文本
    const ua = request.headers.get("user-agent") || "";
    if (url.searchParams.has("raw") || ua.startsWith("curl") || ua.startsWith("Wget")) {
      const content = await env.NOTES_KV.get(key);
      return new Response(content || "Not Found", { headers: { "Content-Type": "text/plain; charset=UTF-8" } });
    }

    // 简洁 HTML 编辑器
    const content = (await env.NOTES_KV.get(key)) || "";
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${path}</title>
<style>
body { margin:0; background:#ebeef1; }
.container { position:absolute; top:20px; right:20px; bottom:20px; left:20px; }
#content { margin:0; padding:20px; overflow-y:auto; resize:none; width:100%; height:100%;
           box-sizing:border-box; border:1px solid #ddd; outline:none; }
#printable { display:none; }
@media (prefers-color-scheme: dark) {
  body { background:#333b4d; }
  #content { background:#24262b; color:#fff; border-color:#495265; }
}
@media print {
  .container { display:none; }
  #printable { display:block; white-space:pre-wrap; word-break:break-word; }
}
</style>
</head>
<body>
<div class="container">
<textarea id="content">${content.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</textarea>
</div>
<pre id="printable"></pre>
<script>
var textarea = document.getElementById('content');
var printable = document.getElementById('printable');
var content = textarea.value;
printable.appendChild(document.createTextNode(content));

function uploadContent() {
  if (content !== textarea.value) {
    var temp = textarea.value;
    var request = new XMLHttpRequest();
    request.open('POST', window.location.href, true);
    request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    request.onload = function() { content = temp; setTimeout(uploadContent, 1000); }
    request.onerror = function() { setTimeout(uploadContent, 1000); }
    request.send('text=' + encodeURIComponent(temp));
    printable.textContent = temp;
  } else {
    setTimeout(uploadContent, 1000);
  }
}
textarea.focus();
uploadContent();
</script>
</body>
</html>`,
      { headers: { "Content-Type": "text/html; charset=UTF-8" } }
    );
  },
};

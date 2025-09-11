addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const noteName = decodeURIComponent(url.pathname.slice(1)) || null  // 去掉 "/"
  const raw = url.searchParams.has("raw")

  // KV binding
  const kv = NOTES_KV

  // Helper: 生成随机笔记名
  const randomNote = () => {
    const chars = '234579abcdefghjkmnpqrstwxyz'
    let s = ''
    for (let i = 0; i < 5; i++) {
      s += chars[Math.floor(Math.random() * chars.length)]
    }
    return s
  }

  // 首页显示已保存笔记列表
  if (!noteName) {
    let list = []
    const listResult = await kv.list()
    for (const key of listResult.keys) {
      list.push(key.name)
    }

    const items = list.map(n => `<li><a href="/${encodeURIComponent(n)}">${n}</a></li>`).join("\n")
    const newNote = randomNote()
    return new Response(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>笔记目录</title>
<style>
body { font-family: sans-serif; background: #f0f0f0; padding: 20px; }
h2 { color: #333; }
ul { list-style: none; padding: 0; }
li { margin: 5px 0; }
a { text-decoration: none; color: #0077cc; }
a:hover { text-decoration: underline; }
</style>
</head>
<body>
<h2>已保存笔记</h2>
<ul>${items}</ul>
<p><a href="/${newNote}">创建新笔记</a></p>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" }})
  }

  // 验证笔记名长度
  if (noteName.length > 64) {
    const newName = randomNote()
    return Response.redirect("/" + newName, 302)
  }

  // 处理 POST 保存内容
  if (request.method === "POST") {
    const text = await request.text()
    if (text.length) {
      await kv.put(noteName, text)
    } else {
      await kv.delete(noteName)
    }
    return new Response("ok")
  }

  // raw 输出
  if (raw) {
    const content = await kv.get(noteName)
    if (content !== null) {
      return new Response(content, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
    } else {
      return new Response("Not Found", { status: 404 })
    }
  }

  // 编辑页面
  const content = await kv.get(noteName) || ""

  return new Response(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${noteName}</title>
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
<textarea id="content">${content}</textarea>
</div>
<pre id="printable"></pre>
<script>
var textarea = document.getElementById('content');
var printable = document.getElementById('printable');
var content = textarea.value;
printable.textContent = content;

function uploadContent() {
    if (content !== textarea.value) {
        var temp = textarea.value;
        var xhr = new XMLHttpRequest();
        xhr.open('POST', window.location.href, true);
        xhr.setRequestHeader('Content-Type','text/plain; charset=UTF-8');
        xhr.onload = function() { content = temp; setTimeout(uploadContent, 1000); };
        xhr.onerror = function() { setTimeout(uploadContent, 1000); };
        xhr.send(temp);
        printable.textContent = temp;
    } else {
        setTimeout(uploadContent, 1000);
    }
}
textarea.focus();
uploadContent();
</script>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" }})
}

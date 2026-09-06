const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const local=__dirname,fallback=process.env.SANGUO_ASSET_ROOT || __dirname;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ogg':'audio/ogg','.woff2':'font/woff2'};
function createServer(){
 return http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const suffix=pathname==='/'?'/index.html':pathname;
  const candidates=[local,fallback].map(root=>({root,file:path.resolve(root,'.'+suffix)}));
  if(candidates.some(({root,file})=>!file.startsWith(root+path.sep))){res.writeHead(403).end();return;}
  const entry=candidates.find(({file})=>fs.existsSync(file)&&fs.statSync(file).isFile());
  if(!entry){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[path.extname(entry.file)]||'application/octet-stream');
  res.setHeader('Cache-Control','no-store');fs.createReadStream(entry.file).pipe(res);
 });
}
module.exports={createServer};
if(require.main===module){const server=createServer();server.listen(0,'127.0.0.1',()=>console.log('Preview http://127.0.0.1:'+server.address().port));}

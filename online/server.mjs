import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RoomStore } from './rooms.mjs';
const here=dirname(fileURLToPath(import.meta.url)),publicRoot=resolve(here,'public'),assetRoot=resolve(here,'../assets');
export function makeServer({directory=resolve(here,'data'),store=new RoomStore(directory)}={}){
 const attempts=new Map();
 function limit(req){const key=req.socket.remoteAddress||'unknown',now=Date.now();let value=attempts.get(key);if(!value||now-value.start>60000){value={start:now,count:0};attempts.set(key,value);}if(++value.count>240){const e=new Error('Příliš mnoho požadavků. Počkej chvíli.');e.status=429;throw e;}if(attempts.size>10000)for(const [k,v] of attempts)if(now-v.start>60000)attempts.delete(k);}
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  const json=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/api/')){
    if(!['GET','POST'].includes(req.method))return json(405,{error:'Nepovolená metoda.'});
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return json(403,{error:'Nepovolený původ požadavku.'});
    limit(req);let body={};if(req.method==='POST'){if(!String(req.headers['content-type']).startsWith('application/json'))return json(415,{error:'Vyžadován JSON.'});let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>8192)return json(413,{error:'Požadavek je příliš velký.'});}try{body=JSON.parse(raw);}catch{return json(400,{error:'Neplatný JSON.'});}if(!body||typeof body!=='object'||Array.isArray(body))return json(400,{error:'Neplatný požadavek.'});}
    const token=String(req.headers.authorization||'').replace(/^Bearer /,'');
    if(req.method==='POST'&&url.pathname==='/api/rooms')return json(201,store.create(body.name,body.band));
    const match=url.pathname.match(/^\/api\/rooms\/([A-Fa-f0-9]{8})(?:\/(join|actions))?$/);if(!match)return json(404,{error:'Nenalezeno.'});
    const [,code,operation]=match;
    if(req.method==='POST'&&operation==='join')return json(200,store.join(code,body.name,body.band));
    if(req.method==='POST'&&operation==='actions')return json(200,store.action(code,token,body));
    if(req.method==='GET'&&!operation)return json(200,store.read(code,token));
    return json(405,{error:'Nepovolená metoda.'});
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
   let root=publicRoot,path=url.pathname==='/'?'/index.html':url.pathname;
   if(path.startsWith('/assets/')){root=assetRoot;path=path.slice('/assets'.length);}
   const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+'/')){res.writeHead(403);return res.end();}
   if(!['.html','.js','.css','.png','.jpg','.jpeg','.svg'].includes(extname(file))){res.writeHead(404);return res.end();}
   const meta=await stat(file);if(!meta.isFile()){res.writeHead(404);return res.end();}
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
   res.writeHead(200,{'Content-Type':types[extname(file)]});res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch(e){json(e.status|| (e.code==='ENOENT'?404:500),{error:e.status?e.message:e.code==='ENOENT'?'Nenalezeno.':'Chyba serveru.'});}
 });return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';makeServer({directory:process.env.WHU_DATA_DIR||resolve(here,'data')}).listen(port,host,()=>console.log(`WHU online test: http://${host}:${port}`));}

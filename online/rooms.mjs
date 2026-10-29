import { randomBytes, randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
export const bands = {
  ironsouls: { title: 'Ironsoul’s Condemnors', prefix: 'ironsouls-condemners', names: ['Ironsoul','Tavian','Brodus'] },
  velmorn: { title: 'Sons of Velmorn', prefix: 'sons-of-velmorn', names: ['Morlak','Jedran','Thain','Helmar','Faulk'] },
  krew: { title: 'Da Kunnin’ Krew', prefix: 'da-kunnin-krew', names: ['Mannok','Torka','Krookgrin','Shank','Gikkit'] },
  ephilim: { title: 'Ephilim’s Pandaemonium', prefix: 'ephilims-pandaemonium', names: ['Ephilim','Spawnmaw','Flamespooler','Apo’trax','Kindlefinger'] }
};
export class RoomError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, text) => { throw new RoomError(status, text); };
const hash = token => createHash('sha256').update(token).digest('hex');
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const same = (a,b) => a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function boardCells() { const cells=[]; const top=[384,288,192,96,192,96,192,96,192,288,384]; for(let q=0;q<11;q++)for(let y=top[q];y<=1730-top[q];y+=192)cells.push({x:115+165*q,y}); return cells; }
const cells=boardCells();
export class RoomStore {
  constructor(directory) {
    this.directory=directory; this.rooms=new Map();
    if(directory){mkdirSync(directory,{recursive:true,mode:0o700});for(const file of readdirSync(directory).filter(f=>/^[A-F0-9]{8}\.json$/.test(f))){const room=JSON.parse(readFileSync(join(directory,file),'utf8'));this.rooms.set(room.code,room);}}
  }
  persist(room){ if(this.directory){const file=join(this.directory,room.code+'.json');writeFileSync(file+'.tmp',JSON.stringify(room),{mode:0o600});renameSync(file+'.tmp',file);}this.rooms.set(room.code,room); }
  get(code){const room=this.rooms.get(String(code).toUpperCase());if(!room)fail(404,'Místnost neexistuje.');return room;}
  view(room,player){return {code:room.code,revision:room.revision,you:player,players:room.players.map(p=>p?{name:p.name,band:p.band}:null),fighters:room.fighters,glory:room.glory,chat:room.chat,roll:room.roll};}
  create(name,band){if(!Object.hasOwn(bands,band))fail(400,'Vyber partu.');name=clean(name,32);if(!name)fail(400,'Zadej jméno.');if(this.rooms.size>=1000)fail(503,'Server má plno místností.');let code;do{code=randomBytes(4).toString('hex').toUpperCase();}while(this.rooms.has(code));const token=randomBytes(32).toString('hex');const room={code,revision:0,players:[{name,band,tokenHash:hash(token)},null],fighters:[],glory:[[0,0],[0,0]],chat:[],roll:null,receipts:[[],[]]};this.addFighters(room,1,band);this.persist(room);return {token,...this.view(room,1)};}
  addFighters(room,player,band){bands[band].names.forEach((name,index)=>room.fighters.push({id:player*10+index,name,player,band,card:index+1,x:115+index*330,y:player===1?1152:576,wounds:0,inspired:false,removed:false,tokens:[]}));}
  join(code,name,band){const room=structuredClone(this.get(code));if(room.players[1])fail(409,'Místnost už má dva hráče.');if(!Object.hasOwn(bands,band))fail(400,'Vyber partu.');name=clean(name,32);if(!name)fail(400,'Zadej jméno.');const token=randomBytes(32).toString('hex');room.players[1]={name,band,tokenHash:hash(token)};this.addFighters(room,2,band);room.revision++;this.persist(room);return {token,...this.view(room,2)};}
  authenticate(room,token){if(typeof token!=='string'||!token)fail(401,'Chybí přístup hráče.');const digest=hash(token);const index=room.players.findIndex(p=>p&&same(p.tokenHash,digest));if(index<0)fail(403,'Nemáš přístup do této místnosti.');return index+1;}
  read(code,token){const room=this.get(code);return this.view(room,this.authenticate(room,token));}
  action(code,token,input){const original=this.get(code),player=this.authenticate(original,token);const id=clean(input.id,80);if(!/^[\w-]{8,80}$/.test(id))fail(400,'Neplatné ID akce.');if(original.receipts[player-1].includes(id))return this.view(original,player);if(input.revision!==original.revision)fail(409,'Stůl se mezitím změnil. Stav byl obnoven; akci zopakuj.');const room=structuredClone(original);const a=input.action;if(!a||typeof a!=='object')fail(400,'Chybí akce.');
    if(['move','wound','inspire','remove','token','clearTokens'].includes(a.type)){
      const f=room.fighters.find(f=>f.id===a.fighter);if(!f)fail(400,'Bojovník neexistuje.');
      if(a.type==='move'){if(f.removed)fail(400,'Bojovník není na desce.');if(!cells.some(c=>c.x===a.x&&c.y===a.y))fail(400,'Vyber hex.');if(room.fighters.some(other=>other.id!==f.id&&!other.removed&&other.x===a.x&&other.y===a.y))fail(409,'Hex je obsazený.');f.x=a.x;f.y=a.y;}
      if(a.type==='wound'){if(![1,-1].includes(a.delta))fail(400,'Neplatná změna.');f.wounds=Math.max(0,Math.min(99,f.wounds+a.delta));}
      if(a.type==='inspire')f.inspired=!f.inspired;
      if(a.type==='remove'){if(f.removed&&room.fighters.some(other=>other.id!==f.id&&!other.removed&&other.x===f.x&&other.y===f.y))fail(409,'Místo pro návrat je obsazené. Nejdřív jej uvolni.');f.removed=!f.removed;}
      if(a.type==='token'){const name=clean(a.name,40);if(!name||f.tokens.length>=30)fail(400,'Zadej token; nejvýše 30 tokenů na bojovníka.');f.tokens.push(name);}
      if(a.type==='clearTokens')f.tokens=[];
    }else if(a.type==='glory'){if(![1,2].includes(a.player)||![0,1].includes(a.kind)||![1,-1].includes(a.delta))fail(400,'Neplatná změna Glory.');room.glory[a.player-1][a.kind]=Math.max(0,Math.min(999,room.glory[a.player-1][a.kind]+a.delta));
    }else if(a.type==='chat'){const text=clean(a.text,500);if(!text)fail(400,'Napiš zprávu.');room.chat.push({player,text});room.chat=room.chat.slice(-200);
    }else if(a.type==='roll'){if(!['attack','defence'].includes(a.kind)||!Number.isInteger(a.count)||a.count<1||a.count>10)fail(400,'Počet kostek musí být 1 až 10.');const faces=a.kind==='attack'?['Crit','Kladivo','Kladivo','Meče','1 podpora','2 podpory']:['Crit','Štít','Štít','Úhyb','1 podpora','2 podpory'];room.roll={player,kind:a.kind,faces:Array.from({length:a.count},()=>faces[randomInt(6)])};
    }else fail(400,'Neznámá akce.');
    room.revision++;room.receipts[player-1].push(id);room.receipts[player-1]=room.receipts[player-1].slice(-200);this.persist(room);return this.view(room,player);
  }
}

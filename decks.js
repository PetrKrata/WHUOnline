'use strict';
const deckCatalog=window.WHU_CARDS||{};
const pendingDecks=[null,null];
function parseDeckLink(text,catalog=deckCatalog){
 let url;try{url=new URL(text.trim());}catch{throw Error('Vlož úplný sdílený odkaz z UnderworldsDB.');}
 if(url.protocol!=='https:'||!['underworldsdb.com','www.underworldsdb.com'].includes(url.hostname)||url.pathname!=='/shared.php'||url.port||url.username||url.password)throw Error('Použij https://www.underworldsdb.com/shared.php?deck=…');
 const raw=url.searchParams.get('deck');if(!raw)throw Error('Odkaz neobsahuje seznam karet (deck).');
 const ids=raw.split(',').map(s=>s.trim().toUpperCase()).filter(s=>s!=='0');
 if(!ids.length||ids.length>200||ids.some(id=>!/^([A-Z]+)[0-9]+$/.test(id)))throw Error('Seznam karet je prázdný nebo obsahuje neplatný kód.');
 const unknown=ids.filter(id=>!Object.hasOwn(catalog,id));
 return {source:url.href,name:(url.searchParams.get('deckname')||'Importovaný balíček').slice(0,120),format:(url.searchParams.get('format')||'neuveden').slice(0,40),ids,unknown,counts:{objective:ids.filter(id=>catalog[id]?.type==='Objective').length,power:ids.filter(id=>catalog[id]&&catalog[id].type!=='Objective').length},duplicates:[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))]};
}
function deckStatus(n,text){document.getElementById('deckStatus'+n).textContent=text;}
const deckImportGeneration=[0,0];
async function loadDeck(n){
 const generation=++deckImportGeneration[n-1];pendingDecks[n-1]=null;const button=document.getElementById('importDeck'+n);button.disabled=true;
 try{const d=parseDeckLink(document.getElementById('deckUrl'+n).value);
 const list=document.getElementById('deckList'+n);list.replaceChildren();
 for(const id of d.ids){const c=deckCatalog[id],b=document.createElement('button');b.type='button';b.className='deck-card';b.textContent=c?`${id} · ${c.name} (${c.type})`:`${id} · neznámá karta`;b.disabled=!c;b.onclick=()=>previewDeckCard(id);list.append(b);}
 if(d.unknown.length){deckStatus(n,'Nelze potvrdit: neznámé kódy '+d.unknown.join(', '));return;}
 deckStatus(n,'Připravuji načtení obrázků…');
 const report=await window.WHUCardCache.preload(d.ids.map(id=>deckCatalog[id]),r=>{if(generation===deckImportGeneration[n-1])deckStatus(n,`Obrázky ${r.done}/${r.total} · staženo ${r.downloaded} · z mezipaměti ${r.cached} · chyby ${r.failed.length}`);});
 if(generation!==deckImportGeneration[n-1])return;
 if(report.failed.length){deckStatus(n,'Obrázky se nepodařilo připravit: '+report.failed.map(c=>c.id).join(', ')+'. Klikni znovu na Načíst balíček.');return;}
 pendingDecks[n-1]=d;
 deckStatus(n,`${d.ids.length} karet · Objective ${d.counts.objective} · Power ${d.counts.power} · ${d.format} · Obrázky připraveny (${report.downloaded} staženo, ${report.cached} z mezipaměti)${d.duplicates.length?' · Opakované kódy: '+d.duplicates.join(', '):''}`);
 }catch(e){if(generation===deckImportGeneration[n-1])deckStatus(n,e.message);}
 finally{if(generation===deckImportGeneration[n-1])button.disabled=false;}
}
function previewDeckCard(id){const c=deckCatalog[id];document.getElementById('deckCardTitle').textContent=`${id} · ${c.name}`;const img=document.getElementById('deckCardImage');img.onerror=()=>{document.getElementById('deckCardError').textContent='Obrázek se nepodařilo načíst. Karta zůstává v seznamu.';};document.getElementById('deckCardError').textContent='';img.src=c.image;img.alt=c.name;document.getElementById('deckViewer').showModal();}
for(const n of [1,2]){
 document.getElementById('importDeck'+n).onclick=()=>loadDeck(n);
 document.getElementById('deckUrl'+n).oninput=()=>{deckImportGeneration[n-1]++;pendingDecks[n-1]=null;document.getElementById('importDeck'+n).disabled=false;document.getElementById('deckList'+n).replaceChildren();deckStatus(n,'Odkaz změněn. Klikni na Načíst balíček.');};
}
document.getElementById('closeDeckCard').onclick=()=>document.getElementById('deckViewer').close();
function prepareDeckForm(decks){for(const n of [1,2]){const d=decks?.[n-1];document.getElementById('deckUrl'+n).value=d?.source||'';if(d)loadDeck(n);else{deckImportGeneration[n-1]++;document.getElementById('importDeck'+n).disabled=false;pendingDecks[n-1]=null;document.getElementById('deckList'+n).replaceChildren();deckStatus(n,'Vlož sdílený odkaz z UnderworldsDB.');}}}

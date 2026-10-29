'use strict';
let handPlayer=1;
function openStartingHands(){if(!state.hands)return;handPlayer=state.hands.findIndex(h=>!h.confirmed)+1||1;renderStartingHands();if(!$('startingHands').open)$('startingHands').showModal();}
function renderStartingHands(){const h=state.hands[handPlayer-1];$('handTitle').textContent='Úvodní ruka · '+state.players[handPlayer-1];for(const n of [1,2]){$('handPlayer'+n).textContent=state.players[n-1]+(state.hands[n-1].confirmed?' ✓':'');$('handPlayer'+n).setAttribute('aria-pressed',n===handPlayer);}
 for(const type of ['objective','power']){const box=$(type+'Hand');box.replaceChildren();for(const id of h[type]){const card=deckCatalog[id],b=document.createElement('button'),img=document.createElement('img'),label=document.createElement('span');b.type='button';b.className='opening-card';img.src=card.image;img.alt=card.name;img.onerror=()=>{img.hidden=true;};label.textContent=id+' · '+card.name;b.append(img,label);b.onclick=()=>previewDeckCard(id);box.append(b);}}
 for(const type of ['Objective','Power']){$('redraw'+type).checked=false;$('redraw'+type).disabled=h.redrawn||h.confirmed;}
 $('redrawAll').checked=false;$('redrawAll').disabled=h.redrawn||h.confirmed;$('performRedraw').disabled=true;$('confirmHand').disabled=h.confirmed;$('handStatus').textContent=h.confirmed?'Úvodní ruka potvrzena.':h.redrawn?'Výměna využita. Potvrď úvodní ruku.':'Můžeš ponechat ruku nebo jednou vyměnit celé Objective, celé Power či obojí současně.';
 $('finishHands').hidden=!state.hands.every(h=>h.confirmed);$('resumeHands').textContent=state.hands.every(h=>h.confirmed)?'Prohlédnout úvodní ruce':'Pokračovat v přípravě úvodních rukou';}
for(const n of [1,2])$('handPlayer'+n).onclick=()=>{handPlayer=n;renderStartingHands();};
for(const type of ['Objective','Power'])$('redraw'+type).onchange=()=>{$('redrawAll').checked=$('redrawObjective').checked&&$('redrawPower').checked;$('performRedraw').disabled=!($('redrawObjective').checked||$('redrawPower').checked);};
$('performRedraw').onclick=()=>{try{WHUHands.redraw(state.hands[handPlayer-1],$('redrawObjective').checked,$('redrawPower').checked);save();renderStartingHands();}catch(e){$('handStatus').textContent=e.message;}};
$('confirmHand').onclick=()=>{state.hands[handPlayer-1].confirmed=true;save();const next=state.hands.findIndex(h=>!h.confirmed);if(next>=0)handPlayer=next+1;renderStartingHands();};
$('finishHands').onclick=()=>{$('startingHands').close();openTerritories();};$('resumeHands').onclick=openStartingHands;
$('startingHands').addEventListener('cancel',e=>{if(!state.hands.every(h=>h.confirmed))e.preventDefault();});

$('redrawAll').onchange=()=>{for(const type of ['Objective','Power'])$('redraw'+type).checked=$('redrawAll').checked;$('performRedraw').disabled=!$('redrawAll').checked;};

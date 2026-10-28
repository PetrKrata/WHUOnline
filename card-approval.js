'use strict';
let pendingCardApproval=null;
function requestOpponentApproval(request){if(pendingCardApproval)return false;const card=deckCatalog[request.id];if(!card)return false;pendingCardApproval=request;const opponent=3-request.player;$('approvalTitle').textContent=state.players[opponent-1]+' · potvrzení karty';$('approvalDescription').textContent=state.players[request.player-1]+' chce použít kartu '+card.name+(request.fighterId?' · '+state.fighters.find(f=>f.id===request.fighterId)?.name:'')+'. Souhlasíš?';$('approvalImage').src=card.image;$('approvalImage').alt=card.name;$('approvalError').textContent='';$('approveCard').textContent=state.players[opponent-1]+' · Potvrdit';$('cardApprovalDialog').showModal();return true;}
function rejectPendingCard(){pendingCardApproval=null;$('cardApprovalDialog').close();}
function approvePendingCard(){const request=pendingCardApproval;if(!request)return;try{request.apply();pendingCardApproval=null;$('cardApprovalDialog').close();if(request.onApproved)request.onApproved();}catch(e){$('approvalError').textContent=e.message;}}
$('approveCard').onclick=approvePendingCard;$('rejectCard').onclick=rejectPendingCard;
$('cardApprovalDialog').addEventListener('cancel',()=>{pendingCardApproval=null;});
$('cardApprovalDialog').addEventListener('close',()=>{pendingCardApproval=null;});

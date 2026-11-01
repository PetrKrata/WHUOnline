import { db, ensureAnonymousAuth } from './firebase.js';
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const params = new URLSearchParams(window.location.search);
const tableId = params.get('table');

const gameTitle = document.getElementById('gameTitle');
const gameRoleBadge = document.getElementById('gameRoleBadge');
const gameConnection = document.getElementById('gameConnection');
const myGameCard = document.getElementById('myGameCard');
const opponentGameCard = document.getElementById('opponentGameCard');
const myGameName = document.getElementById('myGameName');
const myGameWarband = document.getElementById('myGameWarband');
const myGameDecks = document.getElementById('myGameDecks');
const opponentGameName = document.getElementById('opponentGameName');
const opponentGameWarband = document.getElementById('opponentGameWarband');
const opponentGameDecks = document.getElementById('opponentGameDecks');
const gameStageText = document.getElementById('gameStageText');

function showError(message) {
  gameTitle.textContent = 'Hru nelze otevřít';
  gameRoleBadge.textContent = 'Chyba';
  gameConnection.textContent = message;
  myGameCard.hidden = true;
  opponentGameCard.hidden = true;
}

function render(data, user) {
  const isHost = data.hostUid === user.uid;
  const isGuest = data.guestUid === user.uid;
  const isPlayer = isHost || isGuest;

  gameTitle.textContent = `${data.hostNick || 'Hráč 1'} vs. ${data.guestNick || 'Hráč 2'}`;

  if (!data.gameStarted || data.status !== 'playing') {
    gameRoleBadge.textContent = isHost ? 'Hráč 1' : isGuest ? 'Hráč 2' : 'Divák';
    gameConnection.textContent = 'Hra ještě nebyla spuštěna. Vrať se ke stolu a dokonči přípravu.';
    gameStageText.textContent = 'Čekám na spuštění hry hostitelem.';
    return;
  }

  if (isHost) {
    gameRoleBadge.textContent = 'Hráč 1';
    myGameName.textContent = data.hostNick || 'Hráč 1';
    myGameWarband.textContent = data.hostWarband || '—';
    myGameDecks.textContent = data.hostRivalsDecks || '—';
    opponentGameName.textContent = data.guestNick || 'Hráč 2';
    opponentGameWarband.textContent = data.guestWarband || '—';
    opponentGameDecks.textContent = data.guestRivalsDecks || '—';
  } else if (isGuest) {
    gameRoleBadge.textContent = 'Hráč 2';
    myGameName.textContent = data.guestNick || 'Hráč 2';
    myGameWarband.textContent = data.guestWarband || '—';
    myGameDecks.textContent = data.guestRivalsDecks || '—';
    opponentGameName.textContent = data.hostNick || 'Hráč 1';
    opponentGameWarband.textContent = data.hostWarband || '—';
    opponentGameDecks.textContent = data.hostRivalsDecks || '—';
  } else if (data.spectatorsAllowed) {
    gameRoleBadge.textContent = 'Divák';
    myGameCard.querySelector('.role-label').textContent = 'Hráč 1';
    opponentGameCard.querySelector('.role-label').textContent = 'Hráč 2';
    myGameName.textContent = data.hostNick || 'Hráč 1';
    myGameWarband.textContent = data.hostWarband || '—';
    myGameDecks.textContent = data.hostRivalsDecks || '—';
    opponentGameName.textContent = data.guestNick || 'Hráč 2';
    opponentGameWarband.textContent = data.guestWarband || '—';
    opponentGameDecks.textContent = data.guestRivalsDecks || '—';
  } else {
    showError('Nejsi hráčem tohoto stolu a sledování není povoleno.');
    return;
  }

  gameConnection.textContent = isPlayer
    ? 'Připojeno · hra probíhá · stav se synchronizuje přes Firebase.'
    : 'Připojeno jako divák · pouze náhled.';
}

if (!tableId) {
  showError('Chybí identifikátor stolu.');
} else {
  (async function boot() {
    try {
      const user = await ensureAnonymousAuth();
      const tableRef = doc(db, 'tables', tableId);

      onSnapshot(tableRef, snapshot => {
        if (!snapshot.exists()) {
          showError('Tento stůl už neexistuje.');
          return;
        }
        render(snapshot.data(), user);
      }, error => {
        console.error(error);
        showError('Herní stav se nepodařilo načíst z Firestore.');
      });
    } catch (error) {
      console.error(error);
      showError('Připojení k Firebase selhalo.');
    }
  })();
}

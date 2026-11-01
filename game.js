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

function fillPlayerCards(data, isHost, isGuest) {
  myGameCard.hidden = false;
  opponentGameCard.hidden = false;

  if (isHost) {
    gameRoleBadge.textContent = 'Hráč 1';
    myGameName.textContent = data.hostNick || 'Hráč 1';
    myGameWarband.textContent = data.hostWarband || '—';
    myGameDecks.textContent = data.hostRivalsDecks || '—';
    opponentGameName.textContent = data.guestNick || 'Hráč 2';
    opponentGameWarband.textContent = data.guestWarband || '—';
    opponentGameDecks.textContent = data.guestRivalsDecks || '—';
    return;
  }

  if (isGuest) {
    gameRoleBadge.textContent = 'Hráč 2';
    myGameName.textContent = data.guestNick || 'Hráč 2';
    myGameWarband.textContent = data.guestWarband || '—';
    myGameDecks.textContent = data.guestRivalsDecks || '—';
    opponentGameName.textContent = data.hostNick || 'Hráč 1';
    opponentGameWarband.textContent = data.hostWarband || '—';
    opponentGameDecks.textContent = data.hostRivalsDecks || '—';
    return;
  }

  if (data.spectatorsAllowed) {
    gameRoleBadge.textContent = 'Divák';
    myGameCard.querySelector('.role-label').textContent = 'Hráč 1';
    opponentGameCard.querySelector('.role-label').textContent = 'Hráč 2';
    myGameName.textContent = data.hostNick || 'Hráč 1';
    myGameWarband.textContent = data.hostWarband || '—';
    myGameDecks.textContent = data.hostRivalsDecks || '—';
    opponentGameName.textContent = data.guestNick || 'Hráč 2';
    opponentGameWarband.textContent = data.guestWarband || '—';
    opponentGameDecks.textContent = data.guestRivalsDecks || '—';
    return;
  }

  showError('Nejsi hráčem tohoto stolu a sledování není povoleno.');
}

function render(data, user) {
  const isHost = data.hostUid === user.uid;
  const isGuest = data.guestUid === user.uid;
  const isPlayer = isHost || isGuest;

  gameTitle.textContent = `${data.hostNick || 'Hráč 1'} vs. ${data.guestNick || 'Hráč 2'}`;
  fillPlayerCards(data, isHost, isGuest);

  if (!isPlayer && !data.spectatorsAllowed) return;

  if (data.gameStarted === true && data.status === 'playing') {
    gameConnection.textContent = isPlayer
      ? 'Připojeno · hra probíhá · stav se synchronizuje přes Firebase.'
      : 'Připojeno jako divák · pouze náhled.';
    gameStageText.textContent = 'Hra byla spuštěna. Dalším krokem doplníme herní setup, karty a průběh kola.';
  } else {
    gameConnection.textContent = `Připojeno · stůl je ve stavu „${data.status || 'neuvedeno'}“ · hra ještě nebyla spuštěna.`;
    gameStageText.textContent = 'Vrať se ke stolu a spusť hru jako Hráč 1, až budou oba hráči připraveni.';
  }
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

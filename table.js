import { db, ensureAnonymousAuth } from './firebase.js';
import {
  doc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const tableTitle = document.getElementById('tableTitle');
const roleBadge = document.getElementById('roleBadge');
const tableMessage = document.getElementById('tableMessage');
const hostActions = document.getElementById('hostActions');
const endTable = document.getElementById('endTable');
const startGame = document.getElementById('startGame');
const gameStatus = document.getElementById('gameStatus');

const mySetupCard = document.getElementById('mySetupCard');
const myPlayerLabel = document.getElementById('myPlayerLabel');
const myName = document.getElementById('myName');
const myReadyBadge = document.getElementById('myReadyBadge');
const myWarband = document.getElementById('myWarband');
const myDeckUrl = document.getElementById('myDeckUrl');
const mySave = document.getElementById('mySave');
const myReady = document.getElementById('myReady');

const opponentCard = document.getElementById('opponentCard');
const opponentName = document.getElementById('opponentName');
const opponentReadyBadge = document.getElementById('opponentReadyBadge');
const opponentStatus = document.getElementById('opponentStatus');

const params = new URLSearchParams(window.location.search);
const tableId = params.get('table');
const requestedMode = params.get('mode');

let tableRef = null;
let currentUser = null;
let currentData = null;
let role = 'spectator';

function setError(message) {
  tableTitle.textContent = 'Stůl nelze otevřít';
  roleBadge.textContent = 'Chyba';
  tableMessage.textContent = message;
  hostActions.hidden = true;
  startGame.hidden = true;
  mySetupCard.hidden = true;
  opponentCard.hidden = true;
}

function validSetup(warband, deckUrl) {
  const name = warband.trim();
  const url = deckUrl.trim();
  if (name.length < 2) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function renderReadyBadge(el, ready) {
  el.textContent = ready ? 'Připraven' : 'Nepřipraven';
  el.classList.toggle('is-ready', ready);
}

function getMySetup(data) {
  if (role === 'host') {
    return {
      warband: data.hostWarband || '',
      deckUrl: data.hostDeckUrl || '',
      ready: data.hostReady === true
    };
  }
  if (role === 'guest') {
    return {
      warband: data.guestWarband || '',
      deckUrl: data.guestDeckUrl || '',
      ready: data.guestReady === true
    };
  }
  return { warband: '', deckUrl: '', ready: false };
}

function getOpponentReady(data) {
  return role === 'host' ? data.guestReady === true : data.hostReady === true;
}

async function saveSetup() {
  if (!tableRef || !currentUser || !['host', 'guest'].includes(role)) return;

  if (!validSetup(myWarband.value, myDeckUrl.value)) {
    alert('Vyplň warbandu a platný odkaz na Nemesis deck.');
    return;
  }

  const payload = role === 'host'
    ? {
        hostWarband: myWarband.value.trim(),
        hostDeckUrl: myDeckUrl.value.trim(),
        hostReady: false,
        updatedAt: serverTimestamp()
      }
    : {
        guestWarband: myWarband.value.trim(),
        guestDeckUrl: myDeckUrl.value.trim(),
        guestReady: false,
        updatedAt: serverTimestamp()
      };

  try {
    await updateDoc(tableRef, payload);
  } catch (error) {
    console.error(error);
    alert('Výběr se nepodařilo uložit. Zkontroluj Firestore Rules.');
  }
}

async function toggleReady() {
  if (!tableRef || !currentData || !['host', 'guest'].includes(role)) return;

  const mine = getMySetup(currentData);
  if (!validSetup(mine.warband, mine.deckUrl)) {
    alert('Nejdřív ulož warbandu a Nemesis deck.');
    return;
  }

  try {
    await updateDoc(tableRef, role === 'host'
      ? { hostReady: !mine.ready, updatedAt: serverTimestamp() }
      : { guestReady: !mine.ready, updatedAt: serverTimestamp() }
    );
  } catch (error) {
    console.error(error);
    alert('Stav připravenosti se nepodařilo změnit.');
  }
}

mySave.addEventListener('click', saveSetup);
myReady.addEventListener('click', toggleReady);

startGame.addEventListener('click', async () => {
  if (!tableRef || role !== 'host' || !currentData?.hostReady || !currentData?.guestReady) return;
  try {
    await updateDoc(tableRef, {
      gameStarted: true,
      status: 'playing',
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(error);
    alert('Hru se nepodařilo spustit.');
  }
});

endTable.addEventListener('click', async () => {
  if (!tableRef || role !== 'host') return;
  if (!confirm('Opravdu chceš ukončit tento stůl? Bude odstraněn z lobby.')) return;
  try {
    await deleteDoc(tableRef);
    window.location.href = 'index.html';
  } catch (error) {
    console.error(error);
    alert('Stůl se nepodařilo ukončit.');
  }
});

function renderPlayerView(data, isHost, isGuest) {
  const mine = getMySetup(data);
  const opponentReady = getOpponentReady(data);

  mySetupCard.hidden = false;
  opponentCard.hidden = false;

  myPlayerLabel.textContent = isHost ? 'Hráč 1 · můj výběr' : 'Hráč 2 · můj výběr';
  myName.textContent = isHost ? (data.hostNick || '—') : (data.guestNick || '—');
  myWarband.value = mine.warband;
  myDeckUrl.value = mine.deckUrl;
  renderReadyBadge(myReadyBadge, mine.ready);
  myReady.textContent = mine.ready ? 'Zrušit připravenost' : 'Jsem připraven';

  opponentName.textContent = isHost ? (data.guestNick || 'Čeká na hráče') : (data.hostNick || '—');
  renderReadyBadge(opponentReadyBadge, opponentReady);
  opponentStatus.textContent = opponentReady ? 'Protihráč je připraven.' : 'Protihráč zatím není připraven.';

  const editable = !data.gameStarted;
  myWarband.disabled = !editable;
  myDeckUrl.disabled = !editable;
  mySave.hidden = !editable;
  myReady.hidden = !editable;
}

function renderSpectatorView(data) {
  mySetupCard.hidden = true;
  opponentCard.hidden = false;
  opponentName.textContent = `${data.hostNick || 'Hráč 1'} vs. ${data.guestNick || 'Hráč 2'}`;
  const bothReady = data.hostReady === true && data.guestReady === true;
  renderReadyBadge(opponentReadyBadge, bothReady);
  opponentStatus.textContent = bothReady ? 'Oba hráči jsou připraveni.' : 'Příprava hráčů ještě není dokončena.';
}

function render(data) {
  currentData = data;
  tableTitle.textContent = data.guestNick ? `${data.hostNick} vs. ${data.guestNick}` : data.hostNick;

  const isHost = data.hostUid === currentUser.uid;
  const isGuest = data.guestUid === currentUser.uid;
  role = isHost ? 'host' : isGuest ? 'guest' : 'spectator';

  hostActions.hidden = !isHost;
  startGame.hidden = !isHost;

  if (isHost) {
    roleBadge.textContent = 'Hráč 1';
    tableMessage.textContent = data.gameStarted ? 'Hra byla spuštěna.' : 'Vyber svou warbandu a Nemesis deck, ulož je a potvrď připravenost.';
    renderPlayerView(data, true, false);
  } else if (isGuest) {
    roleBadge.textContent = 'Hráč 2';
    tableMessage.textContent = data.gameStarted ? 'Hra byla spuštěna.' : 'Vyber svou warbandu a Nemesis deck, ulož je a potvrď připravenost.';
    renderPlayerView(data, false, true);
  } else if (requestedMode === 'spectator' && data.spectatorsAllowed) {
    roleBadge.textContent = 'Divák';
    tableMessage.textContent = data.gameStarted ? 'Sleduješ probíhající hru.' : 'Sleduješ pouze stav přípravy hráčů.';
    renderSpectatorView(data);
  } else {
    roleBadge.textContent = 'Bez přístupu';
    tableMessage.textContent = 'Nejsi hráčem tohoto stolu a režim Náhled není dostupný.';
    mySetupCard.hidden = true;
    opponentCard.hidden = true;
  }

  const hostIsReady = data.hostReady === true;
  const guestIsReady = data.guestReady === true;

  if (data.gameStarted) {
    gameStatus.textContent = 'Hra probíhá. V dalším kroku sem napojíme vlastní herní plochu.';
    startGame.disabled = true;
    startGame.textContent = 'Hra spuštěna';
  } else if (hostIsReady && guestIsReady) {
    gameStatus.textContent = 'Oba hráči jsou připraveni.';
    startGame.disabled = !isHost;
    startGame.textContent = 'Spustit hru';
  } else {
    gameStatus.textContent = 'Čekám, až budou připraveni oba hráči.';
    startGame.disabled = true;
    startGame.textContent = 'Spustit hru';
  }
}

if (!tableId) {
  setError('Chybí identifikátor stolu. Vrať se do lobby a otevři stůl znovu.');
} else {
  (async function boot() {
    try {
      currentUser = await ensureAnonymousAuth();
      tableRef = doc(db, 'tables', tableId);

      onSnapshot(tableRef, snapshot => {
        if (!snapshot.exists()) {
          setError('Tento stůl už neexistuje.');
          return;
        }
        render(snapshot.data());
      }, error => {
        console.error(error);
        setError('Stůl se nepodařilo načíst z Firestore.');
      });
    } catch (error) {
      console.error(error);
      setError('Připojení k Firebase selhalo.');
    }
  })();
}

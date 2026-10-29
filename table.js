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
const hostName = document.getElementById('hostName');
const guestName = document.getElementById('guestName');
const tableMessage = document.getElementById('tableMessage');
const hostActions = document.getElementById('hostActions');
const endTable = document.getElementById('endTable');
const startGame = document.getElementById('startGame');
const gameStatus = document.getElementById('gameStatus');

const hostWarband = document.getElementById('hostWarband');
const hostDeckUrl = document.getElementById('hostDeckUrl');
const hostSave = document.getElementById('hostSave');
const hostReady = document.getElementById('hostReady');
const hostReadyBadge = document.getElementById('hostReadyBadge');

const guestWarband = document.getElementById('guestWarband');
const guestDeckUrl = document.getElementById('guestDeckUrl');
const guestSave = document.getElementById('guestSave');
const guestReady = document.getElementById('guestReady');
const guestReadyBadge = document.getElementById('guestReadyBadge');

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

function setReadOnly(input, buttonSave, buttonReady, editable) {
  input.disabled = !editable;
  buttonSave.hidden = !editable;
  buttonReady.hidden = !editable;
}

function renderReadyBadge(el, ready) {
  el.textContent = ready ? 'Připraven' : 'Nepřipraven';
  el.classList.toggle('is-ready', ready);
}

async function saveSetup(player) {
  if (!tableRef || !currentUser) return;
  const isHost = player === 'host';
  const warbandInput = isHost ? hostWarband : guestWarband;
  const deckInput = isHost ? hostDeckUrl : guestDeckUrl;

  if (!validSetup(warbandInput.value, deckInput.value)) {
    alert('Vyplň warbandu a platný odkaz na Nemesis deck.');
    return;
  }

  const payload = isHost
    ? {
        hostWarband: warbandInput.value.trim(),
        hostDeckUrl: deckInput.value.trim(),
        hostReady: false,
        updatedAt: serverTimestamp()
      }
    : {
        guestWarband: warbandInput.value.trim(),
        guestDeckUrl: deckInput.value.trim(),
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

async function toggleReady(player) {
  if (!tableRef || !currentData) return;
  const isHost = player === 'host';
  const warband = isHost ? currentData.hostWarband : currentData.guestWarband;
  const deckUrl = isHost ? currentData.hostDeckUrl : currentData.guestDeckUrl;
  const ready = isHost ? currentData.hostReady === true : currentData.guestReady === true;

  if (!validSetup(warband || '', deckUrl || '')) {
    alert('Nejdřív ulož warbandu a Nemesis deck.');
    return;
  }

  try {
    await updateDoc(tableRef, isHost
      ? { hostReady: !ready, updatedAt: serverTimestamp() }
      : { guestReady: !ready, updatedAt: serverTimestamp() }
    );
  } catch (error) {
    console.error(error);
    alert('Stav připravenosti se nepodařilo změnit.');
  }
}

hostSave.addEventListener('click', () => saveSetup('host'));
guestSave.addEventListener('click', () => saveSetup('guest'));
hostReady.addEventListener('click', () => toggleReady('host'));
guestReady.addEventListener('click', () => toggleReady('guest'));

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

function render(data) {
  currentData = data;
  hostName.textContent = data.hostNick || '—';
  guestName.textContent = data.guestNick || 'Čeká na hráče';
  tableTitle.textContent = data.guestNick ? `${data.hostNick} vs. ${data.guestNick}` : data.hostNick;

  const isHost = data.hostUid === currentUser.uid;
  const isGuest = data.guestUid === currentUser.uid;
  role = isHost ? 'host' : isGuest ? 'guest' : 'spectator';

  hostActions.hidden = !isHost;
  startGame.hidden = !isHost;

  hostWarband.value = data.hostWarband || '';
  hostDeckUrl.value = data.hostDeckUrl || '';
  guestWarband.value = data.guestWarband || '';
  guestDeckUrl.value = data.guestDeckUrl || '';

  const hostIsReady = data.hostReady === true;
  const guestIsReady = data.guestReady === true;
  renderReadyBadge(hostReadyBadge, hostIsReady);
  renderReadyBadge(guestReadyBadge, guestIsReady);
  hostReady.textContent = hostIsReady ? 'Zrušit připravenost' : 'Jsem připraven';
  guestReady.textContent = guestIsReady ? 'Zrušit připravenost' : 'Jsem připraven';

  setReadOnly(hostWarband, hostSave, hostReady, isHost && !data.gameStarted);
  hostDeckUrl.disabled = !(isHost && !data.gameStarted);
  setReadOnly(guestWarband, guestSave, guestReady, isGuest && !data.gameStarted);
  guestDeckUrl.disabled = !(isGuest && !data.gameStarted);

  if (isHost) {
    roleBadge.textContent = 'Hráč 1';
    tableMessage.textContent = data.gameStarted ? 'Hra byla spuštěna.' : 'Vyber svou warbandu a Nemesis deck, ulož je a potvrď připravenost.';
  } else if (isGuest) {
    roleBadge.textContent = 'Hráč 2';
    tableMessage.textContent = data.gameStarted ? 'Hra byla spuštěna.' : 'Vyber svou warbandu a Nemesis deck, ulož je a potvrď připravenost.';
  } else if (requestedMode === 'spectator' && data.spectatorsAllowed) {
    roleBadge.textContent = 'Divák';
    tableMessage.textContent = data.gameStarted ? 'Sleduješ probíhající hru.' : 'Sleduješ přípravu hráčů. Údaje jsou pouze ke čtení.';
  } else {
    roleBadge.textContent = 'Bez přístupu';
    tableMessage.textContent = 'Nejsi hráčem tohoto stolu a režim Náhled není dostupný.';
  }

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

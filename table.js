import { db, ensureAnonymousAuth } from './firebase.js';
import {
  doc,
  onSnapshot,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const tableTitle = document.getElementById('tableTitle');
const roleBadge = document.getElementById('roleBadge');
const hostName = document.getElementById('hostName');
const guestName = document.getElementById('guestName');
const tableMessage = document.getElementById('tableMessage');
const hostActions = document.getElementById('hostActions');
const endTable = document.getElementById('endTable');

const params = new URLSearchParams(window.location.search);
const tableId = params.get('table');
const requestedMode = params.get('mode');

let tableRef = null;
let isCurrentUserHost = false;

function setError(message) {
  tableTitle.textContent = 'Stůl nelze otevřít';
  roleBadge.textContent = 'Chyba';
  tableMessage.textContent = message;
  hostActions.hidden = true;
}

endTable.addEventListener('click', async () => {
  if (!tableRef || !isCurrentUserHost) return;
  if (!confirm('Opravdu chceš ukončit tento stůl? Bude odstraněn z lobby.')) return;
  try {
    await deleteDoc(tableRef);
    window.location.href = 'index.html';
  } catch (error) {
    console.error(error);
    alert('Stůl se nepodařilo ukončit.');
  }
});

if (!tableId) {
  setError('Chybí identifikátor stolu. Vrať se do lobby a otevři stůl znovu.');
} else {
  (async function boot() {
    try {
      const user = await ensureAnonymousAuth();
      tableRef = doc(db, 'tables', tableId);

      onSnapshot(tableRef, snapshot => {
        if (!snapshot.exists()) {
          setError('Tento stůl už neexistuje.');
          return;
        }

        const data = snapshot.data();
        hostName.textContent = data.hostNick || '—';
        guestName.textContent = data.guestNick || 'Čeká na hráče';
        tableTitle.textContent = data.guestNick ? `${data.hostNick} vs. ${data.guestNick}` : data.hostNick;

        const isHost = data.hostUid === user.uid;
        const isGuest = data.guestUid === user.uid;
        isCurrentUserHost = isHost;
        hostActions.hidden = !isHost;

        if (isHost) {
          roleBadge.textContent = 'Hráč 1';
          tableMessage.textContent = 'Jsi připojen jako Hráč 1. Herní obrazovku doplníme v dalším kroku.';
        } else if (isGuest) {
          roleBadge.textContent = 'Hráč 2';
          tableMessage.textContent = 'Jsi připojen jako Hráč 2. Herní obrazovku doplníme v dalším kroku.';
        } else if (requestedMode === 'spectator' && data.spectatorsAllowed) {
          roleBadge.textContent = 'Divák';
          tableMessage.textContent = 'Jsi v režimu Náhled. Divák bude mít pouze čtecí přístup k veřejnému stavu hry.';
        } else {
          roleBadge.textContent = 'Bez přístupu';
          tableMessage.textContent = 'Nejsi hráčem tohoto stolu a režim Náhled není dostupný.';
        }
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

import { db, ensureAnonymousAuth } from './firebase.js';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const authStatus = document.getElementById('authStatus');
const lobbyStatus = document.getElementById('lobbyStatus');
const nickInput = document.getElementById('nick');
const saveNick = document.getElementById('saveNick');
const newTable = document.getElementById('newTable');
const tablesEl = document.getElementById('tables');
const emptyState = document.getElementById('emptyState');
const joinDialog = document.getElementById('joinDialog');
const joinText = document.getElementById('joinText');
const confirmJoin = document.getElementById('confirmJoin');

let currentUser = null;
let selectedTable = null;
let nick = localStorage.getItem('whuNick') || '';
nickInput.value = nick;

function validNick(value) {
  return value.trim().length >= 2 && value.trim().length <= 24;
}

function updateControls() {
  nick = nickInput.value.trim();
  newTable.disabled = !(currentUser && validNick(nick));
}

function openTable(tableId, mode) {
  const params = new URLSearchParams({ table: tableId, mode });
  window.location.href = `table.html?${params.toString()}`;
}

saveNick.addEventListener('click', () => {
  const value = nickInput.value.trim();
  if (!validNick(value)) {
    alert('Nick musí mít 2 až 24 znaků.');
    return;
  }
  localStorage.setItem('whuNick', value);
  nick = value;
  updateControls();
});

nickInput.addEventListener('input', updateControls);

newTable.addEventListener('click', async () => {
  if (!currentUser || !validNick(nick)) return;
  newTable.disabled = true;
  try {
    await addDoc(collection(db, 'tables'), {
      hostUid: currentUser.uid,
      hostNick: nick,
      guestUid: null,
      guestNick: null,
      status: 'waiting',
      visibility: 'public',
      spectatorsAllowed: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(error);
    alert('Stůl se nepodařilo vytvořit. Zkontroluj Firestore Rules.');
  } finally {
    updateControls();
  }
});

confirmJoin.addEventListener('click', async event => {
  event.preventDefault();
  if (!selectedTable || !currentUser || !validNick(nick)) return;
  try {
    await updateDoc(doc(db, 'tables', selectedTable.id), {
      guestUid: currentUser.uid,
      guestNick: nick,
      status: 'ready',
      updatedAt: serverTimestamp()
    });
    joinDialog.close();
    const tableId = selectedTable.id;
    selectedTable = null;
    openTable(tableId, 'player');
  } catch (error) {
    console.error(error);
    alert('Ke stolu se nepodařilo připojit.');
  }
});

function renderTable(item) {
  const data = item.data();
  const card = document.createElement('article');
  card.className = 'table-card';

  const info = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = data.guestNick ? `${data.hostNick} vs. ${data.guestNick}` : data.hostNick;
  const meta = document.createElement('div');
  meta.className = 'table-meta';
  meta.textContent = data.status === 'waiting' ? 'Čeká na soupeře' : data.status === 'ready' ? 'Oba hráči připojeni' : data.status;
  info.append(title, meta);

  const actions = document.createElement('div');
  actions.className = 'table-actions';

  const isHost = data.hostUid === currentUser?.uid;
  const isGuest = data.guestUid === currentUser?.uid;
  const isPlayer = isHost || isGuest;

  if (data.status === 'waiting' && !isHost) {
    const join = document.createElement('button');
    join.textContent = '+ Připojit';
    join.addEventListener('click', () => {
      selectedTable = item;
      joinText.textContent = `Připojit se ke stolu hráče ${data.hostNick}?`;
      joinDialog.showModal();
    });
    actions.append(join);
  }

  if (isPlayer && data.status === 'ready') {
    const enter = document.createElement('button');
    enter.className = 'primary';
    enter.textContent = 'Vstoupit ke stolu';
    enter.addEventListener('click', () => openTable(item.id, 'player'));
    actions.append(enter);
  }

  if (!isPlayer) {
    const preview = document.createElement('button');
    preview.textContent = 'Náhled';
    preview.disabled = !data.spectatorsAllowed;
    preview.addEventListener('click', () => openTable(item.id, 'spectator'));
    actions.append(preview);
  }

  card.append(info, actions);
  return card;
}

function startLobby() {
  const q = query(collection(db, 'tables'), orderBy('createdAt', 'desc'), limit(30));
  return onSnapshot(q, snapshot => {
    tablesEl.replaceChildren();
    snapshot.docs.forEach(item => tablesEl.append(renderTable(item)));
    emptyState.hidden = snapshot.size > 0;
    lobbyStatus.textContent = `${snapshot.size} ${snapshot.size === 1 ? 'stůl' : 'stolů'}`;
  }, error => {
    console.error(error);
    lobbyStatus.textContent = 'Firestore zatím nepovoluje čtení';
  });
}

(async function boot() {
  try {
    currentUser = await ensureAnonymousAuth();
    authStatus.textContent = 'Firebase připojen · anonymní hráč';
    updateControls();
    startLobby();
  } catch (error) {
    console.error(error);
    authStatus.textContent = 'Firebase připojení selhalo';
  }
})();

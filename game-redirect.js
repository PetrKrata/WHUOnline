import { db, ensureAnonymousAuth } from './firebase.js';
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

const params = new URLSearchParams(window.location.search);
const tableId = params.get('table');

if (tableId) {
  (async function watchGameStart() {
    try {
      const user = await ensureAnonymousAuth();
      const tableRef = doc(db, 'tables', tableId);

      onSnapshot(tableRef, snapshot => {
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        const isPlayer = data.hostUid === user.uid || data.guestUid === user.uid;
        if (isPlayer && data.gameStarted === true && data.status === 'playing') {
          window.location.replace(`game.html?table=${encodeURIComponent(tableId)}`);
        }
      });
    } catch (error) {
      console.error('Game redirect watcher failed:', error);
    }
  })();
}

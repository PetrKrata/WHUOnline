import { db } from './firebase.js';
import { doc, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

// Same four plans and dice ranking used in the existing offline version.
export const BOARDS = Object.freeze({
  verdant: { title: 'The Verdant Maw', image: 'assets/board.jpg' },
  whispering: { title: 'Whispering Root-Hollow', image: 'assets/whispering_root_hollow.jpg' },
  blazing: { title: 'The Blazing Bastion', image: 'assets/the_blazing_bastion.jpg' },
  haven: { title: 'Haven of the Hated', image: 'assets/haven_of_the_hated.jpg' }
});
export const ATTACK_FACES = ['💥', '⚒', '⚒', '⚔', '◐', '●'];
const RANK = { '💥': 4, '⚔': 3, '⚒': 2, '●': 1, '◐': 0 };
export const DICE_LABELS = { '💥': 'Kritický úspěch', '⚒': 'Kladivo', '⚔': 'Meče', '◐': 'Jedna podpora', '●': 'Dvě podpory' };
export const BOARD_ASSET_ROOT = 'https://raw.githubusercontent.com/PetrKrata/WHUOnline/main/';

export function rollOutcome(data) {
  const a = data?.hostBoardRoll || '';
  const b = data?.guestBoardRoll || '';
  if (!a || !b) return { status: 'waiting', winner: null };
  const difference = RANK[a] - RANK[b];
  if (difference === 0) return { status: 'tie', winner: null };
  return { status: 'winner', winner: difference > 0 ? 'host' : 'guest' };
}

function randomFace() {
  const values = new Uint32Array(1);
  do { crypto.getRandomValues(values); } while (values[0] >= 4294967292);
  return ATTACK_FACES[values[0] % 6];
}
function refOf(tableId) { return doc(db, 'tables', tableId); }

export async function rollForBoard(tableId, role) {
  if (!['host', 'guest'].includes(role)) throw new Error('Hodit může jen hráč.');
  const field = role === 'host' ? 'hostBoardRoll' : 'guestBoardRoll';
  const face = randomFace();
  await runTransaction(db, async transaction => {
    const ref = refOf(tableId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Stůl už neexistuje.');
    const data = snap.data();
    if (data.gamePhase !== 'boards' || data[field] || rollOutcome(data).status === 'tie' ||
      data.hostPhaseReady === true || data.guestPhaseReady === true) {
      throw new Error('Nyní nelze házet. Zkontroluj stav stolu.');
    }
    transaction.update(ref, { [field]: face, updatedAt: serverTimestamp() });
  });
}

export async function rerollBoardTie(tableId) {
  await runTransaction(db, async transaction => {
    const ref = refOf(tableId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Stůl už neexistuje.');
    const data = snap.data();
    if (data.gamePhase !== 'boards' || rollOutcome(data).status !== 'tie') throw new Error('Hod není nerozhodný.');
    transaction.update(ref, {
      hostBoardRoll: '', guestBoardRoll: '',
      updatedAt: serverTimestamp()
    });
  });
}

export async function selectBoard(tableId, role, key, orientation, side) {
  if (!BOARDS[key] || !['landscape', 'portrait'].includes(orientation) || !['top', 'bottom'].includes(side)) {
    throw new Error('Vyber herní plán, orientaci a území.');
  }
  await runTransaction(db, async transaction => {
    const ref = refOf(tableId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Stůl už neexistuje.');
    const data = snap.data();
    if (data.gamePhase !== 'boards' || rollOutcome(data).winner !== role ||
      data.hostPhaseReady === true || data.guestPhaseReady === true) {
      throw new Error('Plán může upravit pouze vítěz hodu před potvrzením.');
    }
    transaction.update(ref, {
      boardChoice: key, boardOrientation: orientation, boardWinnerSide: side,
      updatedAt: serverTimestamp()
    });
  });
}

export function boardSelectionComplete(data) {
  return rollOutcome(data).status === 'winner' &&
    Boolean(BOARDS[data?.boardChoice]) &&
    ['landscape', 'portrait'].includes(data?.boardOrientation) &&
    ['top', 'bottom'].includes(data?.boardWinnerSide);
}

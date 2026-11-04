import { db } from './firebase.js';
import { doc, runTransaction, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

export const GAME_PHASES = [
  { id: 'opening', title: 'Úvodní ruka', detail: 'Rozdej 3 Objective a 5 Power, případně využij mulligan a potvrď ruku.' },
  { id: 'boards', title: 'Herní plány', detail: 'Připravit výběr a orientaci herních plánů. Interaktivní pokládání doplníme později.' },
  { id: 'tokens', title: 'Žetony', detail: 'Připravit rozmístění žetonů a dalších prvků podle pravidel. Interaktivní rozmístění připravujeme.' },
  { id: 'deployment', title: 'Nasazení bojovníků', detail: 'Připravit nasazení jednotlivých bojovníků na herní plán. Zatím jen potvrzení fáze.' },
  { id: 'first-turn', title: 'Určení prvního hráče', detail: 'Připravit hod o první tah a vyznačení začínajícího hráče. Zatím jen potvrzení fáze.' },
  { id: 'round-one', title: 'První kolo', detail: 'Příprava dokončena; herní tahy a aktivace budeme implementovat jako další část.' }
];

export function normalizedGamePhase(data) {
  const name = data?.gamePhase || 'opening';
  return GAME_PHASES.some(phase => phase.id === name) ? name : 'opening';
}

export function nextGamePhase(phase) {
  const i = GAME_PHASES.findIndex(item => item.id === phase);
  return i < 0 || i >= GAME_PHASES.length - 1 ? null : GAME_PHASES[i + 1].id;
}

function tableRef(tableId) {
  return doc(db, 'tables', tableId);
}

export async function confirmPhase(tableId, role, phase) {
  if (!['host', 'guest'].includes(role) || !nextGamePhase(phase)) throw new Error('Fázi nyní nelze potvrdit.');
  const field = role === 'host' ? 'hostPhaseReady' : 'guestPhaseReady';
  const snapshot = await runTransaction(db, async transaction => {
    const ref = tableRef(tableId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) throw new Error('Stůl už neexistuje.');
    const data = snap.data();
    if (!data.gameStarted || data.status !== 'playing' || normalizedGamePhase(data) !== phase) {
      throw new Error('Fáze se mezitím změnila. Obnov stav hry.');
    }
    if (data[field] !== true) transaction.update(ref, { [field]: true, updatedAt: serverTimestamp() });
    return data;
  });
  return snapshot;
}

export async function advancePhaseIfReady(tableId, phase) {
  const next = nextGamePhase(phase);
  if (!next) return false;
  return runTransaction(db, async transaction => {
    const ref = tableRef(tableId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) return false;
    const data = snap.data();
    if (data.status !== 'playing' || data.gameStarted !== true ||
      normalizedGamePhase(data) !== phase ||
      data.hostPhaseReady !== true || data.guestPhaseReady !== true) return false;
    transaction.update(ref, {
      gamePhase: next,
      hostPhaseReady: false,
      guestPhaseReady: false,
      updatedAt: serverTimestamp()
    });
    return true;
  });
}

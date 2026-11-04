import { db } from './firebase.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

function shuffled(ids) {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function handRef(tableId, uid) {
  return doc(db, 'tables', tableId, 'private', uid);
}

export async function ensureOpeningHand(tableId, uid, deck) {
  const ref = handRef(tableId, uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return existing.data();

  const objectiveIds = shuffled(deck.groups.objectives.map(card => card.id));
  const powerIds = shuffled([
    ...deck.groups.ploys.map(card => card.id),
    ...deck.groups.upgrades.map(card => card.id)
  ]);

  if (objectiveIds.length < 3 || powerIds.length < 5) {
    throw new Error('Balíček neobsahuje dost karet pro úvodní ruku 3 Objective + 5 Power.');
  }

  const data = {
    objectiveHandIds: objectiveIds.slice(0, 3),
    objectiveDeckIds: objectiveIds.slice(3),
    powerHandIds: powerIds.slice(0, 5),
    powerDeckIds: powerIds.slice(5),
    objectiveMulliganUsed: false,
    powerMulliganUsed: false,
    openingConfirmed: false,
    initializedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(ref, data);
  return data;
}

export function watchOpeningHand(tableId, uid, onData, onError) {
  return onSnapshot(handRef(tableId, uid), snapshot => {
    if (snapshot.exists()) onData(snapshot.data());
  }, onError);
}

export async function mulliganObjectives(tableId, uid, state) {
  if (state.objectiveMulliganUsed || state.openingConfirmed) return;
  const drawPile = shuffled(state.objectiveDeckIds || []);
  if (drawPile.length < 3) return;
  const newHand = drawPile.slice(0, 3);
  const newDeck = shuffled([...drawPile.slice(3), ...(state.objectiveHandIds || [])]);
  await updateDoc(handRef(tableId, uid), {
    objectiveHandIds: newHand,
    objectiveDeckIds: newDeck,
    objectiveMulliganUsed: true,
    updatedAt: serverTimestamp()
  });
}

export async function mulliganPower(tableId, uid, state) {
  if (state.powerMulliganUsed || state.openingConfirmed) return;
  const drawPile = shuffled(state.powerDeckIds || []);
  if (drawPile.length < 5) return;
  const newHand = drawPile.slice(0, 5);
  const newDeck = shuffled([...drawPile.slice(5), ...(state.powerHandIds || [])]);
  await updateDoc(handRef(tableId, uid), {
    powerHandIds: newHand,
    powerDeckIds: newDeck,
    powerMulliganUsed: true,
    updatedAt: serverTimestamp()
  });
}

export async function confirmOpeningHand(tableId, uid) {
  const ref = handRef(tableId, uid);
  await updateDoc(ref, { openingConfirmed: true, updatedAt: serverTimestamp() });
}

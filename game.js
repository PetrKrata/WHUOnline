import { db, ensureAnonymousAuth } from './firebase.js';
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { loadDeck } from './online-deck.js';
import { GAME_PHASES, normalizedGamePhase, nextGamePhase, confirmPhase, advancePhaseIfReady } from './online-phases.js';
import {
  ensureOpeningHand,
  watchOpeningHand,
  mulliganObjectives,
  mulliganPower,
  confirmOpeningHand
} from './online-hand.js';

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

const openingHandSection = document.getElementById('openingHandSection');
const openingHandStatus = document.getElementById('openingHandStatus');
const objectiveHandCards = document.getElementById('objectiveHandCards');
const powerHandCards = document.getElementById('powerHandCards');
const mulliganObjectivesButton = document.getElementById('mulliganObjectives');
const mulliganPowerButton = document.getElementById('mulliganPower');

const keepOpeningHandButton = document.getElementById('keepOpeningHand');
const continueOpeningHandButton = document.getElementById('continueOpeningHand');
const openingActionHint = document.getElementById('openingActionHint');
const nextPhaseSection = document.getElementById('nextPhaseSection');
const currentPhaseTitle = document.getElementById('currentPhaseTitle');
const currentPhaseStatus = document.getElementById('currentPhaseStatus');
const currentPhaseDescription = document.getElementById('currentPhaseDescription');
const confirmGamePhaseButton = document.getElementById('confirmGamePhase');
const phaseWaitingText = document.getElementById('phaseWaitingText');
const phaseRoadmap = document.getElementById('phaseRoadmap');

const myDeckSection = document.getElementById('myDeckSection');
const myDeckStatus = document.getElementById('myDeckStatus');
const objectiveCards = document.getElementById('objectiveCards');
const ployCards = document.getElementById('ployCards');
const upgradeCards = document.getElementById('upgradeCards');
const objectiveCount = document.getElementById('objectiveCount');
const ployCount = document.getElementById('ployCount');
const upgradeCount = document.getElementById('upgradeCount');

let loadedDeckUrl = '';
let currentDeck = null;
let currentUser = null;
let currentHand = null;
let handWatcherStarted = false;
let gameIsActive = false;
let currentRole = 'spectator';
let currentTableData = null;
let phaseAdvanceInFlight = false;

function showError(message) {
  gameTitle.textContent = 'Hru nelze otevřít';
  gameRoleBadge.textContent = 'Chyba';
  gameConnection.textContent = message;
  myGameCard.hidden = true;
  opponentGameCard.hidden = true;
  openingHandSection.hidden = true;
  nextPhaseSection.hidden = true;
  myDeckSection.hidden = true;
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
    return data.hostDeckUrl || '';
  }

  if (isGuest) {
    gameRoleBadge.textContent = 'Hráč 2';
    myGameName.textContent = data.guestNick || 'Hráč 2';
    myGameWarband.textContent = data.guestWarband || '—';
    myGameDecks.textContent = data.guestRivalsDecks || '—';
    opponentGameName.textContent = data.hostNick || 'Hráč 1';
    opponentGameWarband.textContent = data.hostWarband || '—';
    opponentGameDecks.textContent = data.hostRivalsDecks || '—';
    return data.guestDeckUrl || '';
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
    return '';
  }

  showError('Nejsi hráčem tohoto stolu a sledování není povoleno.');
  return '';
}

function makeCardRow(card) {
  const item = document.createElement('article');
  item.className = 'private-card-row';

  const text = document.createElement('div');
  const code = document.createElement('span');
  code.className = 'private-card-code';
  code.textContent = card.id;
  const name = document.createElement('strong');
  name.textContent = card.name;
  text.append(code, name);

  const link = document.createElement('a');
  link.href = card.image;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Karta ↗';
  link.className = 'private-card-link';

  item.append(text, link);
  return item;
}

function makeHandCard(card) {
  const item = document.createElement('article');
  item.className = 'opening-hand-card';

  const image = document.createElement('img');
  image.src = card.image;
  image.alt = card.name;
  image.loading = 'lazy';

  const meta = document.createElement('div');
  const code = document.createElement('span');
  code.className = 'private-card-code';
  code.textContent = `${card.id} · ${card.type}`;
  const name = document.createElement('strong');
  name.textContent = card.name;
  meta.append(code, name);

  item.append(image, meta);
  return item;
}

function renderDeckGroup(container, cards) {
  container.replaceChildren();
  if (!cards.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'Žádné karty';
    container.append(empty);
    return;
  }
  for (const card of cards) container.append(makeCardRow(card));
}

function cardById(id) {
  return currentDeck?.cards.find(card => card.id === id) || null;
}

function renderOpeningHand(state) {
  currentHand = state;
  openingHandSection.hidden = !gameIsActive || normalizedGamePhase(currentTableData) !== 'opening';

  const objectiveHand = (state.objectiveHandIds || []).map(cardById).filter(Boolean);
  const powerHand = (state.powerHandIds || []).map(cardById).filter(Boolean);

  objectiveHandCards.replaceChildren(...objectiveHand.map(makeHandCard));
  powerHandCards.replaceChildren(...powerHand.map(makeHandCard));

  const confirmed = state.openingConfirmed === true;
  mulliganObjectivesButton.disabled = state.objectiveMulliganUsed === true || confirmed || normalizedGamePhase(currentTableData) !== 'opening';
  mulliganPowerButton.disabled = state.powerMulliganUsed === true || confirmed || normalizedGamePhase(currentTableData) !== 'opening';
  keepOpeningHandButton.disabled = confirmed;
  keepOpeningHandButton.textContent = confirmed ? 'Ruka potvrzena' : 'Nic neměnit';
  continueOpeningHandButton.disabled = !confirmed || isMyPhaseReady() || normalizedGamePhase(currentTableData) !== 'opening';
  openingActionHint.textContent = !confirmed
    ? 'Pokud nechceš nic měnit, klikni Nic neměnit. Po výměně můžeš také potvrdit ruku.'
    : isMyPhaseReady() ? 'Čekám na potvrzení protihráče.' : 'Ruka je potvrzena. Můžeš pokračovat.';
  mulliganObjectivesButton.textContent = state.objectiveMulliganUsed ? 'Objectives vyměněny' : 'Vyměnit Objectives';
  mulliganPowerButton.textContent = state.powerMulliganUsed ? 'Power vyměněny' : 'Vyměnit Power';

  const notes = [];
  if (state.objectiveMulliganUsed) notes.push('Objective mulligan použit');
  if (state.powerMulliganUsed) notes.push('Power mulligan použit');
  openingHandStatus.textContent = confirmed
    ? 'Úvodní ruka potvrzena'
    : notes.length ? notes.join(' · ') : '3 Objective + 5 Power · můžeš vyměnit část ruky nebo ji potvrdit';
}

async function prepareOpeningHand(deck) {
  if (!gameIsActive || !currentUser || handWatcherStarted) return;
  handWatcherStarted = true;
  openingHandSection.hidden = false;
  openingHandStatus.textContent = 'Připravuji úvodní ruku…';

  try {
    await ensureOpeningHand(tableId, currentUser.uid, deck);
    watchOpeningHand(tableId, currentUser.uid, renderOpeningHand, error => {
      console.error(error);
      openingHandStatus.textContent = 'Soukromou ruku se nepodařilo načíst.';
    });
  } catch (error) {
    console.error(error);
    openingHandStatus.textContent = error.message || 'Úvodní ruku se nepodařilo připravit.';
  }
}

mulliganObjectivesButton.addEventListener('click', async () => {
  if (!currentUser || !currentHand || currentHand.objectiveMulliganUsed || currentHand.openingConfirmed || normalizedGamePhase(currentTableData) !== 'opening') return;
  mulliganObjectivesButton.disabled = true;
  try {
    await mulliganObjectives(tableId, currentUser.uid, currentHand);
  } catch (error) {
    console.error(error);
    openingHandStatus.textContent = 'Objective mulligan se nepodařil.';
    mulliganObjectivesButton.disabled = false;
  }
});

mulliganPowerButton.addEventListener('click', async () => {
  if (!currentUser || !currentHand || currentHand.powerMulliganUsed || currentHand.openingConfirmed || normalizedGamePhase(currentTableData) !== 'opening') return;
  mulliganPowerButton.disabled = true;
  try {
    await mulliganPower(tableId, currentUser.uid, currentHand);
  } catch (error) {
    console.error(error);
    openingHandStatus.textContent = 'Power mulligan se nepodařil.';
    mulliganPowerButton.disabled = false;
  }
});

function isMyPhaseReady() {
  if (currentRole === 'host') return currentTableData?.hostPhaseReady === true;
  if (currentRole === 'guest') return currentTableData?.guestPhaseReady === true;
  return false;
}

async function commitOpeningDecision() {
  if (!currentUser || !currentHand || !gameIsActive || normalizedGamePhase(currentTableData) !== 'opening') return;
  keepOpeningHandButton.disabled = true;
  try {
    await confirmOpeningHand(tableId, currentUser.uid);
  } catch (error) {
    console.error(error);
    openingActionHint.textContent = 'Potvrzení ruky se nezdařilo.';
    keepOpeningHandButton.disabled = false;
  }
}

keepOpeningHandButton.addEventListener('click', commitOpeningDecision);

continueOpeningHandButton.addEventListener('click', async () => {
  if (!currentHand?.openingConfirmed || isMyPhaseReady() || normalizedGamePhase(currentTableData) !== 'opening') return;
  continueOpeningHandButton.disabled = true;
  try {
    await confirmPhase(tableId, currentRole, 'opening');
  } catch (error) {
    console.error(error);
    openingActionHint.textContent = error.message || 'Nepodařilo se pokračovat.';
    continueOpeningHandButton.disabled = false;
  }
});

confirmGamePhaseButton.addEventListener('click', async () => {
  const phase = normalizedGamePhase(currentTableData);
  if (phase === 'opening' || !nextGamePhase(phase) || isMyPhaseReady()) return;
  confirmGamePhaseButton.disabled = true;
  try {
    await confirmPhase(tableId, currentRole, phase);
  } catch (error) {
    console.error(error);
    phaseWaitingText.textContent = error.message || 'Potvrzení se nezdařilo.';
    confirmGamePhaseButton.disabled = false;
  }
});

function renderGamePhase(data, isPlayer) {
  const phase = normalizedGamePhase(data);
  const bothConfirmed = data.hostPhaseReady === true && data.guestPhaseReady === true;
  const myConfirmed = isMyPhaseReady();
  const current = GAME_PHASES.find(item => item.id === phase);
  openingHandSection.hidden = !isPlayer || !gameIsActive || phase !== 'opening';
  nextPhaseSection.hidden = !gameIsActive || phase === 'opening';

  if (phase !== 'opening' && gameIsActive) {
    currentPhaseTitle.textContent = current.title;
    currentPhaseDescription.textContent = current.detail;
    const next = nextGamePhase(phase);
    currentPhaseStatus.textContent = next ? 'Příprava další fáze' : 'Připraveno pro implementaci herních tahů';
    confirmGamePhaseButton.hidden = !isPlayer || !next;
    confirmGamePhaseButton.disabled = !isPlayer || myConfirmed || !next;
    confirmGamePhaseButton.textContent = myConfirmed ? 'Potvrzeno' : 'Potvrdit fázi a pokračovat';
    phaseWaitingText.textContent = !next
      ? 'Další krok bude interaktivní herní plocha.'
      : myConfirmed ? 'Čekám na potvrzení protihráče.' : 'Až budou připraveni oba hráči, přejdeme dále.';
    phaseRoadmap.replaceChildren();
    GAME_PHASES.forEach(item => {
      const li = document.createElement('li');
      const currentIndex = GAME_PHASES.findIndex(p => p.id === phase);
      const itemIndex = GAME_PHASES.findIndex(p => p.id === item.id);
      li.textContent = item.title + (itemIndex < currentIndex ? ' ✓' : itemIndex === currentIndex ? ' · nyní' : '');
      if (itemIndex === currentIndex) li.className = 'is-current';
      phaseRoadmap.append(li);
    });
  }

  if (isPlayer && currentHand && phase === 'opening') renderOpeningHand(currentHand);

  if (bothConfirmed && isPlayer && gameIsActive && nextGamePhase(phase) && !phaseAdvanceInFlight) {
    phaseAdvanceInFlight = true;
    advancePhaseIfReady(tableId, phase)
      .catch(error => console.error('Přechod mezi fázemi:', error))
      .finally(() => { phaseAdvanceInFlight = false; });
  }
}

async function renderPrivateDeck(deckUrl) {
  if (!deckUrl) {
    myDeckSection.hidden = false;
    myDeckStatus.textContent = 'Chybí odkaz na balíček.';
    objectiveCards.replaceChildren();
    ployCards.replaceChildren();
    upgradeCards.replaceChildren();
    objectiveCount.textContent = '0';
    ployCount.textContent = '0';
    upgradeCount.textContent = '0';
    return;
  }

  if (deckUrl === loadedDeckUrl && currentDeck) {
    if (gameIsActive) prepareOpeningHand(currentDeck);
    return;
  }

  loadedDeckUrl = deckUrl;
  myDeckSection.hidden = false;
  myDeckStatus.textContent = 'Načítám karty…';

  try {
    const deck = await loadDeck(deckUrl);
    currentDeck = deck;
    objectiveCount.textContent = String(deck.groups.objectives.length);
    ployCount.textContent = String(deck.groups.ploys.length);
    upgradeCount.textContent = String(deck.groups.upgrades.length);
    renderDeckGroup(objectiveCards, deck.groups.objectives);
    renderDeckGroup(ployCards, deck.groups.ploys);
    renderDeckGroup(upgradeCards, deck.groups.upgrades);

    myDeckStatus.textContent = deck.unknown.length
      ? `${deck.cards.length}/${deck.ids.length} karet načteno · neznámé: ${deck.unknown.join(', ')}`
      : `${deck.ids.length} karet načteno · ${deck.format}`;

    if (gameIsActive) prepareOpeningHand(deck);
  } catch (error) {
    console.error(error);
    myDeckStatus.textContent = error.message || 'Balíček se nepodařilo načíst.';
  }
}

function render(data, user) {
  const isHost = data.hostUid === user.uid;
  const isGuest = data.guestUid === user.uid;
  const isPlayer = isHost || isGuest;
  gameIsActive = data.gameStarted === true && data.status === 'playing';
  currentTableData = data;
  currentRole = isHost ? 'host' : isGuest ? 'guest' : 'spectator';

  gameTitle.textContent = `${data.hostNick || 'Hráč 1'} vs. ${data.guestNick || 'Hráč 2'}`;
  const myDeckUrl = fillPlayerCards(data, isHost, isGuest);

  if (!isPlayer && !data.spectatorsAllowed) return;

  if (isPlayer) {
    renderPrivateDeck(myDeckUrl);
  } else {
    openingHandSection.hidden = true;
    myDeckSection.hidden = true;
  }

  renderGamePhase(data, isPlayer);

  if (gameIsActive) {
    gameConnection.textContent = isPlayer
      ? 'Připojeno · hra probíhá · stav se synchronizuje přes Firebase.'
      : 'Připojeno jako divák · pouze náhled.';
    gameStageText.textContent = normalizedGamePhase(data) === 'opening'
      ? 'Oba hráči potvrdí úvodní ruku a kliknou Pokračovat.'
      : 'Společná příprava: ' + (GAME_PHASES.find(p => p.id === normalizedGamePhase(data))?.title || 'další fáze') + '. Interaktivní herní plán a tahy ještě připravujeme.';
  } else {
    openingHandSection.hidden = true;
    nextPhaseSection.hidden = true;
    gameConnection.textContent = `Připojeno · stůl je ve stavu „${data.status || 'neuvedeno'}“ · hra ještě nebyla spuštěna.`;
    gameStageText.textContent = 'Vrať se ke stolu a spusť hru, až budou oba hráči připraveni.';
  }
}

if (!tableId) {
  showError('Chybí identifikátor stolu.');
} else {
  (async function boot() {
    try {
      currentUser = await ensureAnonymousAuth();
      const tableRef = doc(db, 'tables', tableId);

      onSnapshot(tableRef, snapshot => {
        if (!snapshot.exists()) {
          showError('Tento stůl už neexistuje.');
          return;
        }
        render(snapshot.data(), currentUser);
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

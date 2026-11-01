import { db, ensureAnonymousAuth } from './firebase.js';
import { doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { loadDeck } from './online-deck.js';

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

const myDeckSection = document.getElementById('myDeckSection');
const myDeckStatus = document.getElementById('myDeckStatus');
const objectiveCards = document.getElementById('objectiveCards');
const ployCards = document.getElementById('ployCards');
const upgradeCards = document.getElementById('upgradeCards');
const objectiveCount = document.getElementById('objectiveCount');
const ployCount = document.getElementById('ployCount');
const upgradeCount = document.getElementById('upgradeCount');

let loadedDeckUrl = '';

function showError(message) {
  gameTitle.textContent = 'Hru nelze otevřít';
  gameRoleBadge.textContent = 'Chyba';
  gameConnection.textContent = message;
  myGameCard.hidden = true;
  opponentGameCard.hidden = true;
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

  if (deckUrl === loadedDeckUrl) return;
  loadedDeckUrl = deckUrl;
  myDeckSection.hidden = false;
  myDeckStatus.textContent = 'Načítám karty…';

  try {
    const deck = await loadDeck(deckUrl);
    objectiveCount.textContent = String(deck.groups.objectives.length);
    ployCount.textContent = String(deck.groups.ploys.length);
    upgradeCount.textContent = String(deck.groups.upgrades.length);
    renderDeckGroup(objectiveCards, deck.groups.objectives);
    renderDeckGroup(ployCards, deck.groups.ploys);
    renderDeckGroup(upgradeCards, deck.groups.upgrades);

    if (deck.unknown.length) {
      myDeckStatus.textContent = `${deck.cards.length}/${deck.ids.length} karet načteno · neznámé: ${deck.unknown.join(', ')}`;
    } else {
      myDeckStatus.textContent = `${deck.ids.length} karet načteno · ${deck.format}`;
    }
  } catch (error) {
    console.error(error);
    myDeckStatus.textContent = error.message || 'Balíček se nepodařilo načíst.';
  }
}

function render(data, user) {
  const isHost = data.hostUid === user.uid;
  const isGuest = data.guestUid === user.uid;
  const isPlayer = isHost || isGuest;

  gameTitle.textContent = `${data.hostNick || 'Hráč 1'} vs. ${data.guestNick || 'Hráč 2'}`;
  const myDeckUrl = fillPlayerCards(data, isHost, isGuest);

  if (!isPlayer && !data.spectatorsAllowed) return;

  if (isPlayer) {
    renderPrivateDeck(myDeckUrl);
  } else {
    myDeckSection.hidden = true;
  }

  if (data.gameStarted === true && data.status === 'playing') {
    gameConnection.textContent = isPlayer
      ? 'Připojeno · hra probíhá · stav se synchronizuje přes Firebase.'
      : 'Připojeno jako divák · pouze náhled.';
    gameStageText.textContent = 'Hra byla spuštěna. Můj Nemesis balíček je načtený; dalším krokem připravíme úvodní ruku.';
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

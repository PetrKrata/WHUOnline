const CARD_CATALOG_URL = 'https://raw.githubusercontent.com/PetrKrata/WHUOnline/main/cards.json';

let catalogPromise = null;

export async function loadCardCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(CARD_CATALOG_URL, { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`Katalog karet se nepodařilo načíst (${response.status}).`);
        return response.json();
      });
  }
  return catalogPromise;
}

export function parseDeckLink(text) {
  let url;
  try {
    url = new URL(String(text || '').trim());
  } catch {
    throw new Error('Nemesis deck nemá platný UnderworldsDB odkaz.');
  }

  if (
    url.protocol !== 'https:' ||
    !['underworldsdb.com', 'www.underworldsdb.com'].includes(url.hostname) ||
    url.pathname !== '/shared.php'
  ) {
    throw new Error('Použij sdílený odkaz z UnderworldsDB /shared.php.');
  }

  const raw = url.searchParams.get('deck');
  if (!raw) throw new Error('Odkaz neobsahuje seznam karet.');

  const ids = raw
    .split(',')
    .map(value => value.trim().toUpperCase())
    .filter(value => value && value !== '0');

  if (!ids.length || ids.some(id => !/^[A-Z]+\d+$/.test(id))) {
    throw new Error('Seznam karet v odkazu není platný.');
  }

  return {
    source: url.href,
    name: (url.searchParams.get('deckname') || 'Nemesis deck').slice(0, 120),
    format: (url.searchParams.get('format') || 'nemesis').slice(0, 40),
    ids
  };
}

export async function loadDeck(text) {
  const deck = parseDeckLink(text);
  const catalog = await loadCardCatalog();
  const unknown = deck.ids.filter(id => !Object.hasOwn(catalog, id));
  const cards = deck.ids.map(id => catalog[id]).filter(Boolean);

  return {
    ...deck,
    unknown,
    cards,
    groups: {
      objectives: cards.filter(card => card.type === 'Objective'),
      ploys: cards.filter(card => card.type === 'Ploy' || card.type === 'Gambit'),
      upgrades: cards.filter(card => card.type === 'Upgrade')
    }
  };
}

# WHU Online — první online etapa

Samostatný test herních místností a sdíleného stolu. Původní offline hra v kořeni repozitáře se nemění.

## Co funguje

- Založení místnosti, pozvání odkazem nebo osmiznakovým kódem, nejvýše dva hráči.
- Vlastní jméno a výběr party pro každého hráče.
- Společná deska a bojovníci: přesun kliknutím na hex, zranění, inspirace, odstranění a návrat, vlastní tokeny.
- Oba hráči mohou upravovat bojovníky a Glory obou stran podle dohody.
- Serverové hody útočnými a obrannými kostkami a společný chat.
- Obnovení přístupu po F5; samostatná data jednotlivých místností.
- Ukládání stavu na disk. Přenos změn probíhá dotazem každých 1,5 sekundy.
- Kontrola revize odmítne kolidující změnu a klient načte aktuální stůl. Akci pak hráč zopakuje. Opakovaný požadavek se stejným ID se neprovede podruhé (posledních 200 akcí hráče).

## Co ještě není zapojené

Příprava partie, výběr desek/území, poklady a Aqua, průběh kol, warscrollové značky, balíčky, soukromé ruce a potvrzování karet. Tento test není ještě celá online hra. Offline hra má tyto funkce nadále k dispozici.

Na serveru zatím nejsou žádné ruce ani dobírací balíčky. Budoucí soukromé karty patří do samostatného serverového stavu a server musí každému hráči vracet pouze jeho ruku. Nestačí je skrýt v HTML.

## Spuštění

Je potřeba Node.js 22 nebo novější. Projekt nepoužívá externí npm balíčky.

Ve složce repozitáře:

```sh
cd online
npm test
npm start
```

Otevři `http://127.0.0.1:3000/`. Pro druhého hráče na stejném počítači použij jiný prohlížeč nebo anonymní okno. Samostatné běžné záložky sdílejí uloženou identitu.

### Dva počítače ve stejné síti

Spusť server tak, aby přijímal připojení ze sítě. PowerShell ve Windows:

```powershell
$env:HOST="0.0.0.0"
npm start
```

Linux/macOS:

```sh
HOST=0.0.0.0 npm start
```

Oba počítače otevřou adresu serverového počítače, například `http://192.168.1.20:3000/` (nahraď skutečnou místní IP). Příchozí port 3000 musí být v místní síti dostupný. Založ místnost a pošli soupeři její odkaz. Server musí po dobu testu běžet.

### Trvalé veřejné spuštění

GitHub Pages spouští pouze statické soubory, tento Node server tam neběží. Pro hraní přes internet je potřeba hosting s Node procesem, HTTPS a trvalým diskem. Nejdřív zvolíme konkrétní hosting; tento commit žádnou službu nezakládá ani neaktivuje platby.

- `PORT`: port serveru, výchozí 3000.
- `HOST`: naslouchací adresa, výchozí `127.0.0.1`.
- `WHU_DATA_DIR`: složka pro uložené místnosti, výchozí `online/data/`.
- Spouštěj jen jednu instanci procesu; současný souborový sklad není určený pro více instancí. Pro další provoz lze nahradit databází bez změny protokolu klienta.
- Data nesmějí být veřejně servírovaná. Součástí herního přístupu je náhodný token, v souborech na serveru se ukládá pouze jeho hash. Veřejný hosting musí používat HTTPS. Origin API musí odpovídat hostiteli stránky.
- Při smazání dat prohlížeče se ztratí uložený přístup hráče. Obnova přes účet ani předání uvolněného místa zatím nejsou implementované.

## Testování

Automatické testy ověřují dva hráče, odmítnutí třetího, oddělení místností a identit, souběžné revize, opakování akcí, oprávnění obou stran, uložení a restart, API a ochranu neveřejných souborů. Vizuální kontrolu ve dvou skutečných prohlížečích je potřeba doplnit při spuštění serveru.

Offline záloha je zachovaná ve větvi `offline-v1.0.2`; online práce probíhá ve větvi `online`.

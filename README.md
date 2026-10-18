# WHU Online v4.1 — test načítání obrázků po importu

## Nahrání na GitHub (aktualizace v4)
Nahraďte index.html, app.js, style.css, decks.js, cards.js, cards.json a README.md.
Přidejte nové soubory sw.js a card-cache.js do stejného adresáře jako index.html.
Původní obrázky desky, bojovníků a warscrollů v assets zachovejte.
Žádné obrázky balíčků se tentokrát nenahrávají. Stará assets/cards už není používaná a po ověření aktualizace ji lze odstranit. Program do této složky nikdy nezapisuje.
Po dokončení nasazení použijte Ctrl+F5. V záhlaví má být v4.1. Pokud máte otevřenou starší partii, klikněte na Nový stůl.

## První test — na GitHub Pages přes HTTPS
1. Zvolte party a u prvního hráče vložte odkaz ze souboru testovaci-balicek.txt.
2. Klikněte na Načíst balíček a sledujte postup Obrázky X/Y. První načtení může trvat podle připojení; 32 původních obrázků má dohromady asi 23,5 MB.
3. Počkejte na Obrázky připraveny. Rozbalte Prohlédnout načtené karty a otevřete několik karet.
4. U druhého hráče použijte stejný odkaz. Pro tuto zkoušku má využít již uložené obrázky a nezvyšovat jejich počet na dvojnásobek.
5. Potvrďte oba balíčky. Dole pod stolem najdete Test mezipaměti karet a počet uložených obrázků. Pro stejný balíček na obou stranách očekáváme 32.
6. Založte nový stůl a naimportujte odlišný balíček. Počet uložených obrázků se zvýší jen o dosud chybějící obrázky. Výběr každého hráče zůstává samostatný.
7. Tlačítko Vymazat obrázky karet odstraní pouze naši mezipaměť. Neodstraní seznamy balíčků, stav partie ani soubory z GitHubu. Potom opakujte import: obrázky se mají znovu připravit.

Tento test nespouštějte dvojklikem na index.html. Service worker vyžaduje HTTPS nebo localhost. Program zobrazí vysvětlení, pokud prostředí ukládání nepodporuje. Samotná syntaxe nebo test s náhradním prostředím nenahradí tuto zkoušku nasazené stránky.

## Jak ukládání funguje
Katalog obsahuje názvy, typy a vzdálené adresy 384 karet; neobsahuje obrazová data. Import dekóduje kódy ze sdíleného odkazu, přiřadí katalogové záznamy a připraví pouze unikátní obrázky daného balíčku.

Přednačtení běží nejvýše ve třech souběžných úlohách na jeden import. Dva současné importy sdílejí probíhající stažení stejného URL. HTTP odpovědi z UnderworldsDB jsou opaque (bez CORS); ukládáme je pomocí Cache.put a dostupnost ověřujeme skutečným načtením do Image. Neúspěšný obrázek vyřadíme z mezipaměti a import nabídne opakování. Balíček se připraví až po ověření všech jeho obrázků. Změna vstupního odkazu zneplatní starý běžící import pro daného hráče; již stažené obrázky mohou zůstat pro další použití.

Service worker vrací uložené obrázky pro běžné obrazové požadavky na https://www.underworldsdb.com/cards/. Jiné požadavky neobsluhuje a nepřednačítá celou aplikaci. Samotné otevření náhledu neukládá nové obrázky do naší řízené mezipaměti; zapisují ji importy. Prohlížeč může mít navíc vlastní běžnou HTTP cache.

Mezipaměť je společná oběma hráčům a oddělená podle cesty projektu. Při další hře zůstává; nemaže se automaticky. Úložiště může vymazat uživatel nebo prohlížeč. Jeho obsazenost nelze odvozovat pouze z velikosti původních obrázků, protože opaque odpovědi mohou být účtovány s rezervou. Při zaplnění se zobrazí chyba importu, nikoli falešná zpráva o připraveném balíčku.

Nepřidáváme Firebase, nové herní kroky ani offline aplikaci. Stav v4 se zachovává; aktuální balíčky znovu importujte přes Nový stůl, abyste otestovali nové přednačtení. Příprava úvodní ruky nadále není implementovaná.

## Zdroje a ověření
Katalogové adresy pocházejí z veřejného výpisu https://www.underworldsdb.com/dbdata.php?query=y&decktype=nemesis&warband=Universal . Před touto úpravou bylo všech 32 obrázků testovacího balíčku dostupných jako image/png s HTTP 200, bez hlaviček CORS/CORP. Dostupnost externí služby se může měnit; chyby nejsou ignorovány.

Prošly kontroly syntaxe, testy ukládání, opakovaného použití, souběžného sdílení stažení, vymazání cache, vyřazení chybného obrázku, omezení service workeru na obrazové požadavky a cesty projektu, dokončení importu až po načtení obrázků a odmítnutí zastaralého importu po změně odkazu. Tyto automatické testy používají náhradní browser API; reálné chování CORS, service workeru a Image je potřeba potvrdit výše uvedenou zkouškou na GitHub Pages.

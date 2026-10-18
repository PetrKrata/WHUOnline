# WHU Online — prototyp v2: sólo

## Spuštění
Rozbalte celý ZIP. Otevřete index.html v moderním prohlížeči (Chrome, Edge, Firefox). Složku assets ponechte vedle index.html. Není třeba nic instalovat.

## Ovládání
- Kliknutím vyberte žeton a potom klikněte na cílový hex. Funguje také přetažení.
- Kartu otevřete tlačítkem Karta v přehledu nebo dvojklikem na žeton.
- Otočit / inspirovat přepíná strany karty; inspirovaný žeton má zlatý okraj.
- Zranění přidávejte a ubírejte ručně.
- Warscroll otevře společnou kartu party.
- Zvolte 1 až 20 útočných či obranných kostek a klikněte na Hodit.
- Výsledky vyberte kliknutím a použijte Přehodit vybrané. Symboly mají textovou legendu; jde o náhradní grafiku.
- Zpět vrací poslední herní změnu v aktuálním otevření stránky.
- Nový stůl obnoví výchozí rozmístění.

## GitHub Pages
Nahrajte index.html, style.css, app.js a celou složku assets do kořene repozitáře. V Settings → Pages zvolte Deploy from a branch, větev main a složku / (root). Tento balíček neobsahuje automatické nasazení ani přístupové údaje.

## Rozsah
Jde o lokální sólo prototyp se dvěma kopiemi Ironsoul’s Condemnors. Při prvním otevření vyplňte jména a založte partii. Přepínačem Hráč 1 / Hráč 2 ovládáte příslušné tři bojovníky. Obě strany mají nezávislá zranění i inspiraci. Barva okraje a číslo na žetonu určují stranu. Kartu soupeře lze prohlédnout. Po obnovení stránky se pokračuje v uloženém stavu. Nový stůl otevře formulář nové partie; stávající stůl se přepíše až po potvrzení. Není propojený s Firebase: online soupeř, chat, balíčky a soukromé ruce přijdou v dalším kroku. Hody probíhají lokálně pomocí Web Crypto; pro sdílenou hru je bude třeba přesunout na serverovou funkci.

Pravidla nejsou automatizovaná. Aplikace nekontroluje pohyb, obsazení hexu ani vyřazení. Zranění jsou počítadlem utrženého poškození. Rozmístění slouží k testu ovládání.

Stav se ukládá v localStorage, pokud jej prohlížeč povoluje; při otevření souboru přímo z disku závisí zachování na prohlížeči a umístění souboru. Ukládání je místní, není to záloha ani online synchronizace.

Podklady: uživatelem dodaná deska The Verdant Maw, warscroll a šest stran karet Ironsoul’s Condemnors. Hexová síť je kalibrovaná pro tento konkrétní obrázek.

## Soubory
index.html — rozložení stolu
style.css — vzhled a responzivní rozložení
app.js — stav, přesouvání, karty, kostky, místní ukládání
assets/ — původní obrazové podklady

## Ověření této verze
Zkontrolována syntaxe JavaScriptu, existence obrazových podkladů a geometrie výchozích pozic. Interakce nebyly ověřeny automatizovaným testem v prohlížeči; první spuštění slouží také k uživatelskému ověření zarovnání a ovládání.

## Aktualizace z v1 na GitHubu
Nahraďte index.html, style.css, app.js a README.md. Obrázky ve složce assets jsou stejné. Místní uložení v1 zůstane zachované samostatně; v2 založí novou partii. Po nasazení použijte Ctrl+F5.

V2: syntaxe a automatická kontrola s náhradním DOM ověřily založení partie, jména, přepínání stran, oddělenou inspiraci, oprávnění k přesunu a hody. Vizuální rozložení a přetahování vyžadují ověření ve skutečném prohlížeči.

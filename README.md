# WHU Online — prototyp v1

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
Jde o lokální prototyp jedné party. Není propojený s Firebase: druhý hráč, chat, balíčky a soukromé ruce přijdou v dalším kroku. Hody probíhají lokálně pomocí Web Crypto; pro sdílenou hru je bude třeba přesunout na serverovou funkci.

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

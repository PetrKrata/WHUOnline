# WHU Online v3 — výběr part

Tento krok přidává nezávislý výběr Ironsoul’s Condemnors (3 bojovníci) a Sons of Velmorn (5 bojovníků) pro oba hráče. Lze vybrat stejnou partu proti sobě. Před potvrzením je vidět seznam bojovníků a náhled warscrollu. Na pracovním stole se načtou správné karty, obě strany, warscroll a žetony každé party.

## Spuštění a aktualizace
Rozbalte ZIP a otevřete index.html. Na GitHubu nahraďte index.html, app.js, style.css a README.md. Do existující složky assets přidejte všech 11 obrázků sons-of-velmorn-*.png. Původní obrázky ponechte. Poté Ctrl+F5.

## Co vyzkoušet
1. Ironsoul’s proti Sons of Velmorn: na stole musí být 3 a 5 bojovníků.
2. Přepněte hráče a otevřete warscroll, karty a jejich inspirované strany.
3. Založte nový stůl s opačným výběrem a potom se stejnou partou proti sobě.
4. Změna inspirace a zranění jedné kopie nesmí ovlivnit druhou.
5. Obnovte stránku: zvolená kombinace a změny se mají načíst z místního uložení.

## Rozsah
Pouze sólo pracovní stůl. Balíčky, úvodní ruka, rozhoz o desku a herní rozmístění zatím nejsou implementované. Deska a výchozí pozice slouží k testu výběru part. Nejde o dokončenou přípravu podle pravidel. Pohyb, zranění, inspiraci a opravy řídí hráč. Karty a warscroll soupeře lze prohlížet. Žetony zůstávají barevně odlišené podle hráče.

V3 používá samostatný klíč localStorage; uloženou v2 nepřepisuje. Ukládání závisí na podpoře prohlížeče, zvláště při otevření ze souboru. Online propojení není připojeno.

## Ověření
Syntaxe JavaScriptu a automatické ověření všech čtyř kombinací part, mapování obrázků, nezávislé inspirace a obnovení uložení. Interakce s náhradním DOM nenahrazují vizuální test ve skutečném prohlížeči.

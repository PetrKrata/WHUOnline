# WHU Online — Firebase větev

Tento adresář je určen výhradně pro novou online verzi postavenou nad Firebase / Firestore.

## Zásadní pravidlo

Kořenová offline hra se při vývoji online části nemění. Online práce patří pouze do adresáře `online/`, pokud není výslovně rozhodnuto jinak.

## Stav

Starý Node.js prototyp byl z větve `online` odstraněn. Tento adresář nyní obsahuje pouze čistý statický základ pro další Firebase implementaci.

## Další plán

1. Firebase konfigurace a anonymní přihlášení.
2. Lobby v reálném čase.
3. Vytvoření stolu a připojení druhého hráče.
4. Režim Náhled pro diváka bez možnosti zápisu.
5. Teprve poté napojení herního stavu.

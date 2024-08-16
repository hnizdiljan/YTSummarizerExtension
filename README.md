# YouTube Video Summarizer

YouTube Video Summarizer je rozšíření pro prohlížeč, které umožňuje uživatelům snadno získávat přepisy, shrnutí a kapitoly z YouTube videí. Toto rozšíření využívá pokročilé AI technologie pro generování užitečných souhrnů obsahu videa.

## Funkce

- **Stažení přepisu**: Automaticky extrahuje titulky z YouTube videí.
- **Sumarizace videa**: Generuje stručné shrnutí obsahu videa pomocí AI.
- **Generování kapitol**: Vytváří návrh kapitol s časovými odkazy pro snadnou navigaci ve videu.
- **Cachování dat**: Ukládá získaná data lokálně pro rychlejší přístup a offline použití.
- **Indikátor stavu**: Dynamicky mění ikonu rozšíření pro zobrazení dostupnosti dat.

## Instalace

1. Stáhněte zdrojový kód rozšíření.
2. Otevřete stránku rozšíření ve vašem prohlížeči (např. `chrome://extensions/` pro Chrome).
3. Zapněte "Režim pro vývojáře".
4. Klikněte na "Načíst nerozbalené" a vyberte složku se staženým kódem.

## Nastavení

Před použitím rozšíření je nutné nastavit API klíč pro OpenAI:

1. Klikněte na ikonu rozšíření pro otevření popup okna.
2. Vložte váš OpenAI API klíč do příslušného pole.
3. Klikněte na "Uložit API klíč".

## Použití

1. Navštivte video na YouTube.
2. Klikněte na ikonu rozšíření pro otevření popup okna.
3. Použijte tlačítka pro stažení přepisu, sumarizaci videa nebo generování kapitol.
4. Výsledky se zobrazí v příslušných textových polích v popup okně.

## Struktura projektu

- `manifest.json`: Konfigurační soubor rozšíření.
- `background.js`: Service worker pro správu stavu rozšíření a komunikaci s API.
- `content.js`: Skript pro interakci s webovou stránkou YouTube.
- `injected.js`: Skript injektovaný do stránky YouTube pro extrakci dat.
- `popup.html`: HTML struktura popup okna.
- `popup.js`: Logika pro interakci s uživatelským rozhraním v popup okně.

## Technické detaily

### Extrakce titulků

Rozšíření používá dva přístupy pro získání titulků:
1. Extrakce z `ytInitialPlayerResponse` objektu na stránce YouTube.
2. Pokud první metoda selže, používá alternativní API volání.

### AI Integrace

Pro sumarizaci a generování kapitol je využíváno OpenAI API s modelem GPT-4o-mini. Komunikace s API je implementována v `background.js`.

### Cachování

Data jsou cachována lokálně pomocí `chrome.storage.local` API pro rychlejší přístup a snížení počtu API volání.

### Bezpečnost

API klíč je bezpečně uložen pomocí `chrome.storage.sync` API a není nikdy zobrazen v čitelné podobě v uživatelském rozhraní.

## Omezení

- Rozšíření funguje pouze na stránkách YouTube.
- Pro sumarizaci a generování kapitol je vyžadován platný OpenAI API klíč.
- Kvalita shrnutí a kapitol závisí na dostupnosti a kvalitě titulků videa.

## Budoucí vylepšení

- Podpora více jazyků pro titulky a shrnutí.
- Integrace s dalšími AI službami pro větší flexibilitu.
- Rozšíření funkcionality na další video platformy.

## Příspěvky

Příspěvky k projektu jsou vítány. Prosím, otevřete issue nebo pull request na GitHub repozitáři projektu.

## Licence

Toto rozšíření je vydáno pod MIT licencí. Viz soubor `LICENSE` pro více detailů.

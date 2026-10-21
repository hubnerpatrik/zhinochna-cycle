# Opravy otevřených reportů — 21. 10. 2026

Číslování odpovídá [výpisu 32 otevřených reportů](feedback-open-2026-10-21.md).
Rozsah: 1–30. Body 31 (Excel) a 32 (přepracování PDF) jsou na žádost vynechané;
Excel ani vzhled PDF se nerozšiřují. Při následné kontrole byla pouze doplněna
kompatibilita existujícího PDF se zvýšenými teplotami z bodu 6, aby se nekreslily mimo graf.

Změny aplikace jsou lokální; aplikace nebyla nasazena. Na následnou výslovnou
žádost uživatele byly dne 21. 10. 2026 v produkčním feedbacku označeny reporty
1–30 jako Resolved podle dokončené implementace. Ověřeno: filtr Open obsahuje
už jen reporty 31 (Excel) a 32 (přepracování PDF). Tento stav potvrzuje opravu
v aktuálním kódu, nikoli její nasazení do produkce.

| Bod | Výsledek v lokálním projektu |
| --- | --- |
| 1 | Přidán lokalizovaný rok a rozsah měsíců podle celé mapy nad mobilní tabulku. Přepnutí mapy a jazyka aktualizuje popisek; prázdná mapa nemá zastaralý rozsah. |
| 2 | Mobilní hlavička používá Date / Datum / Dátum / Дата. |
| 3 | Zmenšena čísla v hlavičce mobilní tabulky a nenápadnější označení dne cyklu v kalendáři. Velikost dotykových ploch zachována. Report neurčuje přesný BUTTON. |
| 4 | Browser prompt nahrazen dialogem pro změnu názvu, s uložením, zrušením a zachováním rozepsaného názvu při chybě ukládání. |
| 5 | Odstraněn duplicitní souhrn z nabídky Day record; uložený vliv je pod teplotou vybraného dne. Vlastní text se nepřekládá. Samostatná funkce Day Info zůstává dostupná. |
| 6 | Uložení a import přijímá 36–43 °C. Škála grafu zůstává 36–37,4 °C; přesah má trojúhelník a skutečnou naměřenou hodnotu u hranice. Sousední body se přes něj nespojují. Sekundární upravená teplota nepřekrývá naměřenou hodnotu. |
| 7 | Travel má ukrajinský překlad Дорога. |
| 8 | Špinění má červený gradient i při současném označení plodného dne; vybraný den má viditelné orámování. |
| 9 | Již implementováno ve v0.14.0: exportní nabídka používá top-layer popover. |
| 10 | Již implementováno: buildColumns zahrnuje mezilehlé dny bez vytváření falešných záznamů. Existující regresní test včetně změny času prošel. |
| 11 | Již implementováno: řádky čípku se zobrazují podle pozorování nebo markeru v celé mapě. |
| 12 | Již implementováno: skupina dalších symptomů se zobrazuje podle záznamů v mapě. Explicitní záznam sex=false se považuje za zaznamenané pozorování. |
| 13 | Již implementováno: ikony řádků jsou v mobilní tabulce; ověřeno na DEMO mapě. |
| 14 | Již implementováno: styku odpovídá checkbox. |
| 15 | Již implementováno: Високо. |
| 16 | Již implementováno: Посередині pro polohu; Середня zůstává zvlášť pro otevření. |
| 17 | Již implementováno: Низько. |
| 18 | Již implementováno: Мало тягучий. |
| 19 | Již implementováno: přítomný výtok používá Є v detailech; zadává se checkboxem. |
| 20 | Již implementováno: faktor Other odhaluje vlastní text, který přežije uložení, reload a zálohu. |
| 21 | Již implementováno: sraženiny se zadávají checkboxem. |
| 22 | Již implementováno: stejná obrázková škála intenzity v editoru a buňkách mapy. |
| 23 | Již implementováno: Кровомазання. |
| 24 | Již implementováno: samostatné tlačítko Bez krvácení odstraněno; opětovné klepnutí ruší volbu. |
| 25 | Již implementováno: Менструація v editoru. |
| 26 | Již implementováno: Менструація v položce krvácení. |
| 27 | Již implementováno: Фактори впливу. |
| 28 | Již implementováno: Стандартний час вимірювання. |
| 29 | Již implementováno: Спосіб вимірювання. |
| 30 | Již implementováno ve v0.14.0: menu exportu je popup nad kartami map. |
| 31–32 | Vynecháno podle zadání. |

## Ověření

- Syntaxe JavaScriptu, automatické testy a produkční build.
- Nové testy: rozsah měsíců přes hranici roku, změna jazyka a prázdná mapa,
  uchování zvýšené teploty při reloadu a JSON záloze, zachování pevné škály,
  hit testing krajního bodu a absence zavádějícího propojení teplot.
- Mobilní náhled 390 px: viditelný nadpis 2026 September – October a ikony tabulky;
  uložení změněného názvu mapy a vrácení původního názvu; uložení 38,65 °C,
  skutečná hodnota u hrany grafu a vliv pod teplotou. Testovací teplota vrácena na 36,65 °C.
- Před nasazením nelze z tohoto výpisu odvozovat, že jsou reporty vyřešené v produkci.

## Dodatečná kontrola před dalším krokem

- Přejmenovací dialog se při navigaci Zpět či na jinou stránku zavře bez odeslání
  rozepsané změny. Odstraní se i jeho posluchače navigace.
- PDF zachová měřítko a skutečnou vyšší teplotu zobrazí u hranice grafu
  i v pozorováních; nepropojuje ji jako běžný bod mimo stránku.
- Oba případy mají regresní test.

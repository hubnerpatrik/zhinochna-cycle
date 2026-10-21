# Všechny otevřené reporty — 21. 10. 2026

Zdroj: https://cycle-app-nine.vercel.app/, Feedback → Open.
Ověřeno 21. 10. 2026: **32 otevřených reportů** — 8 z 21. října a 24 starších.
Resolved/closed jsou vyřešené a nejsou zahrnuté. Časy: Europe/Prague.
Čísla níže označují pořadí ve výpisu, nikoli databázová ID.
Stavy reportů nebyly změněny; žádný nebyl tímto výpisem uzavřen.

Produkce při kontrole zobrazovala v0.13.0; lokální projekt má v0.14.0.
Starší reporty zahrnujeme podle jejich skutečného stavu Open i tehdy, když
předchozí přehled popisuje lokální implementaci opravy. Předchozí průběh:
[feedback-progress.md](feedback-progress.md). Report č. 32 je v předchozím
přehledu odložený na žádost; stále je Open, proto je zahrnutý i zde.

Reporty 1–8 níže: 21. 10. 2026, v0.13.0, mobilní zobrazení 390 × 655.

## 1. Automatický rok a měsíc nad tabulkou pozorování

- Čas: 11:17:42.
- Obrazovka: `#/active-map`; prvek: `Observations table`.
- Požadavek: automaticky nad tabulkou zobrazovat rok a rozsah měsíců mapy,
  například „2026 september – október“.
- Původní text: „Ešte rozmyšlam, tu by hore pridať rok a mesiac, aby to automaticky naskakovalo. Napr.: 2026 september - október“

## 2. Ukrajinský popisek v mobilní tabulce

- Čas: 11:15:32.
- Obrazovka: `#/active-map`; prvek: `mobileObservationGrid`.
- Požadavek: nahradit „день“ slovem „дата“.
- Původní text: „Namiesto «день» - «дата»“

## 3. Zmenšit čísla v mobilním zobrazení

- Čas: 11:14:15.
- Obrazovka: `#/active-map`; prvek: `BUTTON`.
- Požadavek: zmenšit čísla „23, 24…“, která působí příliš výrazně.
- Původní text: „Čisla 23,24… veľmi zbyto vyzeraju, mož by ivh zmenšiť“
- Obecný název prvku neurčuje přesný ovládací prvek; před úpravou ověřit
  v mobilním zobrazení, která čísla report označuje.

## 4. Nefungující změna názvu mapy

- Čas: 11:11:44.
- Obrazovka: `#/my-maps`; prvek: `Змінити назву`.
- Požadavek: opravit tlačítko změny názvu mapy.
- Původní text: „Toto tlačidko nefunguje“

## 5. Odstranit nadbytečný souhrn dne, vliv zobrazit pod teplotou

- Čas: 11:09:08; doplnění se screenshotem v 11:09:54.
- Obrazovka: `#/active-map`; prvek: `2026-10-14 (ДЦ 22)`.
- Požadavek: odstranit označený souhrn dne a případný faktor ovlivňující
  teplotu zobrazovat přímo na hlavní obrazovce pod teplotou.
- Původní text: „Tento suhrn dňa by celkom dať preč, je tu zbytočný. My sme ho nechavali len kvôli tomu, aby bolo jasné, aký tam bol vplyv na teplotu. Možno spraviť tak, keď je ten vplyv, tak aby sa ukazal na hlavnej stranke pod teplotou?“
- Doplnění: „Tu myslim“ + screenshot v reportu.

## 6. Povolit zápis teplot nad 37,4 °C bez neomezené škály grafu

- Čas: 10:55:19.
- Obrazovka: `#/active-map`; prvek: `tempInput`.
- Požadavek: umožnit uložit například zvýšenou teplotu při nemoci,
  i když překročí současný limit 37,4 °C. Současně zachovat přehlednou
  omezenou škálu grafu. Konkrétní způsob zobrazení přesahu není rozhodnutý.
- Původní text: „Naprikdak, ked je nemoc, tak tepllota može byť viac ako 37,4, a potom appka nechce ju prijať, lebo mame tam hornú hranicu… ale nechcem, aby škála na grafe bola do nekonečna… čo by sa s tym dalo spraviť?“

## 7. Ukrajinský překlad faktoru cestování

- Čas: 10:33:03.
- Obrazovka: `#/active-map`; prvek: `tempFactorsInput`.
- Požadavek: místo „подорож“ používat „Дорога“.
- Původní text: „«Дорога» namiesto “подорож»“

## 8. Barevně označit špinění v kalendáři

- Čas: 10:27:48; doplnění se screenshotem v 10:30:10.
- Obrazovka: `#/active-map`; prvek: `Мажучі виділення`.
- Požadavek: dny se špiněním v kalendáři odlišit červeným gradientem.
- Původní text: „Pridaj, prosím, aj v kalendári gradient do červena, aby bolo vidieť, že to sú dni špinenia“
- Doplnění: „Napr. 27, 28 to sú dni spinenia“ + screenshot v reportu.

## 9. Oříznuté menu exportu mapy (report „bug“ se screenshotem)

- Datum a čas: 17. 10. 2026 10:29:05.
- Kontext: `#/my-maps · v0.13.0 · 1920x855 Open`.
- Označený prvek: `BUTTON`.
- Příloha: screenshot v produkčním reportu.

Původní komentář:

> bug

Screenshot ukazuje otevřenou nabídku exportu, jejíž spodní část překrývá další karta mapy. Popis problému je odvozený ze screenshotu; samotný komentář obsahuje jen „bug“.

## 10. Zachovat v grafu dny bez záznamu mezi vyplněnými dny

- Datum a čas: 17. 10. 2026 10:27:07.
- Kontext: `#/active-map · v0.13.0 · 1920x855 Open`.
- Označený prvek: `tempChart`.

Původní komentář:

> at se ukazuje 7, den když.
>
> problem je když den s udaji pak den bez udaju a pak den s udaji vynechá se den a neukazuje se
>
>
> chceme aby se to ukázalo

## 11. Skrýt řádky čípku, pokud nejsou v mapě vyplněné

- Datum a čas: 17. 10. 2026 10:24:21.
- Kontext: `#/active-map · v0.13.0 · 390x797 Open`.
- Označený prvek: `mapRows`.

Původní komentář:

> Zde taky cervix jestli se nezadá tak se neukaže

## 12. Zobrazovat další symptomy jen tehdy, když jsou v mapě zaznamenané

- Datum a čas: 17. 10. 2026 10:21:11.
- Kontext: `#/active-map · v0.13.0 · 390x797 Open`.
- Označený prvek: `mapRows`.

Původní komentář:

> Fialové rows other se zde ukažou jen když jsou někdy vybráné

## 13. Vrátit ikony do řádků mobilní mapy

- Datum a čas: 17. 10. 2026 10:11:04.
- Kontext: `#/active-map · v0.13.0 · 390x797 Open`.
- Označený prvek: `mapRows`.

Původní komentář:

> Prosím zpatky ikonky

## 14. U pohlavního styku použít zaškrtávací políčko

- Datum a čas: 16. 10. 2026 20:24:13.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `Так`.

Původní komentář:

> Tu by radšej tiež dať fajku

Konkrétní význam obecného prvku vychází z přiřazení v předchozím přehledu; původní komentář je uveden výše.

## 15. Ukrajinský překlad vysoké polohy čípku: Високо

- Datum a čas: 16. 10. 2026 20:23:30.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `Висока`.

Původní komentář:

> Високо

## 16. Ukrajinský překlad střední polohy čípku: Посередині

- Datum a čas: 16. 10. 2026 20:23:20.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `Середня`.

Původní komentář:

> Посередині

## 17. Ukrajinský překlad nízké polohy čípku: Низько

- Datum a čas: 16. 10. 2026 20:22:07.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `Низька`.

Původní komentář:

> Низько

## 18. Ukrajinský překlad mírně tažného hlenu: Мало тягучий

- Datum a čas: 16. 10. 2026 20:20:24.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `Злегка тягучий`.

Původní komentář:

> Мало тягучий

## 19. U přítomného výtoku používat Є místo Так

- Datum a čas: 16. 10. 2026 20:19:54.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `Так`.

Původní komentář:

> Є

## 20. U faktoru Jiné umožnit vlastní text

- Datum a čas: 16. 10. 2026 14:43:10.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `tempFactorsInput`.

Původní komentář:

> Keď vyberam ine nevyslakuje možnosť vpisať vlastne

## 21. U sraženin použít zaškrtávací políčko

- Datum a čas: 16. 10. 2026 14:41:08.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `bleedingModal`.

Původní komentář:

> Tu by som nechala iba fajku vedľa slova

Konkrétní význam obecného prvku vychází z přiřazení v předchozím přehledu; původní komentář je uveden výše.

## 22. Obrázková škála intenzity menstruace, stejná i v mapě

- Datum a čas: 16. 10. 2026 14:39:45.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `bleedingModal`.

Původní komentář:

> A dalo by sa tu spraviť škalu v obrazkoch?
> Napr: 3kvapky, 2 kvapky, 1kvapka a polkvapky červenej a žena by vyberala intenzitu? Hore podpis: intenzita menštruacie, dole škala: veľmi intenzivna - špinenie. A tie ikonky by sa rovno zobrazovali  aj v mape.

## 23. Ukrajinský překlad špinění: Кровомазання

- Datum a čas: 16. 10. 2026 14:31:02.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `Мажучі виділення`.

Původní komentář:

> Кровомазання

## 24. Skrýt tlačítko Bez krvácení

- Datum a čas: 16. 10. 2026 14:30:45.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `Немає кровотечі`.

Původní komentář:

> Je možne toto tlačitko celkom skryť?

## 25. Nadpis editoru krvácení: Менструація

- Datum a čas: 16. 10. 2026 14:29:32.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `bleedingModal`.

Původní komentář:

> Менструація

## 26. Položku Кровотеча přejmenovat na Менструація

- Datum a čas: 16. 10. 2026 14:29:14.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `Кровотеча`.

Původní komentář:

> Менструація

## 27. Ukrajinský překlad vlivů: Фактори впливу

- Datum a čas: 16. 10. 2026 13:40:40.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `Чинники впливу`.

Původní komentář:

> Фактори впливу

## 28. Ukrajinský popisek obvyklého času měření: Стандартний час вимірювання

- Datum a čas: 16. 10. 2026 13:37:31.
- Kontext: `#/my-profile · v0.12.3 · 390x745 Open`.
- Označený prvek: `profileScreenForm`.

Původní komentář:

> Стандартний час вимірювання

## 29. Ukrajinský popisek metody měření: Спосіб вимірювання

- Datum a čas: 16. 10. 2026 13:36:01.
- Kontext: `#/active-map · v0.12.3 · 390x655 Open`.
- Označený prvek: `Метод`.

Původní komentář:

> Спосіб вимірювання

## 30. Nabídku exportu zobrazit jako popup

- Datum a čas: 12. 10. 2026 15:01:55.
- Kontext: `#/my-maps · v0.12.3 · 390x797 Open`.
- Označený prvek: `mapsList`.

Původní komentář:

> Spiš než že se to uděla dole. Bublina pop up?

## 31. Nabídnout export do Excelu místo CSV

- Datum a čas: 12. 10. 2026 15:01:06.
- Kontext: `#/my-maps · v0.12.3 · 390x797 Open`.
- Označený prvek: `BUTTON`.

Původní komentář:

> Možna místo csv na excel?

## 32. Předělat PDF podle klasických map

- Datum a čas: 6. 10. 2026 20:39:33.
- Kontext: `#/my-maps · v0.12.2 · 390x797 Open`.
- Označený prvek: `BUTTON`.

Původní komentář:

> Pdf předělat sle klasických map

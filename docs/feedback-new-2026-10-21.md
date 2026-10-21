# Nové otevřené reporty — 21. 10. 2026

Zdroj: https://cycle-app-nine.vercel.app/, Feedback → Open, načteno 21. 10. 2026.
Nové = reporty přidané po posledním přehledu ze 17. 10. 2026.
Všechny níže uvedené reporty mají stav Open, pocházejí z verze 0.13.0
a mobilního zobrazení 390 × 655. Časy jsou zobrazené v Europe/Prague.
Resolved/closed reporty jsou vyřešené a nejsou zde zahrnuté.

Ve filtru Open bylo 32 reportů: 8 nových z 21. října a 24 starších položek,
které patří do předchozího přehledu. Stavy reportů nebyly změněny.

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

## Kontext nasazení

Produkční aplikace při kontrole zobrazovala v0.13.0. Lokální projekt má v0.14.0.
Starší otevřené položky proto nepovažovat automaticky za nové regrese;
jejich předchozí implementace popisuje `docs/feedback-progress.md`.
Tento soubor je výpis nových požadavků, nikoli potvrzení jejich opravy.

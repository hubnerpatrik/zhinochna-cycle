---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: ["app.js","styles/index.css"]
---

# Surface brief: Cycle Tracker app UI

Scope: the whole signed-in app (Profile, My Maps, Active Map with calendar, chart, summary, sheets and dialogs). Mode: Operate.

Audience/job: one person recording a day of observations, mostly on a phone, often first thing in the morning in bed in dim light; reviewing the cycle on the calendar and chart. Keep all functions, layout logic and copy. Data (observation) colours stay unchanged. Interface palette stays in the warm cream/coral family, tuned. Must not feel clinical or dark/technical.

## Direction contract

THESIS: The category standard, played straight at Flo's craft level: soft white cards on a warm off-white ground, one coral accent, a neutral sans, generous touch targets. Refuses the old notebook look (cream paper, pastel button fills, hairline-boxed day cells).

OWN-WORLD: Ground #f7f3f0 warm off-white; white cards with 22px radius and one soft ambient shadow; ink #1f1a17, secondary #6f655c; coral accent #c84a32 as the fill with a white label (darkened from #e0674f to keep the label at 4.5:1; #e0674f stays as --action-soft for rings and icons); coral tint for selection; Inter, self-hosted since commit bb0ca42 so figures match across Android and Windows, with tabular figures; segmented controls as a sunken track with a white thumb; filled coral primary buttons, 14px radius; action rows as one grouped list with dividers; selects with an authored chevron. Frosted-glass white tab bar on phones (blur 20px, 78% white) at the user's explicit request, solid white under reduced transparency or without blur support.

STORY: The visitor opens the app, sees the month and today's reading at a glance, taps one coral button to record the day, and reads the chart without hunting for controls.

FIRST VIEWPORT (phone): title row (map name, language); segmented Calendar/Graph track beside Map info and Summary; white calendar card where ordinary days are bare numerals and only data states fill a tile (fertile, menstruation), rounded-square tiles because each cell carries a cycle-day numeral and marker dots; selected day filled coral, today ringed in coral; a Today card with date, cycle day, big temperature, and Day record (coral) beside Tools, kept side by side because the user asked that layout and functions stay; frosted-glass bottom tab bar with coral active tab.

HEADER BLOOM (2026-11-17, user request "floral, pastel, but not crazy"): the app header and the phone map title row are a flat pale blush band with a five-petal flower mark; wide screens add one thin botanical sprig in the band corner. Tabs stay plain text with the coral underline. Floral colours stay in the header only.

FORM: Category standard (canon), chosen by the user in the safer re-roll round; quality bar named by the user: Flo. seed:2bdb6436d73fa440

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

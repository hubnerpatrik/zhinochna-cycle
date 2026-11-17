---
name: Cycle Tracker
description: Soft white cards on a warm off-white ground with one coral accent, under a blush header band, with a gerbera meadow as the home page.
colors:
  coral: "#c84a32"
  coral-deep: "#ad3e29"
  coral-soft: "#e0674f"
  coral-tint: "#fdeae4"
  page-ground: "#f3f6ef"
  ground: "#f7f3f0"
  surface: "#ffffff"
  surface-sunken: "#f2ece8"
  ink: "#1f1a17"
  ink-muted: "#6f655c"
  line: "rgba(31, 26, 23, 0.12)"
  line-soft: "rgba(31, 26, 23, 0.06)"
  backdrop: "rgba(31, 26, 23, 0.32)"
  danger: "#b42318"
  danger-tint: "#fdecea"
  info-tint: "#e8f1ff"
  info-ink: "#203f68"
  success-tint: "#e2f2dd"
  warning-tint: "#fff4dc"
  warning-ink: "#634817"
  bloom-ground: "#f8e4e6"
  bloom-ink: "#2a1f21"
  bloom-ink-muted: "#75565b"
  bloom-petal: "#f4ccd2"
  bloom-petal-edge: "#dd9eaa"
  bloom-heart: "#ecc77f"
  bloom-leaf: "#98b293"
  bloom-leaf-tint: "#e1ebdc"
  meadow-sky: "#fbe7ea"
  meadow-hill-far: "#dbe8d0"
  meadow-hill-mid: "#cfe0c3"
  meadow-hill-near: "#b5cfa8"
  meadow-ground: "#e4eddb"
  meadow-stem: "#7f9e74"
  meadow-leaf: "#9cbb8f"
  meadow-disc: "#6b4a33"
  meadow-sun: "#f6d27a"
  meadow-ink: "#33242b"
  meadow-ink-muted: "#5f4a51"
  meadow-post: "#a88b72"
  meadow-soon-line: "#c9a5b1"
  meadow-rule: "rgba(51, 36, 43, 0.12)"
  meadow-peach: "#f6a98d"
  meadow-peach-inner: "#ee8c6c"
  meadow-rose: "#f19bb0"
  meadow-rose-inner: "#e57e98"
  meadow-butter-inner: "#ecbd52"
  meadow-lavender: "#c8b6e8"
  meadow-lavender-inner: "#ad97dc"
  meadow-white-inner: "#f3e3e8"
  calendar-fertile: "#cfe7b4"
  calendar-fertile-text: "#4d6246"
  calendar-period: "#f4c7cf"
  calendar-period-text: "#793744"
  data-adjusted: "#2563eb"
  data-fertile: "#16a34a"
  data-coverline: "#b41414"
  data-bleeding: "#b43c45"
  data-mucus: "#355e91"
  data-cervix: "#287c7c"
  data-factor: "#e19a1c"
  data-sex: "#0b7480"
  data-symptoms: "#6a62d6"
  tool-fertile: "#559262"
  tool-coverline: "#c0635f"
  tool-marker: "#6283cc"
  tool-cross: "#a87d33"
typography:
  display:
    fontFamily: "Inter Variable, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Inter Variable, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "2rem"
    fontWeight: 650
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  title:
    fontFamily: "Inter Variable, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 650
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter Variable, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: "Inter Variable, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
  label:
    fontFamily: "Inter Variable, Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
  home-display:
    fontFamily: "Rubik Variable, Inter Variable, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 1.55rem + 3.2vw, 4.25rem)"
    fontWeight: 650
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  home-headline:
    fontFamily: "Rubik Variable, Inter Variable, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  home-title:
    fontFamily: "Rubik Variable, Inter Variable, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 560
rounded:
  sm: "10px"
  control: "12px"
  md: "14px"
  lg: "22px"
  pill: "999px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
  s-7: "48px"
  s-8: "64px"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.surface}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.coral-deep}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-sunken}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
  button-danger-hover:
    backgroundColor: "{colors.danger-tint}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  segmented-track:
    backgroundColor: "{colors.surface-sunken}"
    rounded: "15px"
  segmented-thumb:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  calendar-day:
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  calendar-day-selected:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
  calendar-day-fertile:
    backgroundColor: "{colors.calendar-fertile}"
    textColor: "{colors.calendar-fertile-text}"
  calendar-day-period:
    backgroundColor: "{colors.calendar-period}"
    textColor: "{colors.calendar-period-text}"
  action-list:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.md}"
  action-row:
    textColor: "{colors.ink}"
    height: "52px"
  app-header:
    backgroundColor: "{colors.bloom-ground}"
    textColor: "{colors.bloom-ink}"
    rounded: "{rounded.lg}"
  tab-bar-phone:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
  tab-bar-phone-active:
    textColor: "{colors.coral}"
  nav-desktop:
    textColor: "{colors.bloom-ink-muted}"
    height: "44px"
  nav-desktop-active:
    textColor: "{colors.bloom-ink}"
  home-hero:
    backgroundColor: "{colors.meadow-sky}"
    textColor: "{colors.meadow-ink}"
  home-cta:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "52px"
  home-cta-hover:
    backgroundColor: "{colors.coral-deep}"
  home-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.meadow-ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  home-garden:
    backgroundColor: "{colors.meadow-ground}"
    textColor: "{colors.meadow-ink}"
  home-sign:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.meadow-ink}"
    rounded: "18px"
    padding: "18px 18px 20px"
  home-soon-tag:
    backgroundColor: "{colors.meadow-sun}"
    textColor: "{colors.meadow-ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
---

# Design System: Cycle Tracker

## Overview

**Creative North Star: "The Morning Card"**

The category standard, played straight at a high craft level. One person, often in bed in dim morning light, opens the app, sees the month and today's reading at a glance, taps one coral button to record the day, and reads the chart without hunting for controls. Everything in the working app serves that: soft white cards on a warm off-white ground, one coral accent, a neutral sans with tabular figures, and generous touch targets.

The interface stays quiet so the observations can speak. Colour in the interface means exactly one thing (coral: act here, you are here, this is selected); every other colour inside the working screens belongs to the recorded data and the chart. Depth is a single soft ambient lift under white cards and a deeper float under sheets. The one translucent material is the phone tab bar, frosted with a solid fallback.

Two decorative places, both requested by the user, frame that quiet core and carry no meaning. The **header bloom** is a flat pale blush band with a five-petal flower mark and, on wide screens, a thin botanical sprig. The **Home meadow** is the first screen for everyone: a field of hand-drawn gerberas on three sage hills under a blush sky, with the page's content set out below as white garden signs. It is both the public welcome page before sign-in and the signed-in Home. Nothing in either place is clinical, dark or technical, and neither carries medical or contraceptive styling.

**Key Characteristics:**
- Warm off-white ground, white cards, one ambient shadow.
- One coral accent, used for the primary action, selection, focus, today and the active tab; on Home only for Sign in.
- Inter, self-hosted, tabular figures for every number that is compared; Rubik for Home headlines, screen titles, the map and profile dialog titles, the month label and the map name.
- 44px minimum controls, 52px action rows, 50px primary buttons on the phone dock, 52px Sign in pill.
- Flowers are scenery in fixed places (header bloom, Home meadow, screen-title sprig, empty-state bloom), never on the active map; observation colours are data, never decoration.

## Colors

A warm neutral interface with a single coral voice, a fixed palette of observation colours beside it, and two scoped decorative palettes (bloom, meadow) that never leave their places.

### Primary
- **Coral** (#c84a32): the filled primary button with a white label, the selected calendar day, the caret, the active phone tab, the desktop tab underline, and the Home Sign in pill. Dark enough that a white label holds 4.5:1.
- **Coral Deep** (#ad3e29): hover on coral fills, and small coral text on the coral tint.
- **Coral Soft** (#e0674f): focus rings, field focus borders, today's ring, the active map card's border. Rings, icons and large marks only, never small text.
- **Coral Tint** (#fdeae4): selection background, the open Tools button, the time-picker's selected band.

### Neutral
- **Page Ground** (#f3f6ef, `--page-ground`): the page behind every screen, a pale step of the meadow green. Only `body` uses it.
- **Warm Ground** (#f7f3f0, `--bg`): the inset ground inside white panels: grouped action lists, the cycle summary, segmented tracks, calendar navigation, tool buttons and hovers. It stays warm so the active map reads exactly as before.
- **Surface White** (#ffffff): every card, sheet, field, segmented thumb and Home garden sign.
- **Sunken** (#f2ece8): segmented tracks, calendar navigation buttons, neutral icon chips, hover on rows and secondary buttons, the Home export chips.
- **Ink** (#1f1a17): all primary text in the working app; also the toast ground.
- **Ink Muted** (#6f655c): secondary text, labels, inactive phone tabs, the select chevron. Darkens to #4a423c under `prefers-contrast: more`.
- **Line** (12% ink) and **Line Soft** (6% ink): field and secondary-button borders; row dividers and the tab bar's top edge. Both firm up under `prefers-contrast: more`.
- **Backdrop** (32% ink): the dim behind sheets.

### Status
- **Danger** (#b42318) on **Danger Tint** (#fdecea): destructive labels and their hover.
- Info, success and warning tints with their inks carry sync warnings and feedback notes only.

### Observation data (fixed)
The `--data-*`, `--calendar-*`, `--tool-*` and legacy base colours are governed separately from the interface. Fertile days fill pale green, menstruation days fill pale rose; the chart draws with the `data-*` values; the four chart tools each carry a soft pastel of what they draw. `chart-palette.js` mirrors these values for the canvas and `test/chart-palette.test.js` keeps them in sync with `styles/tokens.css`. The Home "calendar" sign draws a small demo month whose period days use the real period fill, because there the colour still means what it means.

### Header bloom
A flat pale blush band (**Bloom Ground**) with **Bloom Ink** for the app name and **Bloom Ink Muted** for account text and inactive desktop tabs, both above 4.5:1 on the band (tested). The brand mark is a five-petal flower: **Bloom Petal** with a **Petal Edge** outline around a buttery **Heart**. Above 900px a thin botanical sprig (sage **Leaf** strokes on **Leaf Tint** leaves, two small blossoms) sits clipped into the band's bottom-right corner behind the content; it is hidden on phones, between 561 and 900px, and under `prefers-contrast: more`. The phone map title row takes the same band and flower, and the welcome page's brand mark reuses the flower.

### Home meadow
A flat **Meadow Sky** blush over three sage hills stepping from **Hill Far** through **Hill Mid** to **Hill Near**, ending on **Meadow Ground**, which continues below as the ground the garden signs stand on. Gerberas grow on **Stem** strokes with **Leaf** leaves; petals come in five tones, each with a deeper inner ring (peach, rose, butter, lavender, white), around a cocoa **Disc** with a **Sun** eye. A soft butter sun sits top right at 85% opacity. **Meadow Ink** (#33242b) and **Meadow Ink Muted** carry all Home text; **Post** browns the sign posts, **Soon Line** dashes the coming-soon signs, and **Meadow Rule** is the footer hairline.

### Named Rules
**The One Voice Rule.** Coral is the only interface accent. It marks what to press, what is selected, where focus is, and where you are. On Home it appears only as the Sign in pill, focus rings and the hover underline of the Create account link; the demo calendar's selected day is Meadow Ink, not coral.

**The Scenery Rule.** Bloom and meadow colours are decoration only and never encode an observation, a state or a navigation target. Flowers are allowed only in the header bloom, the Home meadow, the sprig above screen titles and the empty-state bloom; never on the active map, its calendar, chart or sheets.

**The Bloom Stays Home Rule.** `--bloom-*` colours appear only in the app header, the phone map title row and the welcome brand mark; `test/css-tokens.test.js` enforces it.

**The Meadow Stays in the Garden Rule.** `--meadow-*` colours are used only in `styles/home.css` and for the garden accents in `styles/garden.css` (screen-title sprig, empty-state bloom), never inside the active map.

**The Data Is Not Decoration Rule.** Observation colours appear only where they encode a recorded observation or a chart tool's mark. Never use them for navigation, emphasis, illustration or brand.

**The Mirror Rule.** A colour the chart draws lives in `tokens.css` first and is mirrored in `chart-palette.js`; change both or neither.

**The Token Source Rule.** Every hex colour lives in `styles/tokens.css`; other stylesheets reference tokens (tested).

## Typography

**Display Font:** Inter (self-hosted variable, falling back to the system UI sans); Rubik Variable (self-hosted, Cyrillic-capable, `--font-display`) for titles
**Body Font:** Inter
**Label Font:** Inter

**Character:** One neutral, highly legible sans across the working app, with tight negative tracking on large weights and tabular figures wherever numbers are compared. A rounded, friendly Rubik sets the titles (Home headlines and welcome brand, screen titles, map and profile dialog titles, the month label and the map name) over Inter body copy, so the app speaks a little warmer without touching its controls or numbers.

### Hierarchy
- **Display** (700, 2rem, 1.05, -0.04em): screen titles on Profile and My Maps; phone size clamps between 1.8125rem and 2.125rem.
- **Headline** (650, 2rem, tabular): the selected day's temperature on the phone dock.
- **Title** (650, 1.0625 to 1.125rem, -0.015 to -0.02em): app name in the header, month label, card titles.
- **Body** (400, 1rem, 1.5): running text; supporting paragraphs at 0.9375rem.
- **Control** (500 to 600, 0.875rem): field values, button labels, tab labels. Primary button labels are 600.
- **Label** (600, 0.8125rem): field labels, section titles, account bar, secondary metadata. Sentence case, no tracking.
- **Home Display** (Rubik 650, fluid 2.25 to 4.25rem, 1.04, -0.025em, max 13ch, balanced): the one hero headline in the sky. Its lede is Inter 1.0625rem in Meadow Ink Muted, max 34ch.
- **Home Headline** (Rubik 600, 1.5rem): the garden section titles.
- **Home Title** (Rubik 560, 1.0625rem): the title on each garden sign; sign text is Inter 0.9375rem.

Calendar cells are the exception to rem-only sizing: the date numeral is `min(0.8125rem, 4.4cqi)` and the cycle-day numeral `min(0.5625rem, 3cqi)`. The Home hero headline is the one fluid size, a rem-anchored clamp.

### Named Rules
**The Tabular Figures Rule.** Every number a reader compares across rows or days (temperature, date numerals, times) uses `font-variant-numeric: tabular-nums`.

**The rem Rule.** Text sizes are in rem so they follow the reader's text setting; container-query clamps are allowed only inside fixed-size cells, and the Home hero headline's clamp keeps rem bounds.

**The Two Voices Rule.** Rubik sets titles only: Home headlines and the welcome brand, screen titles, the map and profile dialog titles, the calendar month label and the map name. The active map's own dialogs (Edit Day and its sheets), every control, every body line and every number stay in Inter.

## Layout

A single centred column (max 1100px, 36px top and 24px side padding on desktop) of white cards on the ground. The spacing scale is 4, 8, 12, 16, 24, 32, 48, 64px; cards pad 16px on phones and up to 26px on desktop; card stacks gap 12 to 16px.

Two layout modes switch at one breakpoint expression, `(max-width: 560px), (max-height: 500px) and (pointer: coarse)`:
- **Phone:** the header nav becomes a bottom tab bar of four tabs (Home, Active Map, Maps, Profile) with 52px items plus safe-area inset; the header itself drops its own stacking context (`isolation: auto`) so the fixed tab bar stays above page content. Dialogs become bottom sheets with a grabber; the active map shows a segmented Calendar/Graph switch, a white calendar card, and a white "today" dock.
- **Desktop and tablet:** the header is a grid (brand, account, language over a row of plain text tabs in the same order); the active map shows calendar, chart and sidebar side by side, collapsing progressively at 900px.

**Home** is full-bleed. For visitors the hero fills the first screen (`100svh`) with its own top bar (flower brand left, language picker and a white Sign in pill right; below 360px the bar's pill hides and the hero's Sign in remains). Copy sits in the sky (40px 24px on phones, 64px 56px from 720px), and the meadow SVG grows from the bottom edge, overlapping the copy by 56 to 64px. For signed-in phones the meadow reaches down to the tab bar under the header band. Below the hero, the garden: feature signs stack on phones and run three across from 720px, coming-soon signs two across; row gaps are 30px on phones and 52px on wide screens so posts have room. Above 1100px the visitor page keeps its content within the 1100px column while the sky and meadow run edge to edge.

Below 380px, four-way segmented controls wrap to two columns. Every layout is checked at about 320px, 390px and desktop width; nothing scrolls horizontally except the chart's own map scroller.

## Elevation & Depth

Layered, not flat: white cards lift off the warm ground with one soft ambient shadow; overlays float above with a deeper shadow. Inside a card, depth is tonal (sunken tracks, ground-coloured inset lists), never a second shadow. The meadow builds depth by flat overlap only: three hills in stepping sage, a far flower row faded to 0.78, near flowers largest.

### Shadow Vocabulary
- **Card** (`0 1px 2px rgba(31,26,23,0.04), 0 6px 20px rgba(31,26,23,0.05)`): every resting card, the phone dock, the round phone header buttons, the Home garden signs. Hover does not change it.
- **Float** (`0 16px 40px rgba(31,26,23,0.14), 0 2px 8px rgba(31,26,23,0.06)`): dialogs, bottom sheets, the time-picker panel.
- **Thumb** (`0 1px 2px rgba(31,26,23,0.08), 0 2px 6px rgba(31,26,23,0.06)`): the white thumb of a segmented control.
- **Tab bar** (`0 -4px 20px rgba(31,26,23,0.05)`): the phone tab bar's upward edge.

### Named Rules
**The One Lift Rule.** A card has one shadow and keeps it on hover; hover shows as a soft border or a sunken fill, never as a card jumping up. Coming-soon signs carry no shadow at all.

**The Single Glass Rule.** The phone tab bar is the only translucent surface: 78% white, `saturate(1.6) blur(20px)`, solid white without `backdrop-filter` support or under `prefers-reduced-transparency`. Project tests forbid gradients and glass everywhere else except the time-picker drum's fade. The header band, sky and hills are flat colour.

## Shapes

Soft, consistent rounding that steps up with size: 10px for calendar tiles and icon chips, 12px for fields and segmented thumbs, 14px for buttons, action lists and nested blocks, 22px for cards, sheets and the header band (sheets round only their top corners), and a full pill for the round phone header buttons, the sheet grabber, the Home Sign in pills and the coming-soon tag. Calendar days are rounded squares, not circles, because each tile carries a cycle-day numeral and marker dots. Borders are rare: cards have none, fields and secondary buttons carry one hairline, coming-soon signs one 1.5px dash.

Home has its own softer silhouettes: garden signs round at 18px, the signed-in Home panel at 28px, and everything in the meadow is drawn with round line caps and slim, curved petals. No hard corners appear in the meadow.

## Components

### Buttons
Solid, calm and obvious: one filled coral button per view, everything else quiet.
- **Shape:** gently rounded (14px), 44px tall (50px on the phone dock).
- **Primary:** coral fill, white 600 label, 0 18px padding; hover deepens to Coral Deep; press scales to 0.995.
- **Secondary:** white with a hairline border and ink label; hover goes sunken.
- **Destructive:** secondary shape with a danger label; hover takes the danger tint and danger border.
- **Focus:** a 2px coral-soft outline offset 2px on every control (3px on Home).

### Cards / Containers
- **Corner Style:** 22px.
- **Background:** white on the warm ground.
- **Shadow Strategy:** Card shadow at rest and on hover (see Elevation).
- **Border:** transparent; on hover a 6% ink hairline; the active map card takes a coral-soft border.
- **Internal Padding:** 16px on phones, 16 to 26px on desktop.
- **Nested blocks** (cycle summary, action lists) sit as ground-coloured, 14px-rounded insets with no border or shadow.

### Inputs / Fields
- **Style:** white, one hairline (12% ink), 12px radius, 44px tall, 0.875rem text, coral caret.
- **Focus:** border shifts to coral soft with a 3px coral-soft halo at 22%.
- **Selects:** native arrow removed; an authored 18px chevron in Ink Muted sits 10px from the right edge.

### Language Picker
One shared flag picker (a disclosure with a flag trigger and a grid of 44px flag buttons, the current language on a sunken fill) is used in the app header, on the welcome top bar (a 40px pill on 70% white) and on the sign-in card. There is no native language select.

### Segmented Control
A sunken track (15px radius) holding transparent options in Ink Muted; the active option is a white thumb with the Thumb shadow, ink label at 600. Used for Calendar/Graph and every choice group in the editors.

### Calendar Day Cell (signature)
Ordinary days are bare numerals: no fill, no border, 10px rounded square, tabular 500 weight, cycle-day numeral in Ink Muted at the corner. Only data states fill a tile: fertile days pale green with green-grey text, menstruation pale rose with rose text, spotting as an inset rose ring. The selected day fills coral with a white numeral; a selected data day keeps its data fill and takes a 2px inset coral ring instead. Today, when not selected, carries a 1.5px coral-soft inset ring and coral bold numerals. Hover goes sunken; press scales to 0.94.

### Action List
Sidebar actions, the Edit Day sheet and the Tools sheet are one grouped list: a **List Ground** (#f1f5ec, `--list-ground`) 14px-rounded block, 52px rows, 1px soft dividers, a slightly deeper green on hover (#e7eee0). Every icon chip, observation or tool, is 32px, 10px-rounded, a pale tint of its own colour with the icon in the deeper hue and one 1px ring of 16% of that hue: temperature `--chip-temperature` on its tint, bleeding and mucus their `--chip-*` pairs, cervix the cervix data pair, tools the `--tool-*` pairs; interface rows use the neutral sunken chip. The colours keep their meaning; only the treatment is shared (`styles/sheets.css`). In the sidebar, Edit Day leads the list as the one coral row (action fill, white label, a 20% white chip), the wide-screen twin of the phone dock's coral Day record button.

### App Header (bloom band)
A 22px-rounded Bloom Ground band. On desktop: the flower mark (28px) and app name (Title, Bloom Ink) at left, account text and quiet transparent buttons (36px, Bloom Ink Muted, 70%-white hover) and the language picker at right, text tabs along the bottom edge. The sprig occupies a 210px corner on wide screens only, which is why the band reserves 216px of right padding there. On phones the band holds the flower, name and account row; the tabs leave for the bottom bar.

### Navigation
- **Order:** Home, Active Map, Maps, Profile, on every size; the first tab's label is "Home".
- **Phone:** a frosted bottom tab bar (see The Single Glass Rule) with four tabs, icon over label; inactive tabs in Ink Muted, the active tab in coral.
- **Desktop:** plain text tabs (0.9375rem, 500, 44px) along the bottom edge of the bloom band; inactive in Bloom Ink Muted, the active tab Bloom Ink with a 2px coral underline.
- **Screen changes** cross-fade in 160ms; the tab bar holds still.

### Home Meadow (signature)
A generated SVG scene (1200 by 480 viewBox, sliced from the bottom so the foreground always shows) under the blush sky: three hills, each carrying a row of gerberas built from one symbol and placed with lean, scale and one of five petal tones; the far row fades to 0.78. Each flower sways about its stem base between -1.4 and 1.4 degrees, 6 to 9 seconds per swing with staggered delays, for 8 alternations and then rests; under `prefers-reduced-motion` the meadow is still. The scene is `aria-hidden` and carries no information.

### Garden Signs
White 18px-rounded signs with the Card shadow on Meadow Ground, Rubik title, Inter text in Meadow Ink Muted, each holding a small drawn demo (a month grid, a temperature line, export chips). From 720px each sign stands on a 6px Post planted in a 72px grass tuft; on phones, where posts would read as connectors between stacked cards, a grass strip with three small buds is drawn in front of each sign's bottom edge instead.

### Garden Sprig
A 56 by 25px drawn stem with two Meadow Leaf leaves and one rose five-petal bloom with a butter heart, set just above each screen title (Profile, Saved cycle maps, Create map). Decorative, `aria-hidden`, one per screen, never on the active map. From `gardenSprig()` in `views/view-utils.js`.

### Empty-State Bloom
A single 56 by 86px peach gerbera on a sage stem with one leaf, centred above the empty-state title (a filtered map list with no results). Decorative, `aria-hidden`. From `gardenBloom()`.

### Coming-Soon Signs
The same sign, unlifted: 70% white with a 1.5px dashed Soon Line border and no shadow. Its state rides as a small butter sticker tag in the top-right corner, rotated 3 degrees, never as a label above the title. Coming-soon signs hold honest placeholders only.

### Home Actions and Footer
Visitors get one coral Sign in pill (52px, 0 28px, 650) and a Create account text link (Meadow Ink, 1.5px underline that turns coral on hover); the top bar repeats Sign in as a white 40px pill. Signed-in Home has no call to action and no shortcut tiles; the header and tab bar navigate. The footer, under a Meadow Rule hairline, states that the app is an educational tool and not medical advice, then the version and a changelog link (0.8125rem, Meadow Ink Muted).

### Sheets and Dialogs
On phones, dialogs are bottom sheets: white, 22px top corners, Float shadow, 32% ink backdrop, a 36 by 5px pill grabber, entering and leaving with `transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)`. On desktop they scale in from 0.96. Under `prefers-reduced-motion` they appear without sliding or scaling.

### Toast
Ink ground, white text, full width minus 24px on phones; a single action (Undo) stays on the same row at 44px.

## Do's and Don'ts

### Do:
- **Do** use coral (#c84a32) for exactly one primary action per view, the selected day, focus, today and the active tab, and on Home only for Sign in.
- **Do** keep observation colours bound to recorded data and chart tools; add a new chart colour to `tokens.css` and `chart-palette.js` together.
- **Do** put content on white 22px cards with the one Card shadow on the warm ground.
- **Do** keep every colour value in `styles/tokens.css` and reference it by token.
- **Do** keep bloom colours in the header, the phone map title row and the welcome brand, and meadow colours on Home.
- **Do** keep controls at least 44px tall and set text in rem.
- **Do** use tabular figures for temperatures, dates and times.
- **Do** honour `prefers-reduced-motion`, `prefers-contrast: more` and `prefers-reduced-transparency`, each with a real fallback; decorative motion must end on its own.
- **Do** change appearance by toggling CSS classes; never write inline styles from JS.
- **Do** check every change at about 320px, 390px and desktop width.

### Don't:
- **Don't** bring back the notebook look: cream paper, pastel or peach button fills, hairline-boxed day cells.
- **Don't** use observation colours for decoration, navigation, brand or emphasis.
- **Don't** let a bloom or meadow colour, or a flower, encode an observation, a state or a fertility meaning.
- **Don't** draw flowers anywhere except the header bloom, the Home meadow, the screen-title sprig and the empty-state bloom; never on the active map.
- **Don't** add gradients or glass anywhere except the time-picker drum fade and the phone tab bar.
- **Don't** lift cards on hover or stack a second shadow inside a card.
- **Don't** use Rubik for body text, controls, numbers or the active map's dialogs.
- **Don't** add medical or contraceptive styling, fertility verdict colours, hearts, or gamification.
- **Don't** add uppercase eyebrow or kicker labels above titles; a state goes on the sign as a corner tag.
- **Don't** make the interface dark, clinical or technical.

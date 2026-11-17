---
name: Cycle Tracker
description: Soft white cards on a warm off-white ground with one coral accent, built for recording a day of observations on a phone.
colors:
  coral: "#c84a32"
  coral-deep: "#ad3e29"
  coral-soft: "#e0674f"
  coral-tint: "#fdeae4"
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
  tab-bar-phone:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
  tab-bar-phone-active:
    textColor: "{colors.coral}"
  nav-desktop-active:
    textColor: "{colors.ink}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
---

# Design System: Cycle Tracker

## Overview

**Creative North Star: "The Morning Card"**

The category standard, played straight at a high craft level. One person, often in bed in dim morning light, opens the app, sees the month and today's reading at a glance, taps one coral button to record the day, and reads the chart without hunting for controls. Everything in the interface serves that: soft white cards on a warm off-white ground, one coral accent, a neutral sans with tabular figures, and generous touch targets.

The interface stays quiet so the observations can speak. Colour in the interface means exactly one thing (coral: act here, you are here, this is selected); every other colour on screen belongs to the recorded data and the chart. Depth is a single soft ambient lift under white cards and a deeper float under sheets. The one translucent material is the phone tab bar, frosted at the user's explicit request, with a solid fallback.

This world replaces the earlier notebook look: no cream paper, no pastel button fills, no hairline-boxed day cells. It must not feel clinical, dark or technical, and it carries no medical or contraceptive styling. The one decorative exception is the header bloom: a pale blush band with a flower mark and a thin botanical sprig.

**Key Characteristics:**
- Warm off-white ground, white cards, one ambient shadow.
- One coral accent, used for the primary action, selection, focus, today and the active tab.
- Inter, self-hosted, tabular figures for every number that is compared.
- 44px minimum controls, 52px action rows, 50px primary buttons on the phone dock.
- Observation colours are data, never decoration.

## Colors

A warm neutral interface with a single coral voice, set beside a fixed, separately governed palette of observation colours.

### Primary
- **Coral** (#c84a32): the filled primary button with a white label, the selected calendar day, the brand mark arc, the caret, the active phone tab, the desktop tab underline. Darkened from the softer coral so a white label holds 4.5:1.
- **Coral Deep** (#ad3e29): hover on coral fills, and small coral text on the coral tint (keeps 4.5:1).
- **Coral Soft** (#e0674f): focus rings, field focus borders, today's ring, the active map card's border. Rings, icons and large marks only, never small text.
- **Coral Tint** (#fdeae4): selection background, icon-chip ground for menu cards, the open Tools button, the time-picker's selected band.

### Neutral
- **Warm Ground** (#f7f3f0): the page; also the inset ground of grouped action lists and the cycle summary block inside a white panel.
- **Surface White** (#ffffff): every card, sheet, field and the segmented thumb.
- **Sunken** (#f2ece8): segmented tracks, calendar navigation buttons, neutral icon chips, hover on rows and secondary buttons.
- **Ink** (#1f1a17): all primary text; also the toast ground.
- **Ink Muted** (#6f655c): secondary text, labels, inactive tabs, the select chevron. Darkens to #4a423c under `prefers-contrast: more`.
- **Line** (rgba 12% ink) and **Line Soft** (6% ink): field and secondary-button borders; row dividers and the tab bar's top edge. Both firm up under `prefers-contrast: more`.
- **Backdrop** (32% ink): the dim behind sheets.

### Status
- **Danger** (#b42318) on **Danger Tint** (#fdecea): destructive labels and their hover.
- Info, success and warning tints (#e8f1ff, #e2f2dd, #fff4dc) with their inks carry sync warnings and feedback notes only.

### Observation data (fixed)
The `--data-*`, `--calendar-*`, `--tool-*` and legacy base colours (`--blue`, `--red`, `--orange`, `--green`, `--mucus-navy`, `--cervix-light`) are unchanged by this world. Fertile days fill pale green (#cfe7b4), menstruation days fill pale rose (#f4c7cf); the chart draws with the `data-*` values; the four chart tools each carry a soft pastel of what they draw. `chart-palette.js` mirrors these values for the canvas and `test/chart-palette.test.js` keeps them in sync with `styles/tokens.css`.

### Header bloom
The app header is the one floral place in the app, at the user's explicit request (2026-11-17): a flat pale blush band (**Bloom Ground** #f8e4e6, 22px radius) with **Bloom Ink** (#2a1f21) for the name and **Bloom Ink Muted** (#75565b) for account text and inactive tabs (both above 4.5:1 on the band). The brand mark is a five-petal flower (**Bloom Petal** #f4ccd2 with a **Petal Edge** #dd9eaa outline and a buttery **Heart** #ecc77f). On wide screens (over 900px) a thin botanical sprig (sage **Leaf** #98b293 strokes on **Leaf Tint** #e1ebdc, two small blossoms) sits in the band's bottom-right corner behind the content; it is hidden on phones, on narrow desktop and under `prefers-contrast: more`. The phone map title row (`.mobile-map-header`) takes the same band and flower. The active tab keeps the coral underline.

### Named Rules
**The One Voice Rule.** Coral is the only interface accent. It marks what to press, what is selected, where focus is, and where you are. The only other tinted chrome is the header bloom band, which carries no meaning.

**The Bloom Stays Home Rule.** `--bloom-*` colours and floral drawings appear only in the app header and the phone map title row; `test/css-tokens.test.js` enforces it.

**The Data Is Not Decoration Rule.** Observation colours appear only where they encode a recorded observation or a chart tool's mark. Never use them for navigation, emphasis, illustration or brand.

**The Mirror Rule.** A colour the chart draws lives in `tokens.css` first and is mirrored in `chart-palette.js`; change both or neither.

## Typography

**Display Font:** Inter (self-hosted variable, falling back to the system UI sans)
**Body Font:** Inter
**Label Font:** Inter

**Character:** One neutral, highly legible sans across the whole app, with tight negative tracking on large weights and tabular figures wherever numbers are compared (temperatures, calendar dates, times). Self-hosting keeps figures identical on Android and Windows.

### Hierarchy
- **Display** (700, 2rem, 1.05, -0.04em): screen titles on Profile and My Maps; phone size clamps between 1.8125rem and 2.125rem.
- **Headline** (650, 2rem, tabular): the selected day's temperature on the phone dock. The one large number on the first viewport.
- **Title** (650, 1.0625 to 1.125rem, -0.015 to -0.02em): app name in the header, month label, card titles.
- **Body** (400, 1rem, 1.5): running text; supporting paragraphs at 0.9375rem.
- **Control** (500 to 600, 0.875rem): field values, button labels, tab labels. Primary button labels are 600.
- **Label** (600, 0.8125rem): field labels, section titles, account bar, secondary metadata. Sentence case, no tracking.

Calendar cells are the exception to rem-only sizing: the date numeral is `min(0.8125rem, 4.4cqi)` and the cycle-day numeral `min(0.5625rem, 3cqi)`, so text follows the reader's setting only up to what a fixed cell can hold.

### Named Rules
**The Tabular Figures Rule.** Every number a reader compares across rows or days (temperature, date numerals, times) uses `font-variant-numeric: tabular-nums`.

**The rem Rule.** Text sizes are in rem so they follow the reader's text setting; container-query clamps are allowed only inside fixed-size cells.

## Layout

A single centred column (max 1100px, 36px top and 24px side padding on desktop) of white cards on the ground. The spacing scale is 4, 8, 12, 16, 24, 32, 48, 64px; cards pad 16px on phones and up to 26px on desktop; card stacks gap 12 to 16px.

Two layout modes switch at one breakpoint expression, `(max-width: 560px), (max-height: 500px) and (pointer: coarse)`:
- **Phone:** the header nav becomes a bottom tab bar (52px items plus safe-area inset); dialogs become bottom sheets that rise from the bottom edge with a grabber; the active map shows a segmented Calendar/Graph switch, a white calendar card, and a white "today" dock with date, cycle day, big temperature, and Day record (coral) beside Tools.
- **Desktop and tablet:** the header is a grid (brand, account, language over a row of plain text tabs on one hairline); the active map shows calendar, chart and sidebar side by side, collapsing progressively at 900px.

Below 380px, four-way segmented controls wrap to two columns. Every layout is checked at about 320px, 390px and desktop width; nothing scrolls horizontally except the chart's own map scroller.

## Elevation & Depth

Layered, not flat: white cards lift off the warm ground with one soft ambient shadow; overlays float above with a deeper shadow. Inside a card, depth is tonal (sunken tracks, ground-coloured inset lists), never a second shadow.

### Shadow Vocabulary
- **Card** (`0 1px 2px rgba(31,26,23,0.04), 0 6px 20px rgba(31,26,23,0.05)`): every resting card, the phone dock, the round phone header buttons. Hover does not change it.
- **Float** (`0 16px 40px rgba(31,26,23,0.14), 0 2px 8px rgba(31,26,23,0.06)`): dialogs, bottom sheets, the time-picker panel.
- **Thumb** (`0 1px 2px rgba(31,26,23,0.08), 0 2px 6px rgba(31,26,23,0.06)`): the white thumb of a segmented control.
- **Tab bar** (`0 -4px 20px rgba(31,26,23,0.05)`): the phone tab bar's upward edge.

### Named Rules
**The One Lift Rule.** A card has one shadow and keeps it on hover; hover shows as a soft border or a sunken fill, never as a card jumping up.

**The Single Glass Rule.** The phone tab bar is the only translucent surface: 78% white, `saturate(1.6) blur(20px)`, solid white without `backdrop-filter` support or under `prefers-reduced-transparency`. Project tests forbid gradients and glass everywhere else except the time-picker drum's fade.

## Shapes

Soft, consistent rounding that steps up with size: 10px for calendar tiles and icon chips, 12px for fields and segmented thumbs, 14px for buttons, action lists and nested blocks, 22px for cards and sheets (sheets round only their top corners), and a full pill for the round phone header buttons and the sheet grabber. Calendar days are rounded squares, not circles, because each tile carries a cycle-day numeral and marker dots. Borders are rare: cards have none, fields and secondary buttons carry one hairline.

## Components

### Buttons
Solid, calm and obvious: one filled coral button per view, everything else quiet.
- **Shape:** gently rounded (14px), 44px tall (50px on the phone dock).
- **Primary:** coral fill, white 600 label, 0 18px padding; hover deepens to Coral Deep; press scales to 0.995.
- **Secondary:** white with a hairline border and ink label; hover goes sunken.
- **Destructive:** secondary shape with a danger label; hover takes the danger tint and danger border.
- **Focus:** a 2px coral-soft outline offset 2px on every control.

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

### Segmented Control
A sunken track (Sunken, 15px radius) holding transparent options in Ink Muted; the active option is a white thumb with the Thumb shadow, ink label at 600. Used for Calendar/Graph and every choice group in the editors.

### Calendar Day Cell (signature)
Ordinary days are bare numerals: no fill, no border, 10px rounded square, tabular 500 weight, cycle-day numeral in Ink Muted at the corner. Only data states fill a tile: fertile days pale green with green-grey text, menstruation pale rose with rose text, spotting as an inset rose ring. The selected day fills coral with a white numeral; a selected data day keeps its data fill and takes a 2px inset coral ring instead. Today, when not selected, carries a 1.5px coral-soft inset ring and coral bold numerals. Hover goes sunken; press scales to 0.94.

### Action List
Sidebar actions and the Edit Day sheet are one grouped list, not separate boxes: a ground-coloured 14px-rounded block, 52px rows, 1px soft dividers between rows, sunken hover. Observation rows keep a light tint of their data colour on their icon chip; interface rows use a neutral sunken chip.

### Navigation
- **Phone:** a frosted bottom tab bar (see The Single Glass Rule) with icon over label; inactive tabs in Ink Muted, the active tab in coral with a 2px icon stroke.
- **Desktop:** plain text tabs (0.9375rem, 500) along the bottom edge of the blush header band; the active tab is Bloom Ink with a 2px coral underline.
- **Screen changes** cross-fade in 160ms; the tab bar holds still.

### Sheets and Dialogs
On phones, dialogs are bottom sheets: white, 22px top corners, Float shadow, 32% ink backdrop, a 36 by 5px pill grabber, entering and leaving with `transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)`; the grabber and title are a drag zone. On desktop they scale in from 0.96. Under `prefers-reduced-motion` they appear without sliding or scaling.

### Toast
Ink ground, white text, full width minus 24px on phones; a single action (Undo) stays on the same row at 44px.

## Do's and Don'ts

### Do:
- **Do** use coral (#c84a32) for exactly one primary action per view, the selected day, focus, today and the active tab, and nothing else.
- **Do** keep observation colours bound to recorded data and chart tools; add a new chart colour to `tokens.css` and `chart-palette.js` together.
- **Do** put content on white 22px cards with the one Card shadow on the warm ground.
- **Do** keep controls at least 44px tall and set text in rem.
- **Do** use tabular figures for temperatures, dates and times.
- **Do** honour `prefers-reduced-motion`, `prefers-contrast: more` and `prefers-reduced-transparency`, each with a real fallback.
- **Do** change appearance by toggling CSS classes; never write inline styles from JS.
- **Do** check every change at about 320px, 390px and desktop width.

### Don't:
- **Don't** bring back the notebook look: cream paper, pastel or peach button fills, hairline-boxed day cells.
- **Don't** use observation colours for decoration, navigation, brand or emphasis.
- **Don't** add gradients or glass anywhere except the time-picker drum fade and the phone tab bar.
- **Don't** lift cards on hover or stack a second shadow inside a card.
- **Don't** add medical or contraceptive styling, fertility verdict colours, hearts, or gamification; flowers stay in the header bloom only.
- **Don't** add uppercase eyebrow or kicker labels above titles.
- **Don't** make the interface dark, clinical or technical.

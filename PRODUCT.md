# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Individuals who want to record and review their own symptothermal cycle observations (daily temperature, bleeding, mucus, cervix and other signs) and understand their own records. Primarily used on a phone, in a mobile browser, during daily routines; desktop is a supported secondary context.

## Product Purpose
Cycle Tracker is a browser app for recording daily observations and reviewing them on a symptothermal cycle chart (calendar plus basal body temperature graph). It is an educational and recording tool. Success means the user can record a day quickly, see the cycle clearly, and export or import their data (PDF, XLSX, JSON). The app does not interpret the data for the user.

## Positioning
The app records and displays observations; the user decides how to interpret them. It never gives medical advice, contraception guidance or automated fertility assessment. It plots temperature on a fixed 0.05 °C grid and can show a time-adjusted temperature beside the original measurement.

## Operating Context
- Daily entry: choose a date, open Edit Day, record observations.
- Review: the active map combines calendar, cycle summary, temperature chart and observation rows; Day Info gives a read-only summary.
- Mark-up: fertile-range selection, coverlines, peak markers, arrows and cross-cell marks placed on the chart.
- Export and import: PDF, XLSX and JSON; import reads the JSON backup embedded in exports.
- Languages: Czech, Slovak, Ukrainian and English (English strings are the keys).

## Capabilities and Constraints
- Vanilla JavaScript ES modules, Vite, HTML Canvas for the chart, plain CSS. No UI framework.
- Serverless backend on Vercel with Neon Postgres and Neon Auth; account state is one JSONB document (max 2 MB) with version compare-and-swap sync.
- Local cache with an upload queue per account; a dev auth bypass exists for localhost only.
- Web app that is mobile-first: the phone layout (roughly 320–390 px, touch input, calendar/graph switching) is the primary design target; desktop is adapted from it, not the other way round.
- Active prototype (v0.17.1).

## Brand Commitments
- Name: "Cycle Tracker".
- Tone: calm, factual, non-judgmental; the app presents observations without verdicts.
- No medical, contraceptive or diagnostic claims in any copy or visuals.

## Evidence on Hand
- README screenshots: `assets/readme/` (active map, mobile calendar and graph, edit day, day info, fertile range).
- Live demo link exists in the README; no testimonials, customers or benchmarks are on record. Do not invent any.

## Product Principles
- The user owns the interpretation; the app records and shows, it does not conclude.
- Design for the phone first: one-handed, touch-friendly recording; desktop extends it.
- Record a day with as few taps as possible; the chart is the product's core view.
- Data stays intact and portable: exports must remain importable.
- Educational framing only; no fertility or contraception advice in any surface.

## Accessibility & Inclusion
- Works at 320 px width with no horizontal page scroll; touch gestures (pinch, swipe) have button alternatives such as Show all.
- Four supported languages (cs, sk, uk, en); all new user-visible strings need translations.

## Open decisions
- Visual direction is not decided here; it is left to a later design step.

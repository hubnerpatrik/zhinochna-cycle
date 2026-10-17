# Feedback repair progress — 2026-10-17

Numbers refer to the 43-report list extracted in this chat. These repairs are
implemented in the working tree; application changes have not been deployed.
The release metadata and in-app announcement are prepared for version 0.14.0.

The database audit on 2026-10-17 found 42 reports: 18 resolved and 24 open.
Of the open reports, 23 have local implementations below; the remaining report
is the explicitly ignored PDF redesign. No additional reports were found.

## Explicit triage

| Reports | Result |
| --- | --- |
| 1 | Ignored by request; no PDF layout redesign. |
| 2, 5, 6, 7 | Marked resolved in the feedback database by request. |
| 5 | Additionally fixed the creation dialog remaining open after navigation to My Maps. |
| 8 | Removed by request, with a local backup before deletion. |

## Remaining reports implemented locally

| Reports | Result |
| --- | --- |
| 3 | Real Excel (.xlsx) export with numeric/boolean cells and literal user text. |
| 4, 29 | Export options open in a top-layer popover, above map cards and within the viewport. The screenshot in 29 showed clipping of that menu. |
| 9 | Measurement method label in profile details. |
| 10 | Requested Ukrainian usual-measurement-time label. |
| 11 | Requested Ukrainian influence-factor label. |
| 12, 13 | Period terminology in the bleeding editor and Ukrainian labels. |
| 14 | Removed the No bleeding button; selecting an intensity again clears it. |
| 15 | Requested Ukrainian spotting label. |
| 16 | Heavy / Moderate / Light / Spotting scale with matching drop symbols in map cells. |
| 17 | Single checkbox for clots. |
| 18 | Other influence factor reveals a saved text field, also shown in details and exports. |
| 19 | Present / Є for recorded discharge in details and exports; the editor uses a checkbox following the later approved binary-choice design. |
| 20 | Requested Ukrainian Slightly stretchy label. |
| 21, 22, 23 | Requested Ukrainian height labels, preserving the separate Medium wording for openness. |
| 24 | Single checkbox for intercourse. |
| 25 | Restored row icons in the mobile observation table. |
| 26, 27 | Additional-symptom and cervix groups appear when recorded anywhere in the current map. |
| 28 | Include unrecorded dates between saved days without inserting fake records; calendar-day numbering stays continuous. |

## Accepted visual refinements

- English remains the source language and the preview defaults to EN.
- Soft duotone scales for mucus and cervix use the same artwork in editors and map cells.
- Creamy uses a cloud; Cross cells uses one diagonal line in the control's text color.
- Actions retain their original pictograms, with translucent fills and centered drawings.
- Navigation, menu cards, row labels and chart tools share the rounded duotone treatment.
- The unauthenticated local preview includes Feedback with isolated local report storage.

## Validation

- 150 automated tests passed with syntax checks and a production build.
- Browser checks confirmed saved/reopened and deselected observations, explicit
  None versus missing values, custom influence-factor text, map creation cancellation,
  the export popover and calendar gaps using an isolated preview session.
- Earlier desktop/phone browser checks verified export placement, mobile row icons,
  intensity/checkmark persistence and Excel ZIP integrity using an independent ZIP reader.
- Feedback statuses for the remaining repaired reports are unchanged, pending deployment.

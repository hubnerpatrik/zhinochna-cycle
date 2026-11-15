# Glossary

Domain terms used in code, reviews and architecture discussions.

- **Map** — one chart of day records (`entries`) with its coverlines, fertile flags and profile snapshot.
- **Cycle start** — a recorded menstruation day whose previous calendar day is not a recorded menstruation day.
- **Cycle** — the days from one cycle start up to the day before the next cycle start.
- **Cycle day** — 1-based position of a date within its cycle; none before the first cycle start.
- **Fertile day** — a day the user marked as fertile. Its source is either the day's `isFertile` flag or the legacy fertile range.
- **Legacy fertile range** — `map.fertileRange` (`start`–`end`), the storage used by older maps. It is still read and never rewritten automatically; saving the fertile-days editor converts it into `isFertile` flags.
- **Cycle model** — the pure module that answers cycle starts, cycle days and fertile days for one map. It merges both fertile-day sources, and the screen and every export read it so they cannot disagree.

// Original Soft duotone artwork approved in the icon exploration.
const droplet='M24 4C20 10 12 17 12 24a12 12 0 0 0 24 0C36 17 28 10 24 4Z';
const artwork={
none:'<path class="observation-icon-line" d="M18 20h12"/>',
dry:`<path class="observation-icon-line" d="${droplet}"/><path class="observation-icon-line" d="m10 35 28-28"/><path class="observation-icon-fill" d="M17 25c0 4 3 7 7 7l8-8-7-10Z"/>`,
moist:`<path class="observation-icon-fill" d="M12 24a12 12 0 0 0 24 0Z"/><path class="observation-icon-line" d="${droplet}"/><path class="observation-icon-line" d="M13 24c4-3 7 3 11 0s7 3 11 0"/><path class="observation-icon-line" d="M18 28q0 4 4 4" opacity=".45"/>`,
wet:`<path class="observation-icon-fill" d="${droplet}"/><path class="observation-icon-line" d="${droplet}"/><path class="observation-icon-line" d="M18 25q0 5 4 6M6 35q4 4 8 0m20 0q4 4 8 0"/>`,
creamy:'<path class="observation-icon-fill" d="M13 31a8 8 0 0 1-1-16 12 12 0 0 1 23-1 9 9 0 0 1 0 18H13Z"/><path class="observation-icon-line" d="M13 31a8 8 0 0 1-1-16 12 12 0 0 1 23-1 9 9 0 0 1 0 18H13Z"/><path class="observation-icon-line" d="M17 25q7 3 14 0" opacity=".35"/>',
slightly:'<path class="observation-icon-fill" d="M14 15q10 7 20 0v12q-10-7-20 0Z"/><path class="observation-icon-line" d="M14 15q10 7 20 0v12q-10-7-20 0ZM5 21h6m-3-3-3 3 3 3m29-3h6m-3-3 3 3-3 3"/>',
stretchy:'<path class="observation-icon-fill" d="M8 14q16 12 32 0v14q-16-12-32 0Z"/><path class="observation-icon-line" d="M8 14q16 12 32 0v14q-16-12-32 0ZM2 17v8m44-8v8M3 21h3m36 0h3"/>',
white:`<path d="${droplet}" fill="#fff"/><path class="observation-icon-line" d="${droplet}"/><path class="observation-icon-line" d="M18 25q0 5 4 6" opacity=".35"/>`,
half:`<path class="observation-icon-fill" d="M24 4C20 10 12 17 12 24a12 12 0 0 0 12 12Z"/><path class="observation-icon-line" d="${droplet}"/><path class="observation-icon-line" d="M24 5v30" opacity=".5"/>`,
clear:`<path class="observation-icon-line" d="${droplet}" stroke-dasharray="2 4"/><path class="observation-icon-line" d="m19 27 9-9m-7 12 8-8" opacity=".4"/>`,
soft:'<path class="observation-icon-fill" d="M14 7q10-5 20 0l-4 13 4 13q-10 5-20 0l4-13Z"/><path class="observation-icon-line" d="M14 7q10-5 20 0l-4 13 4 13q-10 5-20 0l4-13ZM5 20h8m22 0h8m-34-3 4 3-4 3m30-6-4 3 4 3"/>',
high:'<path class="observation-icon-line" d="M13 5v29m-4-4 4 4 4-4M9 9l4-4 4 4M24 6h15m-15 28h15" opacity=".6"/><circle class="observation-icon-fill" cx="31" cy="13" r="6"/><circle class="observation-icon-line" cx="31" cy="13" r="6"/>',
open:'<circle class="observation-icon-fill" cx="24" cy="20" r="15"/><circle class="observation-icon-line" cx="24" cy="20" r="15"/><circle cx="24" cy="20" r="8" fill="var(--observation-icon-paper, #fffaf6)"/><circle class="observation-icon-line" cx="24" cy="20" r="8"/>',
};
artwork.hard = '<circle class="observation-icon-fill" cx="24" cy="20" r="12"/><circle class="observation-icon-line" cx="24" cy="20" r="12"/><path class="observation-icon-line" d="M4 20h5m30 0h5"/>';
const height = y => '<path class="observation-icon-line" d="M13 5v29m-4-4 4 4 4-4M9 9l4-4 4 4M24 6h15m-15 28h15" opacity=".6"/><circle class="observation-icon-fill" cx="31" cy="'+y+'" r="6"/><circle class="observation-icon-line" cx="31" cy="'+y+'" r="6"/>';
const opening = radius => '<circle class="observation-icon-fill" cx="24" cy="20" r="15"/><circle class="observation-icon-line" cx="24" cy="20" r="15"/><circle class="observation-icon-line" cx="24" cy="20" r="'+radius+'" fill="var(--observation-icon-paper, #fffaf6)"/>';
const groups = {
  sensation: { '': artwork.none, dry: artwork.dry, moist: artwork.moist, wet: artwork.wet },
  consistency: { '': artwork.none, creamy: artwork.creamy, slightlyStretchy: artwork.slightly, stretchy: artwork.stretchy },
  color: { '': artwork.none, white: artwork.white, whiteTranslucent: artwork.half, translucent: artwork.clear,
    other: '<path class="observation-icon-line" d="'+droplet+'"/><path class="observation-icon-line" d="M24 17v12m-6-6h12"/>' },
  cervixFirmness: { hard: artwork.hard, soft: artwork.soft },
  cervixHeight: { low: height(27), medium: height(20), high: artwork.high },
  cervixOpenness: { closed: opening(1.5), medium: opening(4.5), open: artwork.open },
};
export function duotoneArtwork(group, value) { return groups[group]?.[value] || ''; }

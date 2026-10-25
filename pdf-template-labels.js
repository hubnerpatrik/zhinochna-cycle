import { t } from './i18n.js';
import { TEMP_FACTORS } from './core.js';

// Replace the reference's printed labels, while retaining its original grid.
export function drawTemplateLabels(ctx) {
  const blank = (x, y, w, h) => { ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h); };
  const label = (source, x, y, width, height, size = 7) => {
    ctx.font = `${size}px Arial, sans-serif`; ctx.fillStyle = '#111';
    const lines = []; let line = '';
    for (const word of t(source).split(' ')) {
      if (line && ctx.measureText(line + ' ' + word).width > width) { lines.push(line); line = ''; }
      line += (line ? ' ' : '') + word;
    }
    lines.push(line);
    lines.forEach((part, i) => ctx.fillText(part, x, y + Math.max(size, (height - lines.length * (size + 1)) / 2 + size) + i * (size + 1), width));
  };
  blank(24, 43, 669, 20);
  for (const [source, x, width] of [['Map name', 26, 40], ['Month', 197, 39], ['Year', 377, 27], ['Age', 523, 27]]) label(source, x, 47, width, 14, 7);
  for (const [source, y, height] of [['Date', 66, 24], ['Cycle day', 92, 9], ['Measurement time', 424, 10], ['Influence factors', 436, 9]]) {
    blank(25, y, 103, height); label(source, 27, y, 100, height, 6);
  }
  blank(25, 447, 664, 9);
  const legend = Object.values(TEMP_FACTORS).map(value => `${t(value).slice(0, 1)}: ${t(value)}`).join('   ');
  label(legend, 27, 447, 660, 9, 5.5);
  for (const [source, y] of [['Cervical mucus', 458], ['Cervix', 731], ['Additional symptoms or observations', 784]]) {
    blank(25, y, 664, 11); label(source, 27, y, 660, 11, 7);
  }
  const bands = [[471,481,'Cycle day'],[482,492,'Period'],[493,503,'Spotting'],[504,514,'Clots'],[515,546,'Sensation'],[547,573,'Slippery'],[574,599,'Discharge'],[600,623,'Creamy'],[624,646,'Slightly stretchy'],[647,669,'Stretchy'],[670,694,'Color'],[695,706,'Other color'],[707,718,'Cycle day'],[719,729,'Mucus peak'],[742,754,'Firmness'],[755,783,'Height / Openness'],[796,806,'Mood'],[807,817,'Ovulation pain'],[818,828,'Breast swelling'],[830,839,'Fertile range'],[841,851,'Sex']];
  // Clear whole label blocks so no descenders from the reference language remain.
  for (const [top, height] of [[471,259],[742,42],[796,55]]) blank(25, top, 103, height);
  ctx.fillStyle = '#111';
  for (const y of [481,492,503,514,546,573,599,623,646,669,694,706,718,754,806,817,828,839]) ctx.fillRect(24, y, 105, .7);
  for (const [top, bottom, source] of bands) { blank(25, top, 103, bottom - top); label(source, 27, top, 99, bottom - top, 6.5); }
  // Remove the reference's day numbers from the fertile-day entry row.
  for (let i = 0; i < 43; i++) blank(130 + i * (561 / 43), 830, 561 / 43 - 1, 9);
  blank(24, 859, 669, 106);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
  const boxes = [[24,861,185,36],[213,861,210,36],[427,861,120,36],[551,861,139,36],[24,903,272,60],[308,903,382,60]];
  for (const box of boxes) ctx.strokeRect(...box);
  for (const [source, x, width] of [['Map name', 27, 175], ['Goal', 216, 200], ['Measurement time', 430, 111], ['Measurement method', 554, 130]]) label(source, x, 864, width, 12, 7);
  for (const [source, x, y, width] of [
    ['Longest cycle',27,906,216], ['Shortest cycle',27,919,216], ['Last infertile day · formula',27,932,216], ['Cycle length',27,945,216],
    ['First mucus',311,906,145], ['First high-quality mucus',311,919,145], ['High-quality mucus days',311,932,145], ['Mucus peak',311,945,145],
    ['BBT rise · 3rd / 4th day',510,906,128], ['Mucus peak + 4',510,919,128], ['Cervix peak + 4',510,932,128], ['Second phase · BBT',510,945,80],
  ]) label(source, x, y, width, 12, 6.5);
}

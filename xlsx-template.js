import { templatePages, TEMPLATE_ROWS } from './observation-template.js';
import { t } from './i18n.js';
import { calculateSummary } from './cycle-summary.js';

const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const rel = 'http://schemas.openxmlformats.org/package/2006/relationships';
const office = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const xml = value => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const col = index => index < 26 ? String.fromCharCode(65 + index) : 'A' + String.fromCharCode(65 + index - 26);
const cell = (value, column, row, style = 1) => `<c r="${col(column)}${row}" s="${style}"${typeof value === 'number' ? `><v>${value}</v></c>` : ` t="inlineStr"><is><t>${xml(value)}</t></is></c>`}`;

export function addObservationSheets(files, map, backup) {
  const pages = templatePages(map);
  let overrides = '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
  let relationships = `<Relationship Id="rIdStyles" Type="${office}/styles" Target="styles.xml"/>`;
  const sheets = [];
  const printAreas = [];
  pages.forEach((page, index) => {
    const id = index + 2, name = `${t('Cycle map')} ${index + 1}`;
    printAreas.push(`<definedName name="_xlnm.Print_Area" localSheetId="${index}">'${name}'!$A$1:$AR$54</definedName>`);
    sheets.push(`<sheet name="${name}" sheetId="${id}" r:id="rId${id}"/>`);
    relationships += `<Relationship Id="rId${id}" Type="${office}/worksheet" Target="worksheets/sheet${id}.xml"/>`;
    overrides += `<Override PartName="/xl/worksheets/sheet${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`;
    const row = (number, cells, height = 17, hidden = false) => `<row r="${number}" ht="${height}" customHeight="1"${hidden ? ' hidden="1"' : ''}>${cells}</row>`;
    const dayCells = (number, fn, style = 1) => Array.from({ length: 43 }, (_, i) => cell(fn(page.dates[i], i), i + 1, number, style)).join('');
    let data = row(1, cell(map.name || t('Untitled map'), 0, 1, 2), 26);
    data += row(2, cell(`${page.dates[0] || ''} – ${page.dates.at(-1) || ''}`, 0, 2, 2), 22);
    data += row(3, cell(t('Date'), 0, 3) + dayCells(3, date => date?.slice(5) || ''), 30);
    data += row(4, cell(t('Cycle day'), 0, 4) + dayCells(4, (date, i) => date ? page.offset + i + 1 : ''));
    for (let r = 5; r < 25; r++) data += row(r, '', 14);
    data += row(25, cell(t('Temperature'), 0, 25) + dayCells(25, date => map.entries[date]?.temp ?? '', 3));
    TEMPLATE_ROWS.forEach(([label, , value], i) => {
      const r = 26 + i;
      data += row(r, cell(t(label), 0, r) + dayCells(r, date => date ? value(map.entries[date] || {}) : ''), 20);
    });
    data += row(45, cell(t('Import uses the original exported data. Changes made in Excel are not imported.'), 0, 45, 2), 24);
    data += row(46, cell(t('Chart scale: 36.00–37.40 °C. Complete observations and notes are on the Data sheet.'), 0, 46, 2), 28);
    const manual = map.cycleSummaries?.[page.start] || {};
    const result = page.start ? calculateSummary(map.entries, page.start, manual) : {};
    const summaries = [['Longest cycle', result.max], ['First mucus', manual.firstMucus], ['Shortest cycle', result.min], ['First high-quality mucus', manual.qualityMucus], ['Last infertile day · formula', result.lastInfertile], ['High-quality mucus days', manual.qualityDays], ['Cycle length', result.length], ['Mucus peak', manual.mucusPeak], ['BBT rise · 3rd / 4th day', result.bbtRise], ['Mucus peak + 4', result.mucusPlus4], ['Cervix peak + 4', result.cervixPlus4], ['Second phase · BBT', result.bbtPhase], ['Second phase · mucus', result.mucusPhase]];
    const summaryMerges = [];
    for (let i = 0; i < summaries.length; i += 2) {
      const number = 48 + i / 2;
      let cells = '';
      for (let side = 0; side < 2; side++) {
        const item = summaries[i + side];
        if (!item) continue;
        const column = side ? 17 : 0, valueColumn = side ? 34 : 14;
        cells += cell(t(item[0]), column, number) + cell(item[1] ?? '', valueColumn, number);
        summaryMerges.push(`<mergeCell ref="${col(column)}${number}:${col(valueColumn - 1)}${number}"/><mergeCell ref="${col(valueColumn)}${number}:${col(side ? 43 : 15)}${number}"/>`);
      }
      data += row(number, cells, 20);
    }
    for (let i = 0; i < 43; i++) {
      data += row(70 + i, cell(i + 1, 0, 70 + i), 15, true);
    }
    files[`xl/worksheets/sheet${id}.xml`] = `<worksheet xmlns="${main}" xmlns:r="${office}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane xSplit="1" ySplit="4" topLeftCell="B5" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="27" customWidth="1"/><col min="2" max="44" width="4.2" customWidth="1"/></cols><sheetData>${data}</sheetData><mergeCells count="${4 + summaryMerges.length * 2}">${summaryMerges.join('')}<mergeCell ref="A1:AR1"/><mergeCell ref="A2:AR2"/><mergeCell ref="A45:AR45"/><mergeCell ref="A46:AR46"/></mergeCells><printOptions horizontalCentered="1"/><pageMargins left="0.2" right="0.2" top="0.3" bottom="0.3" header="0" footer="0"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/><drawing r:id="rId1"/></worksheet>`;
    files[`xl/worksheets/_rels/sheet${id}.xml.rels`] = `<Relationships xmlns="${rel}"><Relationship Id="rId1" Type="${office}/drawing" Target="../drawings/drawing${id}.xml"/></Relationships>`;
    files[`xl/drawings/drawing${id}.xml`] = `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>4</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>44</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>24</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="${xml(t('Temperature'))}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="${office}" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;
    files[`xl/drawings/_rels/drawing${id}.xml.rels`] = `<Relationships xmlns="${rel}"><Relationship Id="rId1" Type="${office}/chart" Target="../charts/chart${id}.xml"/></Relationships>`;
    const cache = axis => `<c:numRef><c:f>'${name}'!${axis === 'A' ? '$A$70:$A$112' : '$B$25:$AR$25'}</c:f><c:numCache><c:formatCode>0.00</c:formatCode><c:ptCount val="43"/>${Array.from({ length: 43 }, (_, i) => {
      const value = axis === 'A' ? i + 1 : map.entries[page.dates[i]]?.temp;
      return Number.isFinite(value) ? `<c:pt idx="${i}"><c:v>${value}</c:v></c:pt>` : '';
    }).join('')}</c:numCache></c:numRef>`;
    const axis = (axisId, cross, min, max, major, pos, format, minor = '') => `<c:valAx><c:axId val="${axisId}"/><c:scaling><c:orientation val="minMax"/><c:max val="${max}"/><c:min val="${min}"/></c:scaling><c:axPos val="${pos}"/><c:majorGridlines/>${minor ? '<c:minorGridlines/>' : ''}<c:numFmt formatCode="${format}" sourceLinked="0"/><c:crossAx val="${cross}"/><c:crosses val="min"/><c:majorUnit val="${major}"/>${minor ? `<c:minorUnit val="${minor}"/>` : ''}</c:valAx>`;
    files[`xl/charts/chart${id}.xml`] = `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:plotArea><c:layout/><c:scatterChart><c:scatterStyle val="lineMarker"/><c:ser><c:idx val="0"/><c:order val="0"/><c:spPr><a:ln w="12700"><a:solidFill><a:srgbClr val="222222"/></a:solidFill></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="3"/></c:marker><c:xVal>${cache('A')}</c:xVal><c:yVal>${cache('B')}</c:yVal><c:smooth val="0"/></c:ser><c:axId val="1"/><c:axId val="2"/></c:scatterChart>${axis(1, 2, .5, 43.5, 1, 'b', '0')}${axis(2, 1, 36, 37.4, .1, 'l', '0.00', .05)}</c:plotArea><c:plotVisOnly val="0"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`;
  });
  files['xl/styles.xml'] = `<styleSheet xmlns="${main}"><fonts count="2"><font><sz val="9"/><name val="Arial"/></font><font><b/><sz val="12"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="4"><xf/><xf fontId="0" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf fontId="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="2" borderId="1" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  files['xl/workbook.xml'] = files['xl/workbook.xml'].replace('<sheets>', '<sheets>' + sheets.join('')).replace('name="Cycle map"', `name="${xml(t('Data'))}"`).replace('</workbook>', `<definedNames>${printAreas.join('')}</definedNames></workbook>`);
  files['xl/_rels/workbook.xml.rels'] = files['xl/_rels/workbook.xml.rels'].replace('</Relationships>', relationships + '</Relationships>');
  files['[Content_Types].xml'] = files['[Content_Types].xml'].replace('</Types>', overrides + '</Types>');
  files['cycle-map.json'] = backup;
  return files;
}

const PDFDocument = require('pdfkit');
const { createCanvas } = require('@napi-rs/canvas');

const NAVY = '#0D1C3D';
const RED = '#E8231A';
const GREEN = '#15803D';
const MUTED = '#4A5568';
const LINE = '#E5E9F2';
const SOFT = '#F4F6F9';

const br = (n) => `${Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Br`;
const time = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const prettyDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
const METHOD = { cash: 'Cash', telebirr: 'Telebirr', cbe: 'CBE' };
const STATUS = { received: 'Received', diagnosing: 'Diagnosing', fixing: 'Fixing', completed: 'Ready', delivered: 'Delivered' };

// The same content, as plain rows, drives both the PDF and the image.
function toSections(report) {
  const s = report.summary;
  return {
    summary: [
      ['Sales revenue', br(s.sales_revenue)],
      ['Repair revenue', br(s.repair_revenue)],
      ['Total revenue', br(s.total_revenue), true],
      ['Spent on stock', br(s.purchases_total)],
      ['Profit', br(s.total_profit), true],
    ],
    lists: [
      {
        title: `Sold today (${report.sales.length})`,
        empty: 'Nothing sold today',
        rows: report.sales.map(x => [
          time(x.time),
          x.items.map(i => `${i.name} ×${i.qty}`).join(', ') || 'Sale',
          `${x.customer} · ${METHOD[x.payment_method] || x.payment_method}`,
          br(x.total),
        ]),
      },
      {
        title: `Repairs today (${report.repairs.length})`,
        empty: 'No repairs finished today',
        rows: report.repairs.map(x => [
          x.ticket_number,
          x.device_name,
          `${x.customer_name || 'No name'} · ${x.delivered_today ? 'Handed over' : STATUS[x.status] || x.status}`,
          x.amount == null ? '—' : br(x.amount),
        ]),
      },
      {
        title: `Bought today (${report.purchases.length})`,
        empty: 'No stock bought today',
        rows: report.purchases.map(x => [
          time(x.time),
          x.product_name,
          `${x.qty} × ${br(x.unit_cost)}${x.supplier ? ` · ${x.supplier}` : ''}`,
          br(x.total),
        ]),
      },
    ],
  };
}

function renderPdf(report, stream) {
  const { summary, lists } = toSections(report);
  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Daily report ${report.date}`, Author: 'ChalaMob' } });
  doc.pipe(stream);
  const W = doc.page.width - 80;

  doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(22).text('ChalaMob', { continued: true }).fillColor(RED).text(' · Daily report');
  doc.moveDown(0.2).fillColor(MUTED).font('Helvetica').fontSize(11).text(prettyDate(report.date));
  doc.moveDown(1);

  // Summary box
  const top = doc.y;
  doc.roundedRect(40, top, W, 24 + summary.length * 22, 8).fill(SOFT);
  let y = top + 14;
  summary.forEach(([label, value, strong]) => {
    doc.fillColor(strong ? NAVY : MUTED).font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(12).text(label, 56, y, { width: W / 2 });
    doc.fillColor(label === 'Profit' ? GREEN : NAVY).font('Helvetica-Bold').text(value, 40 + W / 2, y, { width: W / 2 - 16, align: 'right' });
    y += 22;
  });
  doc.y = top + 24 + summary.length * 22 + 18;

  lists.forEach(section => {
    if (doc.y > doc.page.height - 120) doc.addPage();
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(14).text(section.title, 40, doc.y);
    doc.moveDown(0.4);
    if (!section.rows.length) {
      doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(11).text(section.empty, 40);
      doc.moveDown(1);
      return;
    }
    section.rows.forEach(([a, b, c, amount]) => {
      if (doc.y > doc.page.height - 70) doc.addPage();
      const rowTop = doc.y;
      doc.fillColor(MUTED).font('Helvetica').fontSize(10).text(a, 40, rowTop, { width: 70 });
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10.5).text(b, 112, rowTop, { width: W - 230 });
      const textBottom = doc.y;
      doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text(c, 112, textBottom, { width: W - 230 });
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11).text(amount, 40 + W - 110, rowTop, { width: 110, align: 'right' });
      const rowBottom = Math.max(doc.y, textBottom) + 6;
      doc.moveTo(40, rowBottom).lineTo(40 + W, rowBottom).strokeColor(LINE).lineWidth(0.5).stroke();
      doc.y = rowBottom + 6;
    });
    doc.moveDown(0.8);
  });

  doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`Generated ${new Date(report.generated_at).toLocaleString('en-US')}`, 40, doc.y, { width: W, align: 'right' });
  doc.end();
}

// A single tall PNG that is easy to send on WhatsApp.
function renderPng(report) {
  const { summary, lists } = toSections(report);
  const MAX_ROWS = 10;
  const W = 900, PAD = 40, ROW_H = 64;

  let H = 150 + 30 + summary.length * 44 + 30;
  lists.forEach(l => { H += 70 + (l.rows.length ? Math.min(l.rows.length, MAX_ROWS) * ROW_H + (l.rows.length > MAX_ROWS ? 40 : 0) : 50); });
  H += 70;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const font = (w, size) => { ctx.font = `${w} ${size}px Arial, sans-serif`; };
  const fit = (text, maxW) => {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
    return `${t}…`;
  };

  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, 130);
  ctx.fillStyle = RED; ctx.fillRect(0, 0, 10, 130);
  ctx.fillStyle = '#FFFFFF'; font('bold', 40); ctx.fillText('ChalaMob · Daily report', PAD, 62);
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; font('normal', 24); ctx.fillText(prettyDate(report.date), PAD, 102);

  let y = 150;
  ctx.fillStyle = SOFT; ctx.beginPath(); ctx.roundRect(PAD, y, W - PAD * 2, summary.length * 44 + 30, 16); ctx.fill();
  y += 42;
  summary.forEach(([label, value, strong]) => {
    ctx.fillStyle = strong ? NAVY : MUTED; font(strong ? 'bold' : 'normal', 26); ctx.textAlign = 'left'; ctx.fillText(label, PAD + 24, y);
    ctx.fillStyle = label === 'Profit' ? GREEN : NAVY; font('bold', 28); ctx.textAlign = 'right'; ctx.fillText(value, W - PAD - 24, y);
    y += 44;
  });
  ctx.textAlign = 'left';
  y += 34;

  lists.forEach(section => {
    ctx.fillStyle = NAVY; font('bold', 30); ctx.fillText(section.title, PAD, y); y += 22;
    if (!section.rows.length) {
      ctx.fillStyle = MUTED; font('italic', 24); ctx.fillText(section.empty, PAD, y + 26); y += 70; return;
    }
    section.rows.slice(0, MAX_ROWS).forEach(([a, b, c, amount]) => {
      ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(PAD, y + 4); ctx.lineTo(W - PAD, y + 4); ctx.stroke();
      ctx.fillStyle = MUTED; font('normal', 20); ctx.fillText(a, PAD, y + 34);
      ctx.fillStyle = NAVY; font('bold', 24); ctx.fillText(fit(b, 430), PAD + 130, y + 32);
      ctx.fillStyle = MUTED; font('normal', 20); ctx.fillText(fit(c, 430), PAD + 130, y + 56);
      ctx.fillStyle = NAVY; font('bold', 26); ctx.textAlign = 'right'; ctx.fillText(amount, W - PAD, y + 40); ctx.textAlign = 'left';
      y += ROW_H;
    });
    if (section.rows.length > MAX_ROWS) {
      ctx.fillStyle = MUTED; font('italic', 22); ctx.fillText(`+ ${section.rows.length - MAX_ROWS} more (see the PDF)`, PAD, y + 28); y += 40;
    }
    y += 48;
  });

  ctx.fillStyle = MUTED; font('normal', 18); ctx.textAlign = 'right';
  ctx.fillText(`Generated ${new Date(report.generated_at).toLocaleString('en-US')}`, W - PAD, H - 26);
  return canvas.toBuffer('image/png');
}

module.exports = { renderPdf, renderPng };

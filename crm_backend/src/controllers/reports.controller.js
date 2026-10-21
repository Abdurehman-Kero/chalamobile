const jwt = require('jsonwebtoken');
const { buildDailyReport } = require('../services/report');
const { renderPdf, renderPng } = require('../services/reportExport');
const { dateString, parseDateString } = require('../utils/dates');

const pickDate = (q) => (parseDateString(q) ? q : dateString());

exports.daily = async (req, res) => {
  try {
    res.json(await buildDailyReport(pickDate(req.query.date)));
  } catch (err) {
    console.error('[reports.daily]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// The phone opens the PDF / image in its browser, which cannot send the login
// header. So the app first asks for short-lived links that carry a token
// (10 minutes, valid for this report only).
exports.exportLinks = (req, res) => {
  const date = pickDate(req.body && req.body.date);
  const token = jwt.sign({ purpose: 'report-export', uid: req.user.id, date }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const qs = `date=${date}&token=${encodeURIComponent(token)}`;
  res.json({ date, pdf: `/api/reports/daily.pdf?${qs}`, image: `/api/reports/daily.png?${qs}` });
};

const fromToken = (req, res) => {
  try {
    const t = jwt.verify(String(req.query.token || ''), process.env.JWT_SECRET);
    if (t.purpose !== 'report-export') throw new Error('wrong purpose');
    return t.date;
  } catch {
    res.status(401).json({ error: 'This download link has expired. Open the report again.' });
    return null;
  }
};

exports.pdf = async (req, res) => {
  const date = fromToken(req, res);
  if (!date) return;
  try {
    const report = await buildDailyReport(date);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="chalamob-report-${date}.pdf"`);
    renderPdf(report, res);
  } catch (err) {
    console.error('[reports.pdf]', err);
    if (!res.headersSent) res.status(500).json({ error: 'Could not create the PDF' });
  }
};

exports.image = async (req, res) => {
  const date = fromToken(req, res);
  if (!date) return;
  try {
    const report = await buildDailyReport(date);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="chalamob-report-${date}.png"`);
    res.send(renderPng(report));
  } catch (err) {
    console.error('[reports.image]', err);
    res.status(500).json({ error: 'Could not create the image' });
  }
};

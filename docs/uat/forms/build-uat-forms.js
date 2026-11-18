// Builds the two print-ready UAT forms (Form A: Parish Staff / Admin, Form B: Parishioner) from the
// same made-up data the Santuario is seeded with, so every name and number on them exists on the site.
//
//   node docs/uat/forms/build-uat-forms.js --env server/.env.uat
//
// --env reads the sample certificate's check link from that database (it changes on every
// reset, so rebuild and reprint the forms after reset-uat-parish.js + seed-uat-santuario.js).
// Writes Form A and Form B as .html next to this file, then prints each to PDF with Microsoft Edge.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
const SERVER = path.join(ROOT, 'server');
const need = (m) => require(require.resolve(m, { paths: [SERVER] }));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const envFile = arg('env');
if (!envFile) {
  console.error('Say which database the forms are for: --env server/.env.uat');
  process.exit(1);
}
need('dotenv').config({ path: path.resolve(envFile), override: true, quiet: true });

const QRCode = need('qrcode');
const { Client } = need('pg');
const data = require(path.join(SERVER, 'scripts', 'uat-santuario-data.js'));
const config = require(path.join(SERVER, 'scripts', 'uat-config.json'));

const OUT = __dirname;
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

// ---- Data from the seed -----------------------------------------------------------------

const byLast = (last) => data.BAPTISMS.find((b) => b[2] === last);
const full = (b) => `${b[0]} ${b[1]} ${b[2]}`;
const mdy = (iso) => {
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
};
const bep = (b) => `Book ${b[9]}, Page ${b[10]}, Entry ${b[11]}`;
const peso = (n) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

const admin = data.ADMINS[0];
const adminEmail = data.officeEmail(config, admin.tag);
const adminPassword = config.adminPasswords[admin.tag];
const search = byLast('Bacaltos');
const edit = byLast('Montecillo');
const issue = byLast('Lim');
const pickup = data.REQUESTS[0];
const digital = data.REQUESTS[1];
const reject = data.REQUESTS[2];
const pickupRec = byLast(pickup.person[2]);
const digitalRec = byLast(digital.person[2]);
const self = byLast('Villanueva');
const diola = byLast('Diola');
const staffEmail = data.officeEmail(config, data.STAFF.tag);
const [dA, dB] = data.DONATIONS;
const year = new Date().getFullYear();

async function verifyLink() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT c.hash FROM certificate c JOIN parish p ON p.id = c.parish_id
        WHERE p.slug = $1 ORDER BY c.certificate_code ASC LIMIT 1`,
      [config.santuarioSlug]
    );
    if (!rows[0]) throw new Error('No certificate in the parish yet. Run seed-uat-santuario.js first.');
    return `${data.SITE_URL}/verify/${rows[0].hash}`;
  } finally {
    await client.end();
  }
}

// ---- The forms --------------------------------------------------------------------------

const e = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// **text** is what the tester types or picks; a new line starts a new line on the form.
const fmt = (s) => e(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

function formA(qr) {
  return {
    file: 'HolyApp UAT - Form A - Parish Staff and Admin',
    title: 'Form A: Parish Staff / Admin',
    role: true,
    // Two pages: room to read and to write remarks.
    roomy: true,
    // The task-by-task form, plus a row each for the Acceptance Test Criteria Matrix items it would
    // otherwise miss: annotations, ledger reading, Mass intentions, and limited staff access.
    tasks: [
      ['Log in with a wrong password', `Email: **${adminEmail}**
Password: **Wrong1234**
An error message should show.`],
      ['Log in', `Email: **${adminEmail}**
Password: **${adminPassword}**`],
      ['Search a record', `Records > Baptismal. Name of baptized: **${search[2]}**. Search.
Clear search. Book no.: **${search[9]}**, Page no.: **${search[10]}**, Entry (line) no.: **${search[11]}**. Search.
Both show ${full(search)}.`],
      ['Add a baptism record', `Name: **Paolo Andres Rebuyas Calo**, Male
Born: **01/15/${year}**, Cebu City. Baptized: **03/01/${year}**
Father: **Andres Calo**. Mother: **Liza Rebuyas**
Minister: **${data.PRIEST_FULL}**
Book **70**, Page **1**, Entry **1**`],
      ['Edit a record', `Open **${full(edit)}**. Edit.
Place of birth: **Mandaue City**. Save changes.`],
      ['Add an annotation', `Open **${full(diola)}**. Add annotation.
Sacrament: **Confirmation**. Date: **05/10/2025**. Minister: **${data.PRIEST_FULL}**.
Book **70**, Page **2**, Entry **1**. Save.
Then Generate Certificate. Purpose: **School enrollment**. Issue & print. His old certificate shows Superseded.`],
      ['Issue a certificate with a QR code', `Open **${full(issue)}**. Generate Certificate.
Purpose: **Personal records**. Issue & print.`],
      ['Approve a certificate request', `Certificate Requests. Open **${full(pickupRec)}**.
Find matching record: **${bep(pickupRec)}**.
The request now waits for payment.`],
      ['See the GCash payment', `The facilitator pays for this request with GCash as the parishioner.
Open the request again. It should show Paid.`],
      ['Release a certificate (self-pickup)', `Same request: Mark ready for pickup, then Release certificate.
Recipient: **${data.PICKUP_BY}**. ID: **Driver's license**.`],
      ['Release a certificate (digital)', `Open **${full(digitalRec)}**. Find matching record: **${bep(digitalRec)}**.
After the facilitator pays with GCash, click Issue certificate.`],
      ['Reject a certificate request', `Open **${reject.person.slice(0, 3).join(' ')}**. Reject request.
Reason: **No baptism record under this name.**`],
      ['Read an old ledger page', `Ledgers > **${data.LEDGER.title}** > Page **${data.LEDGER.pageNumber}**. Read this page.
Then Search digitized ledgers: **${data.LEDGER.searchFor}**
Shows ${data.LEDGER.expect.name}, baptized ${mdy(data.LEDGER.expect.baptized)}.`],
      ['Add a Mass', `Settings > Regular Masses > + Add Mass times.
Name: **Saturday Anticipated Mass**. Day: **Saturday**. Time: **5:00 PM** to **6:00 PM**. Save.`],
      ['Edit a Mass', `Change its time to **5:30 PM** to **6:30 PM**. Save.`],
      ['Cancel a Mass', `Remove the **Saturday Anticipated Mass**.`],
      ['Add a Mass intention', `Mass Intentions. Next Sunday's **6:30 AM** Mass. Add request.
Requester: **${data.PICKUP_BY}**. Type: **Birthday blessing**. For: **Rosalie Bontuyan**. Donation: **₱100**`],
      ['View the donation log', `Donations. Find **${dA.donorName}** (${peso(dA.amount)}) and **${dB.donorName}** (${peso(dB.amount)}).`],
      ['Make a report and save it as PDF', `Reports > Certificates. From: **11/01/${year}**. To: **12/31/${year}**.
Download PDF.`],
      ['Verify a certificate', `Scan this QR code with a phone camera. It should say Valid certificate for ${full(search)}.`, qr],
      ['View the audit log', `Activity. Today's actions show with your name and the time.`],
      ['Staff access is limited', `Log out. Log in as staff. Email: **${staffEmail}**, Password: **${config.staffPassword}**
Donations is not in the menu.`],
    ],
    statements: [
      'HolyApp was easy to use.',
      'The screens and buttons were clear.',
      'HolyApp would make parish office work easier.',
      'The records and certificates were correct.',
      'I would use HolyApp in the parish office.',
    ],
  };
}

function formB(qr) {
  const [first, middle, last, , born, baptized, father, mother] = self;
  return {
    file: 'HolyApp UAT - Form B - Parishioner',
    title: 'Form B: Parishioner',
    role: false,
    tasks: [
      ['Create an account', `Email: **holyapp.uat+reg(your tester no.)@gmail.com**
Ask the facilitator for the 4-digit code.
Name: **${first} ${middle} ${last}**. Birthday: **${mdy(born)}**
Mobile: **09171234567**. Password: **Test1234**`],
      ['Log in', `Log out, then log in with the email above.
Password: **Test1234**`],
      ['Update your profile', `Your name > Account > Edit.
Mobile: **09181234567**
Address: **123 Gorordo Ave., Lahug, Cebu City**. Save changes.`],
      ['Request a certificate', `Certificates > Request a certificate.
Baptism certificate for **Myself**.
Baptized: **${mdy(baptized)}**. Father: **${father}**. Mother: **${mother}**.
Purpose: **School enrollment**`],
      ['Choose how to get it', `On the same request, choose **Digital copy**. Submit request.
(Pick up at the office is the other choice.)`],
      ['Track your request', `Certificates > My requests. Open your request.
The status should show.`],
      ['View the Mass schedule', `Home page. Look at the Mass times.
Find the Sunday Masses.`],
      ['Give a donation', `Give. Amount: **₱20**. Pay with GCash.
This is a test: no real money is taken.
On the GCash test page, tap **Authorize Test Payment**.`],
      ['Verify a certificate', `Scan this QR code with your phone camera. It should say Valid certificate for ${full(search)}.`, qr],
    ],
    statements: [
      'HolyApp was easy to use.',
      'The screens and buttons were clear.',
      'Requesting a certificate online is useful to me.',
      'I could finish the tasks without help.',
      'I would use HolyApp again.',
    ],
  };
}

const LOGO = fs.readFileSync(path.join(ROOT, 'client', 'public', 'holyapp-logo.webp')).toString('base64');

function page(form) {
  const box = '<span class="cb">☐</span>';
  const rows = form.tasks
    .map(([task, sample, qr], i) => `<tr><td class="n">${i + 1}</td><td class="t">${e(task)}</td>
      <td class="s">${qr ? `<div class="qrrow"><img class="qr" src="${qr}" alt="QR code"><div>${fmt(sample)}</div></div>` : fmt(sample)}</td>
      <td class="pf">${box}</td><td class="pf">${box}</td><td></td></tr>`)
    .join('');
  const scale = form.statements
    .map((s, i) => `<tr><td class="n">${i + 1}</td><td>${e(s)}</td>${[1, 2, 3, 4, 5].map((n) => `<td class="r">${box} ${n}</td>`).join('')}</tr>`)
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${e(form.file)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
@page { size: A4 portrait; margin: 8mm 11mm 7mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, 'Segoe UI', Arial, sans-serif; color: #15323A; font-size: 7.5pt; line-height: 1.28;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.head { display: flex; align-items: center; gap: 3.5mm; padding-bottom: 2.5mm; border-bottom: 2px solid #0E3B46; }
.head img { width: 11mm; height: 11mm; border-radius: 50%; }
h1 { margin: 0; font-size: 14pt; font-weight: 800; color: #0E3B46; }
.sub { color: #55707A; font-size: 7.8pt; }
.fields { display: flex; gap: 6mm; margin: 3mm 0 1.5mm; }
.fields div { flex: 1; border-bottom: 1px solid #6F8A92; padding-bottom: 1mm; font-weight: 600; color: #55707A; }
.how { margin: 1.5mm 0 2mm; font-weight: 600; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th { background: #0E3B46; color: #fff; text-align: left; font-weight: 600; padding: 1.4mm 1.6mm; font-size: 7.6pt; }
td { padding: 1mm 1.6mm; vertical-align: top; border-bottom: 1px solid #D5E1E4; }
tr { break-inside: avoid; }
td.n { color: #55707A; font-weight: 600; }
td.t { font-weight: 600; }
td.s b { font-weight: 600; color: #0E3B46; background: #E8F5F5; padding: 0 .6mm; border-radius: .6mm; }
td.pf, th.pf { text-align: center; }
.cb { font-size: 10pt; line-height: 1; }
.qrrow { display: flex; gap: 2.5mm; align-items: center; }
.qr { width: 14mm; height: 14mm; flex: none; }
h2 { font-size: 9pt; color: #0E3B46; margin: 2.5mm 0 .5mm; }
.scale-note { color: #55707A; margin-bottom: 1mm; }
td.r { white-space: nowrap; text-align: center; }
.scale td { padding: .7mm 1.6mm; }
.lines { margin-top: 2mm; }
.line { border-bottom: 1px solid #6F8A92; height: 6mm; }
.sign { display: flex; gap: 8mm; margin-top: 6mm; }
.sign div { flex: 1; border-top: 1px solid #6F8A92; padding-top: 1mm; color: #55707A; font-weight: 600; }
${form.roomy ? `
@page { margin: 12mm 12mm 11mm; }
body { font-size: ${form.tasks.length > 15 ? '8.6pt' : '9pt'}; line-height: ${form.tasks.length > 15 ? '1.35' : '1.4'}; }
h1 { font-size: 16pt; }
.head img { width: 13mm; height: 13mm; }
.fields { margin: 5mm 0 2mm; }
.fields div { padding-bottom: 2mm; }
.how { margin: 3mm 0 3.5mm; font-size: 9.5pt; }
th { padding: 2mm; font-size: 8.6pt; }
td { padding: ${form.tasks.length > 15 ? '1.5mm' : '2.4mm'} 2mm; }
.cb { font-size: 12pt; }
.qr { width: ${form.tasks.length > 15 ? '19mm' : '24mm'}; height: ${form.tasks.length > 15 ? '19mm' : '24mm'}; }
.sec { break-inside: avoid; margin-top: ${form.tasks.length > 15 ? '3.5mm' : '5mm'}; }
h2 { font-size: 11pt; margin: 0 0 1mm; }
.scale td { padding: ${form.tasks.length > 15 ? '1.5mm' : '2mm'} 2mm; }
.line { height: ${form.tasks.length > 15 ? '8mm' : '9mm'}; }
.sign { margin-top: 12mm; }` : ''}
</style></head><body>
<div class="head"><img src="data:image/webp;base64,${LOGO}" alt="">
  <div><h1>HolyApp User Acceptance Test</h1><div class="sub">${e(form.title)} · ${e(data.PARISH_NAME)}</div></div></div>
<div class="fields"><div>Name:</div>${form.role ? '<div>Role:</div>' : ''}<div>Date:</div></div>
<p class="how">Do each task using the sample data. Check Pass or Fail.${form.how ? ` ${e(form.how)}` : ""}</p>
<table>
  <colgroup><col style="width:4%"><col style="width:20%"><col style="width:45%"><col style="width:6%"><col style="width:6%"><col style="width:19%"></colgroup>
  <thead><tr><th>#</th><th>Task</th><th>Sample Data</th><th class="pf">Pass</th><th class="pf">Fail</th><th>Remarks</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="${form.roomy ? 'sec' : ''}"><h2>Rate HolyApp</h2>
<div class="scale-note">1 = Poor, 5 = Excellent. Check one box for each.</div>
<table class="scale"><colgroup><col style="width:4%"><col style="width:46%"><col span="5" style="width:10%"></colgroup><tbody>${scale}</tbody></table>
<div class="lines"><b>Comments / Suggestions:</b><div class="line"></div><div class="line"></div>${form.roomy ? '<div class="line"></div><div class="line"></div>' : ''}</div>
<div class="sign"><div>Signature</div><div>Date</div></div></div>
</body></html>`;
}

async function main() {
  const link = await verifyLink();
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 300, errorCorrectionLevel: 'M' });
  for (const form of [formA(qr), formB(qr)]) {
    const html = path.join(OUT, `${form.file}.html`);
    const pdf = path.join(OUT, `${form.file}.pdf`);
    fs.writeFileSync(html, page(form));
    execFileSync(EDGE, ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, `file:///${html.replace(/\\/g, '/')}`], { stdio: 'ignore' });
    console.log(`${form.file}.pdf`);
  }
  console.log(`QR code: ${link}`);
}

main().catch((err) => {
  console.error(`Stopped: ${err.message}`);
  process.exitCode = 1;
});

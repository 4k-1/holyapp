// The landing page's "Book a demo" form: sends the request straight to HolyApp's inbox. Nothing is stored.
//
//   POST /contact  { name, parish, contact, bestTime?, message?, website? }  → { ok: true }
//
// `website` is a honeypot: hidden from people, filled in by bots. A filled-in one is thanked and dropped.
const mailer = require('../utils/mailer');

const BEST_TIMES = new Set(['Weekday mornings', 'Weekday afternoons', 'Saturdays']);
const LIMITS = { name: 100, parish: 150, contact: 150, message: 2000 };
const PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

/** Where requests go. A placeholder until HolyApp has its real address; ".example" can never be a real inbox. */
function contactInbox() {
  return process.env.HOLYAPP_CONTACT_INBOX || 'contact@holyapp.example';
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhone = (v) => /^[\d\s()+-]+$/.test(v) && v.replace(/\D/g, '').length >= 10;

// Sends per connection in the last hour. In memory: it resets when the server restarts, which is fine for spam.
const recent = new Map();

function overLimit(key, now = Date.now()) {
  const times = (recent.get(key) || []).filter((t) => now - t < HOUR_MS);
  if (times.length >= PER_HOUR) {
    recent.set(key, times);
    return true;
  }
  times.push(now);
  recent.set(key, times);
  return false;
}

/** For tests: forget every connection's sends. */
function resetLimits() {
  recent.clear();
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validate(body) {
  const form = {
    name: text(body.name),
    parish: text(body.parish),
    contact: text(body.contact),
    bestTime: text(body.bestTime),
    message: text(body.message),
  };
  if (!form.name) return { error: 'Enter your name.' };
  if (!form.parish) return { error: 'Enter your parish and town.' };
  if (!form.contact) return { error: 'Enter an email or mobile number.' };
  if (!isEmail(form.contact) && !isPhone(form.contact)) return { error: 'Enter a valid email or a mobile number.' };
  if (form.bestTime && !BEST_TIMES.has(form.bestTime)) return { error: 'Choose a time from the list.' };
  for (const [field, max] of Object.entries(LIMITS)) {
    if (form[field].length > max) return { error: `Keep the ${field} under ${max} characters.` };
  }
  return { form };
}

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function demoEmail(form) {
  const rows = [
    ['Name', form.name],
    ['Parish', form.parish],
    ['Email or mobile', form.contact],
    ['Best time to reach them', form.bestTime || 'Any time'],
  ];
  const text = [
    'A parish would like to book a demo of HolyApp.',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Message:',
    form.message || '(none)',
  ].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; color: #13262b;">
      <h1 style="font-size: 20px; color: #0e3b46;">Demo request</h1>
      <p>A parish would like to book a demo of HolyApp.</p>
      <table style="border-collapse: collapse;">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding: 4px 12px 4px 0; color: #55707a;">${label}</td><td style="padding: 4px 0; font-weight: 600;">${escapeHtml(value)}</td></tr>`
          )
          .join('')}
      </table>
      <p style="margin-top: 16px; color: #55707a;">Message</p>
      <p style="white-space: pre-wrap;">${form.message ? escapeHtml(form.message) : '(none)'}</p>
    </div>
  `;
  return { text, html };
}

async function sendDemoRequest(req, res) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (text(body.website)) return res.json({ ok: true });

  const { form, error } = validate(body);
  if (error) return res.status(400).json({ error });

  if (overLimit(req.ip)) {
    return res.status(429).json({ error: "You've sent a few requests already. Please try again in an hour." });
  }

  const { text: plain, html } = demoEmail(form);
  try {
    await mailer.sendMail({
      to: contactInbox(),
      subject: `Demo request: ${form.parish}`,
      text: plain,
      html,
      replyTo: isEmail(form.contact) ? `"${form.name.replace(/"/g, '')}" <${form.contact}>` : undefined,
    });
  } catch (err) {
    // On a computer with no email account set up, show the request in the server log instead.
    if (err.code === 'MAIL_NOT_CONFIGURED' && process.env.NODE_ENV !== 'production') {
      console.log(`[contact] email isn't set up; request for ${contactInbox()}:\n${plain}`);
      return res.json({ ok: true });
    }
    console.error('sendDemoRequest failed:', err.message);
    return res.status(503).json({ error: "We couldn't send your request just now." });
  }
  res.json({ ok: true });
}

module.exports = { sendDemoRequest, resetLimits, contactInbox };

// UAT mode switches on the in-app test guide and the automatic test office.
// It is for the test site only: set UAT_MODE=on there. It refuses to run beside a live PayMongo key,
// so it can never act on a site that takes real payments.

function uatMode() {
  if (String(process.env.UAT_MODE || '').trim().toLowerCase() !== 'on') return false;
  return !String(process.env.PAYMONGO_SECRET_KEY || '').trim().startsWith('sk_live_');
}

module.exports = { uatMode };

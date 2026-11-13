const crypto = require('crypto');

function clientIp(req) {
  const forwarded = String(req.get('x-forwarded-for') || '')
    .split(',')[0]
    .trim();
  const raw = forwarded || req.ip || req.socket?.remoteAddress || '';
  return raw.replace(/^::ffff:/, '');
}

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return false;
}

function locationFrom(req, ip) {
  const city = req.get('cf-ipcity');
  const country = req.get('cf-ipcountry');
  if (city && country && country !== 'XX') {
    return `${city}, ${country}`;
  }
  if (country && country !== 'XX') return country;
  if (isPrivateIp(ip)) return 'This computer';
  return 'Unknown location';
}

function deviceLabel(userAgent) {
  const ua = String(userAgent || '');
  if (!ua) return 'Unknown device';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  if (/iPhone/i.test(ua)) return `${browser} on iPhone`;
  if (/iPad/i.test(ua)) return `${browser} on iPad`;
  if (/Android/i.test(ua)) return `${browser} on Android`;
  if (/Windows/i.test(ua)) return `${browser} on Windows`;
  if (/Mac OS X/i.test(ua)) return `${browser} on Mac`;
  if (/Linux/i.test(ua)) return `${browser} on Linux`;
  return browser;
}

function fingerprintFrom(req) {
  const raw = String(req.body?.device_id || req.get('x-device-id') || '').trim();
  if (!raw) return null;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function requestMeta(req) {
  const ip = clientIp(req);
  const userAgent = req.get('user-agent') || '';
  return {
    ip: ip || null,
    userAgent,
    deviceLabel: deviceLabel(userAgent),
    location: locationFrom(req, ip),
    fingerprint: fingerprintFrom(req),
  };
}

function formatLastActive(value) {
  if (!value) return 'Unknown';
  const then = new Date(value).getTime();
  const delta = Date.now() - then;
  if (delta < 5 * 60 * 1000) return 'Active now';
  const minutes = Math.round(delta / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatActivityTime(value);
}

function formatActivityTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
    .format(date)
    .replace(', ', ' · ')
    .replace(' at ', ' · ');
}

function currentRefreshToken(req) {
  return String(
    req.get('x-refresh-token') || req.body?.refresh_token || req.query?.refresh_token || ''
  ).trim();
}

module.exports = {
  requestMeta,
  formatLastActive,
  formatActivityTime,
  currentRefreshToken,
  fingerprintFrom,
};

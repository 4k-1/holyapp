require('dotenv').config({ quiet: true });

const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const { Pool } = require('pg');

const cloudflared = path.join(process.env.LOCALAPPDATA || '', 'cloudflared', 'cloudflared.exe');
const envPath = path.join(__dirname, '..', '.env');

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const done = (open) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(1500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function setFrontendUrl(origin) {
  const text = fs.readFileSync(envPath, 'utf8');
  const next = text.replace(/^FRONTEND_URL=.*$/m, `FRONTEND_URL=${origin}`);
  if (next === text) throw new Error('FRONTEND_URL was not found in server/.env');
  fs.writeFileSync(envPath, next);
}

async function pointCertificates(origin) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const updated = await pool.query(
      `UPDATE certificate
       SET qr_code = regexp_replace(qr_code, $2, $1),
           snapshot = CASE
             WHEN snapshot ? 'verifyUrl' THEN jsonb_set(
               snapshot,
               '{verifyUrl}',
               to_jsonb(regexp_replace(snapshot->>'verifyUrl', $2, $1))
             )
             ELSE snapshot
           END
       RETURNING certificate_code, status, hash, holder_name`,
      [origin, '^https?://[^/]+']
    );
    return updated.rows;
  } finally {
    await pool.end();
  }
}

async function main() {
  if (!fs.existsSync(cloudflared)) {
    console.error('The public-link program was not found. Ask for it to be installed again.');
    process.exit(1);
  }

  const appUp = await portOpen(5173);
  const apiUp = await portOpen(5000);
  if (!appUp || !apiUp) {
    console.error('Start the database, the server, and the client first. Then run this again.');
    if (!apiUp) console.error('The server on port 5000 is not running.');
    if (!appUp) console.error('The client on port 5173 is not running.');
    process.exit(1);
  }

  const child = spawn(cloudflared, ['tunnel', '--url', 'http://127.0.0.1:5173', '--no-autoupdate'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let buffer = '';
  let published = false;

  const watch = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    buffer = (buffer + text).slice(-4000);
    if (published) return;
    const match = buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (!match) return;
    published = true;
    const origin = match[0];
    pointCertificates(origin)
      .then((rows) => {
        setFrontendUrl(origin);
        console.log('\nPublic link is ready. Leave this window open.\n');
        console.log(origin);
        console.log('\nRefresh each certificate on the computer, then scan the QR code on the screen.\n');
        for (const row of rows) {
          console.log(`${row.status}  ${row.certificate_code}  ${row.holder_name}`);
          console.log(`${origin}/verify/${row.hash}\n`);
        }
        console.log('If you will issue a new certificate, stop the server window with Ctrl+C and start it again so the new QR code uses this link.\n');
      })
      .catch((err) => {
        console.error(err);
      });
  };

  child.stdout.on('data', watch);
  child.stderr.on('data', watch);
  child.on('exit', (code) => {
    if (!published) console.error('The public link stopped before it was ready.');
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const fs = require('fs');
const os = require('os');

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function runningInDocker() {
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

function lanIpv4() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs || []) {
      const family = addr.family === 4 || addr.family === 'IPv4';
      if (!family || addr.internal) continue;
      candidates.push({ name, address: addr.address });
    }
  }

  const wifi = candidates.find((item) => /wi-?fi|wlan|wireless/i.test(item.name));
  if (wifi) return wifi.address;

  const physical = candidates.find(
    (item) => !/vmware|virtualbox|vbox|hyper-v|docker|vethernet|loopback|bluetooth/i.test(item.name)
  );
  return physical?.address || candidates[0]?.address || null;
}

function frontendUrl() {
  const configured = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

  try {
    const url = new URL(configured);
    // Inside Docker, LAN rewrite would use the container bridge IP (e.g. 172.19.x),
    // which is unreachable from the host browser — keep localhost as configured.
    if (isLoopbackHost(url.hostname) && !runningInDocker()) {
      const lan = lanIpv4();
      if (lan) {
        url.hostname = lan;
        return url.origin;
      }
    }
    return url.origin;
  } catch {
    return configured;
  }
}

module.exports = { frontendUrl, lanIpv4 };

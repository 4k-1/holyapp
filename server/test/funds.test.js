// D3: a fixed list of funds. Listed funds are saved under their exact name; anything else is tidied.

const fs = require('fs');
const path = require('path');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');
const { FUNDS, normalizePurpose } = require('../src/constants/funds');

after(() => pool.end());

describe('The fund list', () => {
  it('matches the copy the app uses', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../client/src/lib/funds.ts'), 'utf8');
    const listed = [...source.matchAll(/\{ name: "([^"]+)", description: "([^"]+)"(, mustRemit: true)? \}/g)].map(
      (m) => ({ name: m[1], description: m[2], mustRemit: Boolean(m[3]) })
    );
    assert.deepEqual(
      listed,
      FUNDS.map((f) => ({ name: f.name, description: f.description, mustRemit: Boolean(f.mustRemit) }))
    );
  });

  it('saves a listed fund under its own name and tidies anything else', () => {
    assert.equal(normalizePurpose('general FUND'), 'General fund');
    assert.equal(normalizePurpose('  peters   pence '), "Peter's Pence");
    assert.equal(normalizePurpose('  Bell   tower '), 'Bell tower');
    assert.equal(normalizePurpose('   '), null);
    assert.equal(normalizePurpose(undefined), null);
  });
});

describe('Donations by fund', () => {
  let parish;

  async function give(purpose, amount) {
    const res = await api(parish.staff)
      .post('/donations')
      .send({ donorName: 'Fund Donor', donationType: 'Cash', amount, donationDate: '2026-10-05', purpose });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body;
  }

  before(async () => {
    parish = await createParish('Funds');
    await give('church repair AND maintenance', 1000);
    await give('Bell tower', 300);
    await give('bell  TOWER', 200);
    await give('Alay Kapwa', 450);
    await give('', 50);
  });

  it('stores the fund under its listed name', async () => {
    const res = await api(parish.staff).get('/donations');
    const purposes = res.body.donations.map((d) => d.purpose);
    assert.ok(purposes.includes('Church repair and maintenance'));
    assert.ok(!purposes.includes('church repair AND maintenance'));
  });

  it('groups typed purposes ignoring capitals and keeps must-remit funds marked', async () => {
    const res = await api(parish.admin).get('/reports/donations');
    assert.equal(res.status, 200);
    const byName = Object.fromEntries(res.body.purposes.map((p) => [p.purpose, p]));
    assert.equal(byName['Church repair and maintenance'].amount, 1000);
    assert.equal(byName['Bell tower'].amount, 500);
    assert.equal(res.body.purposes.filter((p) => /bell/i.test(p.purpose)).length, 1);
    assert.equal(byName['Alay Kapwa'].mustRemit, true);
    assert.equal(byName['Bell tower'].mustRemit, false);
    assert.equal(byName.Unspecified.amount, 50);
  });
});

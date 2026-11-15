// The signatory's signature on certificates: the parish admin uploads a photo of it in Settings -> Certificates,
// HolyApp turns the paper see-through, and it reaches the office's settings and the parishioner's own copies.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { pool, api, createParish, createBaptism } = require('./helpers');

after(() => pool.end());

/** A phone-style photo: slightly grey paper with a blue ballpen scribble. */
function signaturePhoto({ ink = true } = {}) {
  const strokes = ink
    ? `<path d="M120 260 C 200 120, 260 360, 340 200 S 480 140, 560 260 S 700 300, 820 180"
             stroke="#1b2a8a" stroke-width="9" fill="none" stroke-linecap="round"/>
       <path d="M300 300 L 700 290" stroke="#1b2a8a" stroke-width="6" fill="none"/>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500">
    <rect width="1000" height="500" fill="#e9e6df"/>${strokes}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

const decode = (dataUrl) => Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

describe('Certificate signature', () => {
  let parish;

  before(async () => {
    parish = await createParish('Signature');
    await api(parish.admin).get('/parish/settings/certificates'); // creates the four certificate settings
  });

  const upload = async (user, types, body) =>
    api(user).put(`/parish/settings/certificates/signature?types=${types}`).set('Content-Type', 'image/jpeg').send(body);

  it('cleans up a photo: paper becomes see-through, the ink keeps its colour, the edges are trimmed', async () => {
    const res = await upload(parish.admin, 'baptism,confirmation', await signaturePhoto());
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const { baptism, confirmation, marriage } = res.body.certificates;
    assert.match(baptism.signatureImage, /^data:image\/png;base64,/);
    assert.equal(confirmation.signatureImage, baptism.signatureImage);
    assert.equal(marriage.signatureImage, null, 'only the chosen certificates get it');

    const png = decode(baptism.signatureImage);
    const meta = await sharp(png).metadata();
    assert.equal(meta.hasAlpha, true);
    assert.ok(meta.width < 1000 && meta.height < 400, `trimmed to the ink, got ${meta.width}x${meta.height}`);

    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(data[3], 0, 'a corner is paper, so it is see-through');
    let blueInk = 0;
    for (let i = 0; i < info.width * info.height; i += 1) {
      const [r, g, b, a] = data.subarray(i * 4, i * 4 + 4);
      if (a > 200 && b > r + 20) blueInk += 1;
    }
    assert.ok(blueInk > 100, 'blue ballpen stays blue');

    const audit = await pool.query(
      `SELECT 1 FROM audit_log WHERE parish_id = $1 AND action = 'parish.certificate_signature_changed'`,
      [parish.id]
    );
    assert.equal(audit.rowCount, 1);
  });

  it('refuses a blank page, a file that is not an image, a missing type, and staff accounts', async () => {
    const blank = await upload(parish.admin, 'baptism', await signaturePhoto({ ink: false }));
    assert.equal(blank.status, 400);
    assert.match(blank.body.error, /couldn't find a signature/);

    const notImage = await upload(parish.admin, 'baptism', Buffer.from('not an image'));
    assert.equal(notImage.status, 400);

    const noType = await upload(parish.admin, 'christening', await signaturePhoto());
    assert.equal(noType.status, 400);

    const staff = await upload(parish.staff, 'baptism', await signaturePhoto());
    assert.equal(staff.status, 403);

    // Staff still see it, since they print the certificates.
    const seen = await api(parish.staff).get('/parish/settings/certificates');
    assert.match(seen.body.certificates.baptism.signatureImage, /^data:image\/png/);
  });

  it("is dropped when the signatory's name changes, and kept when only the title changes", async () => {
    const current = (await api(parish.admin).get('/parish/settings/certificates')).body.certificates;
    const titleOnly = await api(parish.admin)
      .put('/parish/settings/certificates')
      .send({ certificates: { ...current, baptism: { ...current.baptism, signatoryTitle: 'Rector' } } });
    assert.equal(titleOnly.status, 200, JSON.stringify(titleOnly.body));
    assert.ok(titleOnly.body.certificates.baptism.signatureImage, 'same person, same signature');

    const renamed = await api(parish.admin)
      .put('/parish/settings/certificates')
      .send({ certificates: { ...current, confirmation: { ...current.confirmation, signatoryName: 'Fr. Someone Else' } } });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.certificates.confirmation.signatureImage, null);
    assert.ok(renamed.body.certificates.baptism.signatureImage, 'the other certificates keep theirs');
  });

  it("prints on the parishioner's own copy only while the same person signs", async () => {
    const record = await createBaptism(parish.staff, { firstName: 'Signed' });
    const issued = await api(parish.staff)
      .post(`/records/baptism/${record.id}/certificates`)
      .send({ purpose: 'School enrollment' });
    assert.equal(issued.status, 201, JSON.stringify(issued.body));
    await pool.query(`UPDATE certificate_request SET requested_by = $1 WHERE record_id = $2`, [parish.parishioner.id, record.id]);

    const mine = async () => {
      const res = await api(parish.parishioner).get('/certificates/mine');
      assert.equal(res.status, 200, JSON.stringify(res.body));
      return res.body.certificates.find((c) => c.holderName.includes('Signed')).fields;
    };
    const fields = await mine();
    assert.ok(fields.signatoryName, 'the name under the line comes with the copy');
    assert.match(fields.signatureImage, /^data:image\/png/);

    // A new priest signs from now on: older copies keep his name but not the newcomer's signature.
    await pool.query(
      `UPDATE certificate_configuration SET signatory_name = 'Fr. Newly Assigned'
       WHERE parish_id = $1 AND certificate_type = 'baptism'`,
      [parish.id]
    );
    const after = await mine();
    assert.equal(after.signatureImage, undefined);
    assert.equal(after.signatoryName, fields.signatoryName);
  });

  it('removes the signature from the chosen certificates', async () => {
    const res = await api(parish.admin).delete('/parish/settings/certificates/signature?types=baptism');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.certificates.baptism.signatureImage, null);
  });
});

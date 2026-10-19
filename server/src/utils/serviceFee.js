const FEE_NAMES = {
  baptism: 'Baptismal Certificate',
  confirmation: 'Confirmation Certificate',
  marriage: 'Marriage Certificate',
  death: 'Death Certificate',
};
const FEE_DEFAULTS = {
  baptism: 100,
  confirmation: 100,
  marriage: 150,
  death: 100,
};

async function feeAmount(db, parishId, sacrament, copies) {
  const named = await db.query(
    'SELECT amount FROM service_fee WHERE parish_id = $1 AND service_name = $2',
    [parishId, FEE_NAMES[sacrament]]
  );
  const base = named.rows[0] ? Number(named.rows[0].amount) : FEE_DEFAULTS[sacrament] || 100;
  const count = Math.max(1, Number(copies) || 1);
  return Math.round(base * count * 100) / 100;
}

function feeCentavos(pesos) {
  return Math.round(Number(pesos) * 100);
}

function feeLabel(sacrament) {
  return FEE_NAMES[sacrament] || 'Certificate';
}

module.exports = { FEE_NAMES, FEE_DEFAULTS, feeAmount, feeCentavos, feeLabel };

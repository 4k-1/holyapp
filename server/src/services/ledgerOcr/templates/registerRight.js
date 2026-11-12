// Right page of a baptism register spread ("Register").
// Row N here belongs to entry N on the left page. See baptismalLeft.js for the keys.
module.exports = {
  id: 'register-right',
  version: 'register-right-v1',
  headerBands: 1,
  columns: [
    { field: 'residence', kind: 'block' },
    { field: 'dateOfBaptism', kind: 'date' },
    { field: 'minister', kind: 'block' },
    { split: ['sponsor1', 'sponsor2'], kind: 'text' },
    { field: 'observations', kind: 'block' },
  ],
};

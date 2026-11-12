// Left page of a baptism register spread ("Baptismal").
// One item per column, left to right, as the ruled lines divide the page.
//   field: what the column holds
//   split: the column is divided by a thin line; [top field, bottom field]
//   kind:  'digits' (numbers only), 'text' (one line), 'block' (may wrap onto two lines),
//          'date' (one line, only month-name letters, digits and commas),
//          'tick' (a check mark; detected by ink, not read as text).
//          A split column may give [top kind, bottom kind].
module.exports = {
  id: 'baptismal-left',
  version: 'baptismal-left-v1',
  headerBands: 1, // rows of column headings above the first entry
  columns: [
    { field: 'entryNumber', kind: 'digits' },
    { field: 'childFullName', kind: 'text' },
    { split: ['placeOfBirth', 'dateOfBirth'], kind: ['text', 'date'] },
    { field: 'legitimateTick', kind: 'tick' }, // "L"
    { field: 'illegitimateTick', kind: 'tick' }, // "ILL"
    { split: ['fatherName', 'motherName'], kind: 'text' },
  ],
  // Tick boxes that together answer one question. Exactly one ticked gives its value.
  ticks: {
    legitimacy: { legitimateTick: 'L', illegitimateTick: 'ILL' },
  },
};

const baptismal = require('./baptismalLeft');
const register = require('./registerRight');

const TEMPLATES = { baptismal, register };

// Picks the template from a scan's file name: "-left" is the Baptismal page, "-right" the Register page.
function templateFor(fileName, key) {
  const k = key || (/-right(\.\w+)?$/.test(fileName) ? 'register' : 'baptismal');
  const t = TEMPLATES[k];
  if (!t) throw new Error(`Unknown template "${k}". Use ${Object.keys(TEMPLATES).join(' or ')}.`);
  return t;
}

module.exports = { TEMPLATES, templateFor };

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

// Each test gets fresh module state. Only explicitly named boundaries are stubbed;
// all other imports use the real implementation. No global require-cache changes.
function load(relativePath, dependencies = {}, globals = {}) {
  const filename = path.resolve(__dirname, '../../src', relativePath);
  const nativeRequire = createRequire(filename);
  const module = { exports: {} };
  const wrapper = vm.runInThisContext(
    '(function(require, module, exports, Date) {\n' +
      fs.readFileSync(filename, 'utf8') + '\n})',
    { filename }
  );
  wrapper(
    (id) => Object.hasOwn(dependencies, id) ? dependencies[id] : nativeRequire(id),
    module, module.exports, globals.Date || Date
  );
  return module.exports;
}

const NOW = '2026-06-15T12:00:00.000Z';
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [NOW])); }
  static now() { return new Date(NOW).getTime(); }
}

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

module.exports = { load, FixedDate, response };

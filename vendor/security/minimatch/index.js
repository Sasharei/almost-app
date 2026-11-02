"use strict";
// Fixed upstream engine, with the callable CommonJS API still used by glob 7.
const core = require("minimatch-core");
function compatible(api) {
  const engine = typeof api === "function" ? api : api.minimatch;
  const match = (path, pattern, options) => engine(path, pattern, options);
  Object.assign(match, api);
  class Minimatch extends api.Minimatch {
    parse(pattern) {
      const part = super.parse(pattern);
      if (part && typeof part === "object") {
        // glob 7 reads _glob and calls String.match() on each parsed segment.
        // minimatch 11 uses safe Matcher objects rather than RegExp objects.
        part._glob = pattern;
        part[Symbol.match] = (value) => part.test(value) ? [value] : null;
      }
      return part;
    }
    static defaults(options) {
      return compatible(engine.defaults(options)).Minimatch;
    }
  }
  match.Minimatch = Minimatch;
  match.defaults = (options) => compatible(engine.defaults(options));
  // defaults() on the upstream matcher returns a function with its own helpers.
  if (typeof engine !== "function") throw new TypeError("Missing minimatch engine");
  return match;
}
const match = compatible(core);
module.exports = match;
module.exports.minimatch = core.minimatch;
module.exports.GLOBSTAR = core.GLOBSTAR;
module.exports.filter = core.filter;
module.exports.makeRe = core.makeRe;
module.exports.match = core.match;
module.exports.braceExpand = core.braceExpand;
module.exports.escape = core.escape;
module.exports.unescape = core.unescape;
module.exports.sep = core.sep;

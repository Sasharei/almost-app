const test = require('node:test');
const { checkSecurityVendors } = require('../security-vendor-contract');
test('security forks reject adversarial AST/signature inputs and retain glob/certificate behavior', checkSecurityVendors);

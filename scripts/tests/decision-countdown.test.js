const test = require('node:test');
const assert = require('node:assert/strict');
const { formatDecisionCountdown } = require('../../src/utils/decisionCountdown');
test('countdown never wraps a minute or expires early', () => {
  assert.equal(formatDecisionCountdown(59999), '00:01:00');
  assert.equal(formatDecisionCountdown(59000), '00:00:59');
  assert.equal(formatDecisionCountdown(1), '00:00:01');
  assert.equal(formatDecisionCountdown(0), '00:00:00');
  assert.equal(formatDecisionCountdown(-1000), '00:00:00');
  assert.equal(formatDecisionCountdown(3600001), '01:00:01');
});
test('countdown uses the language numeral system without thousands separators', () => {
  assert.equal(formatDecisionCountdown(61000, 'ar-EG'), '٠٠:٠١:٠١');
});

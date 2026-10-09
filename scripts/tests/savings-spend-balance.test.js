const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync(require('node:path').join(__dirname, '../../App.js'), 'utf8');
const section = app.slice(app.indexOf('  const revokeSameDaySavingsForSpend = useCallback('), app.indexOf('  const priceEditorTemplateId ='));
const now = new Date(2026, 9, 4, 19, 22).getTime();
function run({balance = 2970, progress = 2970, history = [], spendAt = now} = {}) {
  let saved = balance, savedProgress = progress, nextHistory = history;
  const goals = [];
  const context = {
    useCallback: (fn) => fn,
    buildLegacyTemplateKeys: (id) => [id], normalizeTemplateKey: (id) => id,
    resolvedHistoryEvents: history,
    isTimestampInLocalCalendarDay: (a,b) => new Date(a).toDateString() === new Date(b).toDateString(),
    getDayKey: (a) => new Date(a).toDateString(),
    cancelSameDaySmartReminders: async () => {},
    applyHistoryGoalDelta: (...args) => goals.push(args), resolveTemptationGoalId: () => null,
    setHistoryEvents: (value) => { nextHistory = value; },
    setChallengesState: () => {}, rebuildChallengeProgressFromHistory: () => {}, recomputeHistoryAggregates: () => {},
    setSavedTotalUSD: (fn) => { saved = typeof fn === 'function' ? fn(saved) : fn; },
    setProgressSavedTotalUSD: (fn) => { savedProgress = typeof fn === 'function' ? fn(savedProgress) : fn; },
    clampSavedBalanceUSD: (value) => Math.min(1e12, Math.max(0, value)), logEvent: () => {},
    // Deliberately incomplete retained history: the original implementation overwrites the balance here.
    rebuildSavingsFromHistory: (list) => { saved = list.filter(e => e.kind === 'refuse_spend').reduce((sum,e) => sum+e.meta.amountUSD,0); savedProgress = saved; },
  };
  const revoke = vm.runInNewContext(section + '\nrevokeSameDaySavingsForSpend;', context);
  const result = revoke({id:'cigarettes'}, 'cigarettes', spendAt);
  return {saved,savedProgress,nextHistory,result,goals};
}
const event = (id, amount, timestamp = now-1000, templateId = 'cigarettes', goalId = null) => ({id,kind:'refuse_spend',timestamp,meta:{templateId,amountUSD:amount,goalId}});
test('a six-dollar spend correction preserves savings outside the retained event log', () => {
  const old = event('other',1610,now-1000,'coffee');
  const result=run({history:[event('same-day',6),old]});
  assert.equal(result.saved,2964); assert.equal(result.savedProgress,2964);
  assert.deepEqual(result.nextHistory,[old]); assert.equal(result.result.removedAmountUSD,6);
});
test('same-day reversal touches only the matching card and preserves prior-day savings', () => {
  const yesterday=event('previous',1000,now-24*3600000);
  const other=event('unrelated',500,now-1000,'coffee');
  const future=event('future',900,now+1000);
  const result=run({history:[yesterday,other,future,event('current',6,now-1000,'cigarettes','goal')]});
  assert.equal(result.saved,2964); assert.equal(result.nextHistory.length,3);
  assert.deepEqual(result.goals,[['goal',-6]]);
});
test('no same-day saving leaves the balance unchanged; multiple reversals apply their exact sum', () => {
  assert.equal(run({history:[event('old',1000,now-24*3600000)]}).saved,2970);
  const result=run({balance:2650,progress:2100,history:[event('a',6),event('b',3)]});
  assert.equal(result.saved,2641); assert.equal(result.savedProgress,2091);
  assert.equal(result.result.removedCount,2);
});
test('reversal at zero is bounded and never recreates money from unrelated history', () => {
  const result=run({balance:2,progress:1,history:[event('a',6),event('other',1000,now-1000,'coffee')]});
  assert.equal(result.saved,0); assert.equal(result.savedProgress,0);
});

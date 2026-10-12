const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const parser = require('@babel/parser');
const babel = require('@babel/core');
const root = path.join(__dirname, '../..');
const context = vm.createContext({ exports: {} });
vm.runInContext(babel.transformSync(fs.readFileSync(path.join(root, 'src/monetization/paywallOffer.js'), 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code, context);
const { resolvePaywallPurchaseOffer, resolvePaywallTrialEnabled } = context.exports;
const paid = { product: { identifier: 'annual-paid', price: 50 } };
const trial = { product: { identifier: 'annual-trial', price: 60 } };
const annual = { id: 'yearly', available: true, hasTrial: true, package: paid, trialPackage: trial };

test('iOS includes the eligible trial independently of legacy toggle state; Android retains both choices', () => {
  for (const trialEnabled of [false, true, undefined]) {
    assert.equal(resolvePaywallPurchaseOffer({ platform: 'ios', plan: annual, trialEnabled }).package, trial);
  }
  assert.equal(resolvePaywallPurchaseOffer({ platform: 'android', plan: annual, trialEnabled: false }).package, paid);
  assert.equal(resolvePaywallPurchaseOffer({ platform: 'android', plan: annual, trialEnabled: true }).package, trial);
});

test('ineligible annual, monthly and weekly buy paid packages; missing trial cannot silently become a paid purchase', () => {
  for (const plan of [{ ...annual, hasTrial: false }, { ...annual, id: 'monthly' }, { ...annual, id: 'weekly' }]) {
    const offer = resolvePaywallPurchaseOffer({ platform: 'ios', plan, trialEnabled: true });
    assert.equal(offer.package, paid);
    assert.equal(offer.trialEnabled, false);
  }
  assert.equal(resolvePaywallPurchaseOffer({ platform: 'ios', plan: { ...annual, trialPackage: null } }).package, null);
  assert.equal(resolvePaywallTrialEnabled({ platform: 'ios', plan: { ...annual, available: false } }), false);
  assert.equal(resolvePaywallPurchaseOffer({ platform: 'ios', plan: null }).package, null);
});

const source = fs.readFileSync(path.join(root, 'src/components/PremiumPaywallModalV2.js'), 'utf8');
const tree = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
const component = tree.program.body.find(n => n.type === 'VariableDeclaration' && n.declarations[0].id.name === 'PremiumPaywallModalV2').declarations[0].init;
const declaration = name => {
  const node = component.body.body.find(n => n.type === 'VariableDeclaration' && n.declarations[0].id.name === name);
  assert.ok(node, name);
  return source.slice(node.start, node.end);
};

test('monthly → annual reselect restores iOS trial and CTA payload; Android keeps its toggle off', () => {
  for (const platform of ['ios', 'android']) {
    const selections = [];
    const ui = vm.createContext({ Platform: { OS: platform }, freeTrialEnabled: false,
      FREE_TRIAL_DISPLAY_PLAN_ID: 'yearly', resolvePaywallTrialEnabled,
      resolvePlanKind: plan => plan.id, normalizePlanId: id => id,
      trialSelectionInitializedRef: { current: false }, useCallback: fn => fn,
      setSelectedPlanId: () => {}, setFreeTrialEnabled: () => {},
      onPlanSelect: (id, options) => selections.push([id, options.trialEnabled]), annual,
    });
    vm.runInContext(`${declaration('handlePlanSelect')}\nhandlePlanSelect({id:'monthly'}); handlePlanSelect(annual);`, ui);
    assert.deepEqual(selections, [['monthly', false], ['yearly', platform === 'ios']]);
    const purchases = [];
    Object.assign(ui, { selectedPlan: annual, selectedPlanHasActiveTrial: platform === 'ios', purchaseDisabled: false,
      onPlanPress: (id, options) => purchases.push([id, options.trialEnabled]) });
    vm.runInContext(`${declaration('handlePrimaryPress')}\nhandlePrimaryPress();`, ui);
    assert.deepEqual(purchases, [['yearly', platform === 'ios']]);
    ui.purchaseDisabled = true;
    vm.runInContext('handlePrimaryPress();', ui);
    assert.equal(purchases.length, 1);
  }
});

test('the trial switch is hidden on iOS but still offered on Android', () => {
  for (const platform of ['ios', 'android']) {
    const ui = vm.createContext({ Platform: { OS: platform }, hasAnyTrialOffer: true, freeTrialDisplayPlan: annual });
    assert.equal(vm.runInContext(`${declaration('shouldShowFreeTrialToggle')}\nshouldShowFreeTrialToggle`, ui), platform === 'android');
  }
});

test('iOS paid terms cover every supported paywall locale and retain identical placeholders', () => {
  const copy = vm.createContext({ exports: {} });
  vm.runInContext(babel.transformSync(fs.readFileSync(path.join(root, 'src/constants/localizedUiCopy.js'), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code, copy);
  const templates = copy.exports.PAYWALL_PAID_NOTICE_TEMPLATE_BY_LANGUAGE;
  for (const locale of ['en','ru','es','fr','de','pt','it','ar','zh','zh-Hant','ko','ja']) {
    assert.ok(templates[locale]);
    assert.ok(copy.exports.PAYWALL_PAID_CTA_BY_LANGUAGE[locale]);
    assert.deepEqual([...templates[locale].matchAll(/{{(\w+)}}/g)].map(m => m[1]).sort(), ['price','store']);
  }
});

const appSource = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
const appTree = parser.parse(appSource, { sourceType: 'module', plugins: ['jsx'] });
const appBody = appTree.program.body.find(n => n.type === 'FunctionDeclaration' && n.id.name === 'AppContent').body.body;
const appDeclaration = name => {
  const node = appBody.find(n => n.type === 'VariableDeclaration' && n.declarations[0].id.name === name);
  assert.ok(node, name);
  return appSource.slice(node.start, node.end);
};

test('actual purchase handler chooses the annual trial package even when a legacy caller passes false', async () => {
  // Execute the real handler through package selection, before native billing side effects.
  const callback = appDeclaration('handlePremiumPlanPress');
  const prefix = callback.slice(0, callback.indexOf('      const selectedProduct ='));
  for (const platform of ['ios', 'android']) {
    const purchase = vm.createContext({ useCallback: fn => fn, Platform: { OS: platform },
      premiumPurchaseLoadingPlan: null, premiumRestoreLoading: false,
      premiumPaywallState: { trigger: 'manual' }, TRANSACTION_ABANDONED_TRIGGER: 'transaction_abandoned',
      PREMIUM_PLAN_ORDER: ['monthly','yearly','weekly'], premiumPlanCards: [annual], resolvePaywallPurchaseOffer,
    });
    vm.runInContext(prefix + '\nreturn selectedPackage; }, []);', purchase);
    const result = await vm.runInContext('handlePremiumPlanPress("yearly", {trialEnabled:false})', purchase);
    assert.equal(result, platform === 'ios' ? trial : paid);
  }
});

test('iOS exact trial duration is passed to the legal notice; unavailable eligibility never fabricates an offer', () => {
  assert.ok(appSource.includes('trialDays: Platform.OS === "ios" ? resolvedTrialDays : null'));
  assert.ok(appSource.includes('const trialLabel = buildPaywallTrialLabel({ trialDays, language: lang })'));
  const preliminary = appDeclaration('premiumPlanCards');
  const eligibility = preliminary.match(/const trialEligibleForProduct =[\s\S]*?;/)[0];
  for (const eligible of [true, false, undefined]) {
    const ctx = vm.createContext({ Platform: { OS: 'ios' }, trialProductIdentifier: 'trial-product',
      premiumState: { trialEligibilityByProductId: {'trial-product': eligible} } });
    assert.equal(vm.runInContext(eligibility + '\ntrialEligibleForProduct;', ctx), eligible === true);
  }
});

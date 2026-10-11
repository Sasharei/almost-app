// Simulator-only QA entry: uses repository UI/effects and synthetic access.
// No purchase/restore operation is invoked by this fixture or the QA flow.
const { NativeModules, NativeEventEmitter } = require('react-native');
const entitlement = { identifier: 'premium', isActive: true, isSandbox: true, willRenew: false, expirationDate: '2099-10-03T00:00:00Z' };
const info = { entitlements: { active: { premium: entitlement }, all: { premium: entitlement } }, activeSubscriptions: [], allPurchasedProductIdentifiers: [], allExpirationDates: {}, allPurchaseDates: {}, nonSubscriptionTransactions: [], originalAppUserId: 'local-almi-contrast-qa', requestDate: new Date().toISOString() };
const purchases = NativeModules.RNPurchases;
if (purchases) {
  purchases.getCustomerInfo = () => Promise.resolve(info);
  purchases.getOfferings = () => Promise.resolve({ all: {}, current: null });
  const addListener = NativeEventEmitter.prototype.addListener;
  NativeEventEmitter.prototype.addListener = function (name, listener, context) {
    return addListener.call(this, name, name === 'Purchases-CustomerInfoUpdated' ? () => listener(info) : listener, context);
  };
}
require('../../index');

const assert = require("node:assert/strict");
const test = require("node:test");
const { INITIAL_PRACTICE_TUTORIAL, practiceTutorialReducer: reduce, resolvePracticeTutorialStep, resolvePracticeSpotlight, resolvePracticeTargetLayout } = require("../../src/utils/practiceTutorial");

test("only the real requested action advances each tutorial step", () => {
  let state = INITIAL_PRACTICE_TUTORIAL;
  for (const type of ["NEXT", "CARD", "AMOUNT", "ACTION_STARTED", "ACTION_RESULT"]) assert.equal(reduce(state, { type, valid: true, result: { committed: true } }), state);
  state = reduce(state, { type: "OPEN" });
  assert.equal(state.stage, "card");
  assert.equal(resolvePracticeTutorialStep(state.stage), 2);
  assert.equal(reduce(state, { type: "AMOUNT", valid: true }), state);
  state = reduce(state, { type: "CARD" });
  assert.equal(state.stage, "amount");
  assert.equal(reduce(state, { type: "AMOUNT", valid: false }), state);
  state = reduce(state, { type: "AMOUNT", valid: true });
  assert.equal(state.stage, "action");
  state = reduce(state, { type: "ACTION_STARTED" });
  assert.equal(state.stage, "pending");
  for (const result of [undefined, { cancelled: true }, { committed: false }]) assert.equal(reduce(state, { type: "ACTION_RESULT", result }).stage, "action");
  for (const type of ["save", "spend", "pause"]) {
    const result = reduce(state, { type: "ACTION_RESULT", result: { committed: true, type } });
    assert.equal(result.stage, "result");
    assert.equal(result.outcome, type);
    assert.equal(resolvePracticeTutorialStep(result.stage), 4);
  }
});

test("empty-card creation/cancel and retry remain recoverable", () => {
  let state = reduce(INITIAL_PRACTICE_TUTORIAL, { type: "AVAILABILITY", hasCards: false });
  state = reduce(state, { type: "EMPTY_ADD" });
  assert.equal(state.stage, "empty");
  state = reduce(state, { type: "EMPTY_RETURN" });
  assert.equal(state.stage, "open");
  state = reduce(state, { type: "RESET" });
  assert.equal(state.hasCards, false);
  assert.equal(state.reset, 1);
  state = reduce(state, { type: "AVAILABILITY", hasCards: true });
  state = reduce(state, { type: "OPEN" });
  assert.equal(state.stage, "card");
});

function covered(rect, x, y) { return x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height; }
test("touch blockers cover every point outside the real opening, with no overlap", () => {
  for (const [width, height, target] of [
    [320, 568, { x: 20, y: 420, width: 280, height: 52 }],
    [430, 932, { x: 16, y: 170, width: 398, height: 210 }],
    [1024, 768, { x: 270, y: 280, width: 480, height: 48 }],
    [320, 400, { x: -4, y: 20, width: 80, height: 40 }],
  ]) {
    const { hole, blockers } = resolvePracticeSpotlight({ width, height, target });
    assert.ok(hole);
    const blockedArea = blockers.reduce((sum, r) => sum + r.width * r.height, 0);
    assert.equal(blockedArea + hole.width * hole.height, width * height);
    for (let x = 0.5; x < width; x += 7) for (let y = 0.5; y < height; y += 7) {
      assert.equal(blockers.filter((rect) => covered(rect, x, y)).length, covered(hole, x, y) ? 0 : 1);
    }
  }
});

test("missing, invalid or entirely offscreen targets never unlock underlying UI", () => {
  for (const target of [null, { x: NaN, y: 0, width: 10, height: 10 }, { x: 0, y: 1000, width: 100, height: 40 }, { x: 400, y: 0, width: 100, height: 40 }]) {
    const result = resolvePracticeSpotlight({ width: 320, height: 568, target });
    assert.equal(result.hole, null);
    assert.deepEqual(result.blockers, [{ left: 0, top: 0, width: 320, height: 568 }]);
  }
});


test("a late decision from an older tour session cannot complete a replay", () => {
  const state = { ...INITIAL_PRACTICE_TUTORIAL, stage: "pending", reset: 2 };
  assert.equal(reduce(state, { type: "ACTION_RESULT", reset: 1, result: { committed: true, type: "save" } }), state);
  assert.equal(reduce(state, { type: "ACTION_RESULT", reset: 2, result: { committed: true, type: "save" } }).stage, "result");
});

test("keyboard and large-text forms expose an actual touchable slice without requiring full-card fit", () => {
  for (const height of [230, 380, 620]) {
    const layout = resolvePracticeTargetLayout({ rect: { x: 16, y: 100, width: 288, height }, top: 48, bottom: 330, keyboardVisible: true });
    assert.equal(layout.oversized, true);
    assert.equal(layout.ready, true);
    assert.ok(layout.displayRect.height >= 48);
    assert.ok(layout.displayRect.y >= 48);
    assert.ok(layout.displayRect.y + layout.displayRect.height <= 330);
    assert.ok(layout.displayRect.y >= 100 && layout.displayRect.y + layout.displayRect.height <= 100 + height);
  }
  const outside = resolvePracticeTargetLayout({ rect: { x: 16, y: 500, width: 288, height: 380 }, top: 48, bottom: 330, keyboardVisible: true });
  assert.equal(outside.ready, false);
  assert.equal(outside.needsScroll, true);
});

test("amount step ends only on actual drag release or accessible confirmation", () => {
  const fs = require("node:fs"), vm = require("node:vm");
  const source = fs.readFileSync(require("node:path").join(__dirname, "../../App.js"), "utf8");
  const ast = require("@babel/parser").parse(source, { sourceType: "module", plugins: ["jsx"] });
  let interaction, confirmation;
  require("@babel/traverse").default(ast, { VariableDeclarator(path) {
    if (path.node.id.name === "onSliderInteraction") interaction = path.node.init.arguments[0];
    if (path.node.id.name === "confirmPracticeAmount") confirmation = path.node.init.arguments[0];
  } });
  const events = [], interactions = [];
  const ref = { current: { valid: false, event: (type, detail) => events.push([type, detail.valid]) } };
  const context = { practiceAmountRef: ref, setSliderInteracting: (v) => interactions.push(v), onSliderInteractionChange() {} };
  const drag = vm.runInNewContext(`(${source.slice(interaction.start, interaction.end)})`, context);
  drag(false);
  assert.deepEqual(events, []);
  drag(true);
  ref.current.valid = true;
  assert.deepEqual(events, [], "a value/render update during dragging is not completion");
  drag(false); drag(false);
  assert.deepEqual(events, [["AMOUNT", true]]);
  const confirm = vm.runInNewContext(`(${source.slice(confirmation.start, confirmation.end)})`, context);
  confirm();
  assert.deepEqual(events, [["AMOUNT", true], ["AMOUNT", true]]);
});

test("native feed confirmation preserves the amount on cancel and never reopens an expired tour", async () => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const source = fs.readFileSync(require("node:path").join(__dirname, "../../App.js"), "utf8");
  const start = source.indexOf("  const confirmAmountAction = useCallback(");
  const end = source.indexOf("  const switchAmountSliderAction =", start);
  const expression = source.slice(start, end).trim().replace(/^const confirmAmountAction = /, "").replace(/;$/, "");
  for (const outcome of ["cancel", "commit", "error", "replay", "skip"]) {
    let visible = true, resolve, reject;
    const calls = [];
    const tutorial = { active: true, state: { reset: 3 }, sessionRef: { current: 3 }, activeRef: { current: true } };
    const context = {
      useCallback: (fn) => fn, amountSliderDisplayedAmountUSDRef: { current: 7.25 }, amountSliderManualUSDRef: { current: null },
      amountSliderValueRef: { current: 0.5 }, amountSliderBaseOverrideUSDRef: { current: null },
      clampTransactionAmountUSD: (amount) => amount, triggerHaptic() {}, playSound() {},
      Haptics: { ImpactFeedbackStyle: { Light: "light", Medium: "medium" } }, suppressCardPressUntilRef: {},
      amountSliderResumeRef: { current: false }, practiceTutorial: tutorial, setAmountSliderVisible: (value) => { visible = value; }, notifyAmountSliderTouch() {},
      onAction: (...args) => { calls.push(args); return new Promise((yes, no) => { resolve = yes; reject = no; }); },
      closeAmountSlider() { throw new Error("must preserve draft during the tour"); }, item: { id: "feed-card" },
      onAmountSliderConfirmCoachComplete: null, resolveAmountSliderAmount() { throw new Error("must use displayed amount"); },
    };
    const confirm = vm.runInNewContext(expression, context);
    const pending = confirm("spend");
    assert.equal(visible, false, "native modal yields to the real confirmation dialog");
    assert.equal(calls[0][0], "spend");
    assert.equal(calls[0][1].id, "feed-card");
    assert.equal(calls[0][2].amountUSD, 7.25);
    if (outcome === "replay") tutorial.sessionRef.current++;
    if (outcome === "skip") tutorial.activeRef.current = false;
    if (outcome === "error") reject(Error("temporary failure"));
    else resolve(outcome === "commit" ? { committed: true } : { cancelled: true });
    await pending;
    assert.equal(visible, outcome === "cancel" || outcome === "error");
    assert.equal(context.amountSliderResumeRef.current, outcome === "cancel" || outcome === "error");
    assert.equal(context.amountSliderDisplayedAmountUSDRef.current, 7.25);
  }
});


test("reopening a cancelled native decision does not run the initial amount reset", () => {
  const fs = require("node:fs"), vm = require("node:vm");
  const source = fs.readFileSync(require("node:path").join(__dirname, "../../App.js"), "utf8");
  const marker = source.indexOf("    if (amountSliderResumeRef.current) {");
  const effect = source.slice(source.lastIndexOf("  useEffect(() => {", marker), source.indexOf("\n\n", marker));
  for (const resume of [false, true]) {
    let displayed = 0.75;
    const context = { useEffect: (fn) => fn(), amountSliderVisible: true, amountSliderResumeRef: { current: resume },
      amountSliderValueRef: { current: 0.75 }, amountSliderStepRef: {}, amountSliderStepCount: 100, item: { id: "feed-card" },
      setAmountSliderValue: (value) => { displayed = value; } };
    vm.runInNewContext(effect, context);
    assert.equal(displayed, resume ? 0.75 : 0.5);
    assert.equal(context.amountSliderValueRef.current, resume ? 0.75 : 0.5);
    assert.equal(context.amountSliderResumeRef.current, false);
  }
});

test("a live spotlight survives unrelated registrations but never unlocks a replaced or stale node", () => {
  const { isPracticeAnchorCurrent } = require('../../src/utils/practiceTutorial');
  const node = { current: {} };
  const anchor = { id: 'practice-card', session: 4, node, ready: true, registry: 1 };
  assert.equal(isPracticeAnchorCurrent({ ...anchor, registry: 100 }, 'practice-card', 4, node), true);
  assert.equal(isPracticeAnchorCurrent(anchor, 'practice-amount', 4, node), false);
  assert.equal(isPracticeAnchorCurrent(anchor, 'practice-card', 5, node), false);
  assert.equal(isPracticeAnchorCurrent(anchor, 'practice-card', 4, { current: {} }), false);
  node.current = null;
  assert.equal(isPracticeAnchorCurrent(anchor, 'practice-card', 4, node), false);
});

test("copy resizing cannot flip the bubble between sides of the same target", () => {
  const { resolvePracticeBubbleLayout } = require('../../src/utils/practiceTutorial');
  // The old text-size threshold chose below at 180 px, then jumped above at
  // 240 px, changing the measured constrained height and repeating the loop.
  const hole = { left: 16, top: 360, width: 288, height: 160 };
  for (const contentHeight of [180, 240, 400, 180, 240]) {
    const box = resolvePracticeBubbleLayout({ top: 48, bottom: 730, hole, contentHeight });
    assert.equal(box.top + box.height, hole.top - 12);
    assert.ok(box.top >= 48);
    assert.ok(box.height <= contentHeight);
  }
});

test("bubble placement stays inside safe bounds for real phone, keyboard and large text geometry", () => {
  const { resolvePracticeBubbleLayout } = require('../../src/utils/practiceTutorial');
  for (const [top, bottom, hole] of [
    [48, 850, { left: 16, top: 130, width: 370, height: 260 }],
    [48, 850, { left: 16, top: 620, width: 370, height: 170 }],
    [48, 340, { left: 16, top: 180, width: 288, height: 80 }],
    [48, 560, { left: 16, top: 178, width: 288, height: 380 }],
  ]) for (const contentHeight of [180, 300, 700]) {
    const box = resolvePracticeBubbleLayout({ top, bottom, hole, contentHeight });
    assert.ok(box.top >= top, JSON.stringify(box));
    assert.ok(box.top + box.height <= bottom, JSON.stringify(box));
    assert.ok(box.height >= 56);
  }
});

test("the animated mask uses the outline's rounded corners and a valid full-screen fallback", () => {
  const { resolvePracticeSpotlightPath } = require('../../src/utils/practiceTutorial');
  assert.equal(resolvePracticeSpotlightPath(320, 568, null), 'M0 0H320V568H0Z');
  const path = resolvePracticeSpotlightPath(320, 568, { left: 10, top: 20, width: 100, height: 50 });
  assert.match(path, /M22 20H98Q110 20 110 32/);
  assert.equal((path.match(/Q/g) || []).length, 4);
  assert.doesNotMatch(resolvePracticeSpotlightPath(320, 568, { left: 0, top: 0, width: 4, height: 4 }), /NaN|Infinity/);
});

test("an expired recovery timer from the previous step cannot flash recovery on the next step", () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const source = fs.readFileSync(require('node:path').join(__dirname, '../../src/components/PracticeTutorial.js'), 'utf8');
  const guard = source.match(/const recovering = ([^;]+);/)[1];
  const start = source.indexOf('  useEffect(() => {\n    setDelayedTarget(null);');
  const effect = source.slice(start, source.indexOf('\n  useEffect(', start + 1));
  let callback, cleanup, cleared = false;
  const context = { visible: true, waiting: false, ready: false, holding: false, deadlineKey: '0:practice-card', delayedTarget: '0:practice-open',
    useEffect: (fn) => { cleanup = fn(); }, setDelayedTarget: (value) => { context.delayedTarget = value; },
    setTimeout: (fn) => { callback = fn; return 1; }, clearTimeout: () => { cleared = true; } };
  assert.equal(vm.runInNewContext(guard, context), false, 'new step is safe before effects run');
  vm.runInNewContext(effect, context);
  assert.equal(vm.runInNewContext(guard, context), false);
  callback();
  assert.equal(vm.runInNewContext(guard, context), true, 'a genuinely missing target exposes recovery after its own deadline');
  cleanup();
  assert.equal(cleared, true);
  context.ready = true;
  vm.runInNewContext(effect, context);
  assert.equal(vm.runInNewContext(guard, context), false, 'a ready target clears its recovery state');
  context.deadlineKey = '0:practice-amount';context.ready = false;
  assert.equal(vm.runInNewContext(guard, context), false);
});

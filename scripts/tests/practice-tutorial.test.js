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

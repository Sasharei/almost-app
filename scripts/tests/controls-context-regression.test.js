const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');
const { resolveControlGeometry } = require('../../src/utils/controlGeometry');
const { isDecisionRecordedToday } = require('../../src/engagement/todayOverview');
const app = fs.readFileSync(require('node:path').join(__dirname,'../../App.js'),'utf8');

test('autocollect cannot double its maximum after each persisted drag; manual extension stays stable',()=>{
 const fragment=app.slice(app.indexOf('  const resolveSliderMaxUSD = useCallback('),app.indexOf('  useEffect(() => {',app.indexOf('  const resolveSliderMaxUSD = useCallback(')));
 const ranges={current:{}};
 const resolve=vm.runInNewContext(fragment+'\nresolveSliderMaxUSD',{useCallback:f=>f,sliderRangesRef:ranges,MAX_TRANSACTION_AMOUNT_USD:1e7,clampTransactionAmountUSD:v=>Math.max(0,Math.min(1e7,Number(v)||0)),resolveEntryAmountUSD:e=>e.amountUSD});
 for(let i=0;i<50;i++) assert.equal(resolve({id:'coffee',amountUSD:30,sliderBaseAmountUSD:15}),30);
 // Legacy snapshots also stay stable while amountUSD is overwritten by persistence.
 assert.equal(resolve({id:'legacy',amountUSD:15}),30);
 assert.equal(resolve({id:'legacy',amountUSD:30}),30);
 ranges.current.coffee=100;
 assert.equal(resolve({id:'coffee',amountUSD:75,sliderBaseAmountUSD:15}),100);
});

test('daily context includes eight due/later cards, deduplicates and resets completion at midnight',()=>{
 const fragment=app.slice(app.indexOf('  const remainingEntries = [...dueEntries'),app.indexOf('  const heroAmountLabel',app.indexOf('  const remainingEntries = [...dueEntries')));
 const day=new Date(2026,9,6,23,59).getTime();
 const entries=Array.from({length:8},(_,i)=>({id:'card-'+i,interaction:{lastSavedAt:i<6?day:0}}));
 const context=now=>vm.runInNewContext(fragment+'\n({remaining:remainingEntries.length,completed:completedToday})',{dueEntries:entries.slice(0,2),laterEntries:[...entries.slice(2),entries[0]],decisionEntries:entries,now,isDecisionRecordedToday});
 assert.equal(context(day).remaining,2); assert.equal(context(day).completed,6);
 assert.equal(context(day+120000).remaining,8); assert.equal(context(day+120000).completed,0);
});

function wheelHarness(){
 const source=app.slice(app.indexOf('const NumberWheelColumn = React.memo'),app.indexOf('\nfunction TimeWheelPicker('));
 const code=babel.transformSync(source,{babelrc:false,configFile:false,plugins:[['@babel/plugin-transform-react-jsx',{runtime:'classic'}]]}).code;
 const refs=[],effects=[],timers=new Map(),changes=[],scrolls=[];let slot=0,id=0;
 const React={memo:f=>f,createElement:(type,props,...children)=>({type,props:{...props,children}})};
 const context={React,useRef:initial=>{const index=slot++;return refs[index]||(refs[index]={current:initial});},useMemo:f=>f(),useCallback:f=>f,useEffect:f=>effects.push(f),TIME_WHEEL_ITEM_HEIGHT:Number(app.match(/const TIME_WHEEL_ITEM_HEIGHT = (\d+)/)[1]),TIME_WHEEL_VISIBLE_ITEMS:3,TIME_WHEEL_PADDING:48,TIME_WHEEL_LOOP_COPIES:9,View:'View',ScrollView:'ScrollView',TouchableOpacity:'TouchableOpacity',Text:'Text',styles:{timeWheelItem:{height:48}},triggerSelectionHaptic:()=>{},colorWithAlpha:c=>c,requestAnimationFrame:f=>{f();return 1},cancelAnimationFrame:()=>{},setTimeout:f=>{timers.set(++id,f);return id;},clearTimeout:id=>timers.delete(id)};
 const render=vm.runInNewContext(code+'\nNumberWheelColumn',context);
 function mount(selected=10){slot=0;const tree=render({values:Array.from({length:24},(_,i)=>i),selectedValue:selected,onChange:v=>changes.push(v),colors:{text:'#111',card:'#fff'}});refs[0].current={scrollTo:v=>scrolls.push(v)};while(effects.length)effects.shift()();return tree.props.children[0].props.children[0].props;}
 return {mount,changes,scrolls,timers};
}
test('wheel row height matches accessible target and native snap geometry',()=>{
 const height=Number(app.match(/const TIME_WHEEL_ITEM_HEIGHT = (\d+)/)[1]);
 for(const platformTarget of [44,48]) assert.equal(resolveControlGeometry({height},platformTarget).height,undefined);
 assert.equal(height,48);
});
test('wheel waits for momentum end and does not realign its own committed selection',()=>{
 const h=wheelHarness(),s=h.mount();
 const event=(index,velocity=1)=>({nativeEvent:{contentOffset:{y:index*48},velocity:{y:velocity}}});
 s.onScrollBeginDrag();s.onScroll(event(109));s.onScrollEndDrag(event(109));s.onMomentumScrollBegin();
 for(const f of h.timers.values())f();assert.equal(h.changes.length,0);
 s.onScroll(event(112));s.onMomentumScrollEnd(event(112));assert.equal(h.changes.at(-1),16);
 const count=h.scrolls.length;h.mount(16);assert.equal(h.scrolls.length,count);
});
test('wheel commits slow drags without momentum and interruption clears pending settle',()=>{
 const h=wheelHarness(),s=h.mount();
 const e={nativeEvent:{contentOffset:{y:107*48},velocity:{y:0}}};
 s.onScrollBeginDrag();s.onScroll(e);s.onScrollEndDrag(e);s.onScrollBeginDrag();
 assert.equal(h.timers.size,0);assert.equal(h.changes.length,0);
 s.onScrollEndDrag(e);for(const f of h.timers.values())f();assert.equal(h.changes.at(-1),11);
});

test('autocollect previews many drag samples locally and persists only the final amount once',()=>{
 const start=app.indexOf('  const pendingSliderEditRef = useRef(null);');
 const end=app.indexOf('  const [sliderInteracting',start);
 const owners=[];
 const context={useRef:initial=>({current:initial}),useCallback:f=>f,onAmountChange:(...args)=>owners.push(args)};
 const edit=vm.runInNewContext(app.slice(start,end)+'\n({pendingSliderEditRef,commitSliderEdit})',context);
 const callbackStart=app.indexOf('onValueChange={(nextAmountUSD) => {',app.indexOf('function TycoonAutosaveModal'));
 const callbackEnd=app.indexOf('\n                      }}',callbackStart);
 const callback=app.slice(callbackStart+'onValueChange={'.length,callbackEnd)+'\n}';
 const preview=vm.runInNewContext('('+callback+')',{pendingSliderEditRef:edit.pendingSliderEditRef,entry:{id:'coffee'},currency:'USD',roundCurrencyValue:v=>Math.round(v*100)/100,convertToCurrency:v=>v,convertFromCurrency:v=>v,clampTransactionAmountUSD:v=>v,setSliderAmountDrafts:()=>{},expanded:false});
 for(let i=1;i<=50;i++)preview(i/2);
 assert.equal(owners.length,0);
 edit.commitSliderEdit();edit.commitSliderEdit();
 assert.equal(owners.length,1);assert.deepEqual(Array.from(owners[0]),['coffee',25]);
 preview(19.73);edit.commitSliderEdit();
 assert.deepEqual(Array.from(owners[1]),['coffee',19.73]);
});

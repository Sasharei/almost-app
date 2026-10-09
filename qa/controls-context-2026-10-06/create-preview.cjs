/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const source = fs.readFileSync(path.join(root,'App.js'),'utf8');
const ast = parser.parse(source,{sourceType:'module',plugins:['jsx']});
const wanted = ['TycoonAutosaveModal','FrequencySchedulePicker','RedesignTodayHeader','resolveThemeColors'];
const statements = new Map();
let program;
traverse(ast,{Program(p){program=p;},ReferencedIdentifier(p){
 const binding=p.scope.getBinding(p.node.name);
 if(!binding) return;
 let owner=p; while(owner.parentPath && !owner.parentPath.isProgram()) owner=owner.parentPath;
 let dependency=binding.path; while(dependency.parentPath && !dependency.parentPath.isProgram()) dependency=dependency.parentPath;
 const set=statements.get(owner.node)||new Set();set.add(dependency.node);statements.set(owner.node,set);
}});
const included=new Set();
function include(node){if(included.has(node))return;included.add(node);for(const dependency of statements.get(node)||[])include(dependency);}
for(const name of wanted){let p=program.scope.getBinding(name).path;while(p.parentPath && !p.parentPath.isProgram())p=p.parentPath;include(p.node);}
const reduced=ast.program.body.filter(n=>included.has(n)).map(n=>source.slice(n.start,n.end)).join('\n');
fs.writeFileSync(path.join(root,'.codex_tmp_controls_app.js'),reduced+'\nexport { '+wanted.join(', ')+' };\n');
console.log('Extracted actual component declarations and their lexical dependencies: '+reduced.length+' characters');
fs.copyFileSync(path.join(__dirname,'preview-entry.fixture'),path.join(root,'.codex_tmp_controls_entry.js'));

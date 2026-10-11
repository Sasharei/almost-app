const response = http.get("http://127.0.0.1:8769/seed?language="+LANG+"&theme="+THEME+"&accent="+ACCENT);
if (response.status !== 200) throw new Error(response.body);
const copy = json(response.body);
function escaped(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
output.description = escaped(copy.description);
output.details = escaped(copy.details);
output.party = escaped(copy.party);
output.badSpeech = copy.badSpeech;
output.caseName = LANG + "-" + THEME + (THEME === "pro" ? "-" + ACCENT : "");
console.log("START " + output.caseName);

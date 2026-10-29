import assert from "node:assert/strict";

const base=process.env.SMOKE_BASE_URL??"http://localhost:3000";
const password=process.env.TEST_DEMO_PASSWORD;
if(!password)throw new Error("Set TEST_DEMO_PASSWORD");
const login=await fetch(`${base}/api/auth/login`,{method:"POST",headers:{origin:base,"content-type":"application/json"},body:JSON.stringify({identifier:"demo-linh@shiftly.test",password})});
assert.equal(login.status,200,await login.text());
const cookies=Object.fromEntries(login.headers.getSetCookie().map((value)=>value.split(";")[0].split("=")));
const cookie=Object.entries(cookies).map(([key,value])=>`${key}=${value}`).join("; ");
const page=await fetch(`${base}/api/me/shift-preferences?week=2026-11-30`,{headers:{cookie}});
assert.equal(page.status,200);
const data=await page.json();
assert.equal(data.store.name,"Demo Store A");
const template=data.templates.find((item)=>item.name==="Demo Morning");
assert.ok(template);
const preferences=[{work_date:"2026-11-30",shift_template_id:template.id,preference:2}];
async function save(body){return fetch(`${base}/api/me/shift-preferences?week=2026-11-30`,{method:"PUT",headers:{origin:base,"x-csrf-token":cookies.csrf,cookie,"content-type":"application/json"},body:JSON.stringify(body)});}
const saved=await save({preferences});
assert.equal(saved.status,200,saved.status===200?"":await saved.text());
assert.equal((await saved.json()).store.name,"Demo Store A");
const injected=await save({store_id:"b79d869a-48ed-4f1c-97de-fcc24b314bf3",preferences});
assert.equal(injected.status,422);
console.log("Preference smoke passed: employee selects shifts only; server derives home store and rejects store injection");

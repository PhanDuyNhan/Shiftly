import assert from "node:assert/strict";
const base=process.env.SMOKE_BASE_URL??"http://localhost:3000";
const password=process.env.TEST_DEMO_PASSWORD;
if(!password)throw new Error("Set TEST_DEMO_PASSWORD");
const login=await fetch(`${base}/api/auth/login`,{method:"POST",headers:{origin:base,"content-type":"application/json"},body:JSON.stringify({identifier:"demo-manager-a@shiftly.test",password})});
assert.equal(login.status,200,await login.text());
const cookies=Object.fromEntries(login.headers.getSetCookie().map((value)=>value.split(";")[0].split("=")));
const cookie=Object.entries(cookies).map(([key,value])=>`${key}=${value}`).join("; ");
async function request(path,method="GET"){
  const response=await fetch(`${base}${path}`,{method,headers:{cookie,...(method==="GET"?{}:{origin:base,"x-csrf-token":cookies.csrf})}});
  const result=await response.json();
  assert.ok(response.ok,`${path}: ${JSON.stringify(result)}`);
  return result;
}
const stores=await request("/api/foundation/stores");
const store=stores.find((item)=>item.code==="DEMO-A");
assert.ok(store);
const schedule=await request(`/api/stores/${store.id}/schedules?week=2026-11-09`);
assert.ok(schedule);
if(schedule.status==="draft"){
  const check=await request(`/api/schedules/${schedule.id}/validate`,"POST");
  assert.equal(check.violations.length,0);
  await request(`/api/schedules/${schedule.id}/publish`,"POST");
}
console.log(`Demo schedule ready: 2026-11-09 is published for ${store.name}`);

import assert from "node:assert/strict";

const base=process.env.SMOKE_BASE_URL??"http://localhost:3000";
const password=process.env.TEST_DEMO_PASSWORD;
if(!password)throw new Error("Set TEST_DEMO_PASSWORD");
const login=await fetch(`${base}/api/auth/login`,{method:"POST",headers:{origin:base,"content-type":"application/json"},body:JSON.stringify({identifier:"demo-manager-b@shiftly.test",password})});
assert.equal(login.status,200,await login.text());
const cookies=Object.fromEntries(login.headers.getSetCookie().map((value)=>value.split(";")[0].split("=")));
const cookie=Object.entries(cookies).map(([key,value])=>`${key}=${value}`).join("; ");
async function request(path,method="GET",body,expected=200){
  const response=await fetch(`${base}${path}`,{method,headers:{cookie,...(method==="GET"?{}:{origin:base,"x-csrf-token":cookies.csrf}),...(body===undefined?{}:{"content-type":"application/json"})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json();
  assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
const store=(await request("/api/foundation/stores")).find((item)=>item.code==="DEMO-B");
assert.ok(store);
const foreign=(await request("/api/foundation/available-employees")).find((item)=>item.full_name==="Demo Linh");
assert.ok(foreign);
assert.notEqual(foreign.home_store_id,store.id);
let schedule=await request(`/api/stores/${store.id}/schedules?week=2026-11-09`);
if(!schedule)schedule=(await request(`/api/stores/${store.id}/schedules`,"POST",{week_start:"2026-11-09"},201)).schedule;
schedule=await request(`/api/schedules/${schedule.id}`);
assert.ok(schedule.slots.length>0);
const slot=schedule.slots[0];
if(schedule.status==="draft"){
  if(!schedule.assignments.some((item)=>item.slot_id===slot.id&&item.user_id===foreign.id&&item.status==="assigned"))
    await request(`/api/slots/${slot.id}/assignments`,"POST",{user_id:foreign.id,expected_version:schedule.version},201);
  const validation=await request(`/api/schedules/${schedule.id}/validate`,"POST");
  assert.equal(validation.violations.length,0);
  await request(`/api/schedules/${schedule.id}/publish`,"POST");
}
console.log("Cross-store smoke passed: manager B scheduled an employee managed by store A without a second employee membership");

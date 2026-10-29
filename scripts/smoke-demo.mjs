import assert from "node:assert/strict";
const base=process.env.SMOKE_BASE_URL??"http://localhost:3000";
const password=process.env.DEMO_PASSWORD;
if(!password)throw new Error("Set DEMO_PASSWORD");
let cookie="",csrf="";
async function request(path,method="GET",body,expected=200){
  const response=await fetch(base+path,{method,headers:{...(method==="GET"?{}:{origin:base,"x-csrf-token":csrf}),...(body===undefined?{}:{"content-type":"application/json"}),...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json();assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);
  const set=response.headers.getSetCookie();if(set.length){const cookies=Object.fromEntries(set.map((value)=>value.split(";")[0].split("=")));cookie=Object.entries(cookies).map(([key,value])=>`${key}=${value}`).join("; ");csrf=cookies.csrf??csrf;}
  return data;
}
const login=await request("/api/auth/login","POST",{identifier:"demo-manager-a@shiftly.test",password});
if(login.must_change_password)await request("/api/auth/change-password","POST",{old_password:password,new_password:process.env.DEMO_NEW_PASSWORD??"Demo-Changed-Password-2026!"});
const stores=await request("/api/foundation/stores");const store=stores.find((item)=>item.code==="DEMO-A");assert.ok(store);
const shortage=await request(`/api/stores/${store.id}/schedules?week=2026-11-02`);
const feasible=await request(`/api/stores/${store.id}/schedules?week=2026-11-09`);
assert.ok(shortage&&feasible);
const shortageRun=await request(`/api/schedules/${shortage.id}/auto-assign`,"POST");
assert.ok(shortageRun.warnings.some((warning)=>warning.missing_count>0));
const feasibleRun=feasible.status==="draft"?await request(`/api/schedules/${feasible.id}/auto-assign`,"POST"):
  {warnings:feasible.runs[0]?.warnings??[],assigned_count:feasible.assignments.filter((item)=>item.status==="assigned").length,run:feasible.runs[0]};
assert.equal(feasibleRun.warnings.length,0);
assert.equal(feasibleRun.assigned_count,5);
const measured=feasibleRun.run.fairness.users.filter((user)=>user.target_hours_week>0);
assert.equal(measured.length,5);
assert.ok(measured.every((user)=>Math.abs(user.assigned_hours-user.target_hours_week)/user.target_hours_week<=0.15));
console.log("Demo smoke passed: shortage fixture leaves slot unfilled; feasible fixture fills five slots with target-hour deviation <=15%");

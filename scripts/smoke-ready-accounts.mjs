import assert from "node:assert/strict";

const base=process.env.SMOKE_BASE_URL??"http://localhost:3000";
const adminPassword=process.env.TEST_ADMIN_PASSWORD;
const demoPassword=process.env.TEST_DEMO_PASSWORD;
if(!adminPassword||!demoPassword)throw new Error("Set TEST_ADMIN_PASSWORD and TEST_DEMO_PASSWORD");

async function login(email,password){
  const response=await fetch(`${base}/api/auth/login`,{method:"POST",headers:{origin:base,"content-type":"application/json"},body:JSON.stringify({identifier:email,password})});
  const data=await response.json();
  assert.equal(response.status,200,`${email}: ${JSON.stringify(data)}`);
  assert.equal(data.must_change_password,false,`${email} still needs a password change`);
  const cookie=response.headers.getSetCookie().map((value)=>value.split(";")[0]).join("; ");
  const meResponse=await fetch(`${base}/api/me`,{headers:{cookie}});
  assert.equal(meResponse.status,200);
  const me=await meResponse.json();
  return {me,cookie};
}

const admin=await login("admin-test@shiftly.test",adminPassword);
assert.equal(admin.me.system_role,"admin");
const manager=await login("demo-manager-a@shiftly.test",demoPassword);
assert.ok(manager.me.memberships.some((item)=>item.role_in_store==="manager"));
const staff=await login("demo-linh@shiftly.test",demoPassword);
assert.ok(staff.me.memberships.some((item)=>item.role_in_store==="employee"));
const schedule=await fetch(`${base}/api/me/schedule?week=2026-11-09`,{headers:{cookie:staff.cookie}});
assert.equal(schedule.status,200);
assert.equal(new Set((await schedule.json()).map((item)=>item.store_id)).size,2,"Demo employee should have published shifts at two stores");
const preferencePage=await fetch(`${base}/api/me/shift-preferences?week=2026-11-16`,{headers:{cookie:staff.cookie}});
assert.equal(preferencePage.status,200);
assert.equal((await preferencePage.json()).store.name,"Demo Store A");
console.log("Ready accounts passed: admin/manager/employee login, one home store and published shifts at two stores");

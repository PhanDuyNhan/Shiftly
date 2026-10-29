import assert from "node:assert/strict";

const base=process.env.SMOKE_BASE_URL??"http://localhost:3000";
const password=process.env.TEST_DEMO_PASSWORD;
if(!password)throw new Error("Set TEST_DEMO_PASSWORD");
async function login(email){
  const response=await fetch(`${base}/api/auth/login`,{method:"POST",headers:{origin:base,"content-type":"application/json"},body:JSON.stringify({identifier:email,password})});
  assert.equal(response.status,200,`${email}: ${await response.text()}`);
  const cookies=Object.fromEntries(response.headers.getSetCookie().map((value)=>value.split(";")[0].split("=")));
  return {cookie:Object.entries(cookies).map(([key,value])=>`${key}=${value}`).join("; "),csrf:cookies.csrf};
}
async function request(client,path,method="GET",body,expected=200){
  const multipart=body instanceof FormData;
  const response=await fetch(`${base}${path}`,{method,headers:{cookie:client.cookie,...(method==="GET"?{}:{origin:base,"x-csrf-token":client.csrf}),...(body===undefined||multipart?{}:{"content-type":"application/json"})},body:body===undefined?undefined:multipart?body:JSON.stringify(body)});
  const data=await response.json();
  assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
const managerB=await login("demo-manager-b@shiftly.test");
const managerA=await login("demo-manager-a@shiftly.test");
const staff=await login("demo-mai@shiftly.test");
const storeB=(await request(managerB,"/api/foundation/stores")).find((item)=>item.code==="DEMO-B");
const storeA=(await request(managerA,"/api/foundation/stores")).find((item)=>item.code==="DEMO-A");
assert.ok(storeA&&storeB);
const foreign=(await request(managerB,"/api/foundation/available-employees")).find((item)=>item.full_name==="Demo Mai");
assert.equal(foreign.home_store_id,storeA.id);
let schedule=await request(managerB,`/api/stores/${storeB.id}/schedules?week=2026-11-16`);
if(!schedule)schedule=(await request(managerB,`/api/stores/${storeB.id}/schedules`,"POST",{week_start:"2026-11-16"},201)).schedule;
schedule=await request(managerB,`/api/schedules/${schedule.id}`);
assert.ok(schedule.slots.length>0);
const slot=schedule.slots[0];
if(schedule.status==="draft"){
  await request(managerB,`/api/slots/${slot.id}/assignments`,"POST",{user_id:foreign.id,expected_version:schedule.version},201);
  await request(managerB,`/api/schedules/${schedule.id}/publish`,"POST");
}
const leaveType=(await request(staff,"/api/leave-types")).find((item)=>!item.requires_attachment);
assert.ok(leaveType);
const form=new FormData();
for(const [key,value] of Object.entries({store_id:storeA.id,leave_type_id:leaveType.id,start_date:"2026-11-19",end_date:"2026-11-19",reason:"Cross-store leave check"}))form.set(key,value);
const leave=await request(staff,"/api/leave-requests","POST",form,201);
const reviewed=await request(managerA,`/api/leave-requests/${leave.id}/review`,"POST",{decision:"approved"});
assert.ok(reviewed.affected_assignments>=1);
schedule=await request(managerB,`/api/schedules/${schedule.id}`);
assert.ok(schedule.assignments.some((item)=>item.user_id===foreign.id&&item.status==="needs_cover"));
console.log("Cross-store leave smoke passed: approval at home store marked published shift at another store needs_cover");

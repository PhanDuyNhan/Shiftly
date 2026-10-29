import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const base=process.env.SMOKE_BASE_URL??"http://localhost:3000";
const adminPassword=process.env.TEST_ADMIN_PASSWORD;
if(!adminPassword)throw new Error("Set TEST_ADMIN_PASSWORD");
class Client{
  cookie="";csrf="";
  async request(path,method="GET",body,expected=200){
    const multipart=body instanceof FormData;
    const response=await fetch(`${base}${path}`,{method,headers:{...(this.cookie?{cookie:this.cookie}:{}),...(method==="GET"?{}:{origin:base,"x-csrf-token":this.csrf}),...(body===undefined||multipart?{}:{"content-type":"application/json"})},body:body===undefined?undefined:multipart?body:JSON.stringify(body)});
    const data=await response.json();
    assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);
    const cookies=response.headers.getSetCookie();
    if(cookies.length){const values=Object.fromEntries(cookies.map((value)=>value.split(";")[0].split("=")));this.cookie=Object.entries(values).map(([key,value])=>`${key}=${value}`).join("; ");this.csrf=values.csrf??this.csrf;}
    return data;
  }
}
async function login(email,password,temporary=false){const client=new Client();await client.request("/api/auth/login","POST",{identifier:email,password});if(temporary)await client.request("/api/auth/change-password","POST",{old_password:password,new_password:`Test-${randomBytes(20).toString("base64url")}`});return client;}
const admin=await login("admin-test@shiftly.test",adminPassword);
const suffix=randomBytes(4).toString("hex");
const store=await admin.request("/api/foundation/stores","POST",{code:`O${suffix}`,name:`Ownership ${suffix}`},201);
const manager1=await admin.request(`/api/foundation/stores/${store.id}/employees`,"POST",{email:`owner-a-${suffix}@shiftly.test`,full_name:"Owner A"},201);
const manager2=await admin.request(`/api/foundation/stores/${store.id}/employees`,"POST",{email:`owner-b-${suffix}@shiftly.test`,full_name:"Owner B"},201);
await admin.request(`/api/foundation/stores/${store.id}/managers/${manager1.id}`,"PUT");
await admin.request(`/api/foundation/stores/${store.id}/managers/${manager2.id}`,"PUT");
const first=await login(manager1.email,manager1.temporary_password,true);
const second=await login(manager2.email,manager2.temporary_password,true);
const employee=await first.request(`/api/foundation/stores/${store.id}/employees`,"POST",{email:`report-${suffix}@shiftly.test`,full_name:"Direct Report"},201);
assert.equal((await first.request(`/api/foundation/stores/${store.id}/employees/${employee.id}`)).managed_by,manager1.id);
await second.request(`/api/foundation/stores/${store.id}/employees/${employee.id}`,"GET",undefined,403);
await second.request(`/api/foundation/stores/${store.id}/employees/${employee.id}`,"PATCH",{target_hours_week:8},403);
const staff=await login(employee.email,employee.temporary_password,true);
const type=(await staff.request("/api/leave-types")).find((item)=>!item.requires_attachment);
const form=new FormData();for(const [key,value] of Object.entries({store_id:store.id,leave_type_id:type.id,start_date:"2027-03-01",end_date:"2027-03-01",reason:"Ownership check"}))form.set(key,value);
const leave=await staff.request("/api/leave-requests","POST",form,201);
assert.equal((await second.request(`/api/leave-requests?store_id=${store.id}`)).length,0);
await second.request(`/api/leave-requests/${leave.id}/review`,"POST",{decision:"approved"},403);
await admin.request(`/api/foundation/stores/${store.id}/employees/${employee.id}/manager`,"PATCH",{managed_by:manager2.id});
await first.request(`/api/foundation/stores/${store.id}/employees/${employee.id}`,"GET",undefined,403);
assert.equal((await second.request(`/api/foundation/stores/${store.id}/employees/${employee.id}`)).managed_by,manager2.id);
await second.request(`/api/leave-requests/${leave.id}/review`,"POST",{decision:"approved"});
console.log("Manager ownership smoke passed: one direct manager, same-store isolation, audited reassignment and leave review transfer");

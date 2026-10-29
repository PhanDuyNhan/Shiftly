import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const base=process.env.SMOKE_BASE_URL??"http://localhost:3000";
if(!process.env.SMOKE_EMAIL||!process.env.SMOKE_PASSWORD) throw new Error("Set SMOKE_EMAIL and SMOKE_PASSWORD");
class Client{
  cookie="";csrf="";
  async request(path,method="GET",body,expected=200){
    const multipart=body instanceof FormData;
    const response=await fetch(base+path,{method,headers:{...(method==="GET"?{}:{origin:base,"x-csrf-token":this.csrf}),...(body===undefined||multipart?{}:{"content-type":"application/json"}),...(this.cookie?{cookie:this.cookie}:{})},body:body===undefined?undefined:multipart?body:JSON.stringify(body)});
    const data=await response.json();
    assert.equal(response.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);
    const set=response.headers.getSetCookie();if(set.length){const cookies=Object.fromEntries(set.map((value)=>value.split(";")[0].split("=")));this.cookie=Object.entries(cookies).map(([key,value])=>`${key}=${value}`).join("; ");this.csrf=cookies.csrf??this.csrf;}
    return data;
  }
}
const suffix=randomBytes(4).toString("hex");
async function signIn(email,password){const client=new Client();await client.request("/api/auth/login","POST",{identifier:email,password});await client.request("/api/auth/change-password","POST",{old_password:password,new_password:`Safe-${randomBytes(20).toString("base64url")}`});return client;}
const admin=await signIn(process.env.SMOKE_EMAIL,process.env.SMOKE_PASSWORD);
const store=await admin.request("/api/foundation/stores","POST",{code:`L${suffix}`,name:`Leave store ${suffix}`,timezone:"Asia/Ho_Chi_Minh"},201);
const manager=await admin.request(`/api/foundation/stores/${store.id}/employees`,"POST",{email:`manager-${suffix}@shiftly.test`,full_name:"Manager Test",positions:[]},201);
await admin.request(`/api/foundation/stores/${store.id}/managers/${manager.id}`,"PUT");
const employee=await admin.request(`/api/foundation/stores/${store.id}/employees`,"POST",{email:`employee-${suffix}@shiftly.test`,full_name:"Employee Test",positions:[]},201);
const type=(await admin.request("/api/leave-types")).find((item)=>item.requires_attachment);
assert.ok(type);
const staff=await signIn(employee.email,employee.temporary_password);
const reviewer=await signIn(manager.email,manager.temporary_password);
const input={store_id:store.id,leave_type_id:type.id,start_date:"2027-01-10",end_date:"2027-01-11",reason:"Medical appointment"};
const form=()=>{const data=new FormData();for(const [key,value] of Object.entries(input))data.set(key,value);return data;};
await staff.request("/api/leave-requests","POST",form(),422);
const attached=form();attached.set("attachment",new File([Buffer.from("%PDF-1.4\n1 0 obj\n")],"doctor.pdf",{type:"application/pdf"}));
const leave=await staff.request("/api/leave-requests","POST",attached,201);
assert.equal(leave.status,"pending");assert.equal(leave.has_attachment,true);assert.equal("attachment_url" in leave,false);
await staff.request("/api/leave-requests","POST",attached,409);
await staff.request(`/api/leave-requests/${leave.id}/review`,"POST",{decision:"approved"},403);
await reviewer.request(`/api/leave-requests/${leave.id}/review`,"POST",{decision:"approved"});
await reviewer.request(`/api/leave-requests/${leave.id}/review`,"POST",{decision:"rejected",review_note:"Too late"},409);
const cancelled=await staff.request(`/api/leave-requests/${leave.id}/cancel`,"POST");assert.equal(cancelled.status,"cancelled");
await staff.request(`/api/leave-requests/${leave.id}/cancel`,"POST",undefined,409);
input.start_date="2027-01-20";input.end_date="2027-01-20";
const secondForm=form();secondForm.set("attachment",new File([Buffer.from("%PDF-1.4\n1 0 obj\n")],"doctor.pdf",{type:"application/pdf"}));
const second=await staff.request("/api/leave-requests","POST",secondForm,201);
const decide=(client,decision,review_note)=>fetch(`${base}/api/leave-requests/${second.id}/review`,{method:"POST",headers:{origin:base,"x-csrf-token":client.csrf,"content-type":"application/json",cookie:client.cookie},body:JSON.stringify({decision,review_note})}).then((response)=>response.status);
const statuses=await Promise.all([decide(reviewer,"approved",null),decide(admin,"rejected","Concurrent decision")]);
assert.deepEqual(statuses.sort(),[200,409]);
const customType=await admin.request("/api/leave-types","POST",{name:`Test leave ${suffix}`,is_paid:false,requires_attachment:false},201);
const historical=new FormData();historical.set("store_id",store.id);historical.set("leave_type_id",customType.id);historical.set("start_date","2027-02-01");historical.set("end_date","2027-02-01");historical.set("reason","Historical type check");
const historicalRequest=await staff.request("/api/leave-requests","POST",historical,201);
await admin.request(`/api/leave-types/${customType.id}`,"PATCH",{is_active:false});
assert.equal((await staff.request(`/api/leave-requests/${historicalRequest.id}`)).leave_type_name,customType.name);
assert.ok(!(await staff.request("/api/leave-types")).some((item)=>item.id===customType.id));
console.log("Leave smoke passed: required attachment, overlap, self-review denial, cancellation, concurrent review conflict, inactive type history");

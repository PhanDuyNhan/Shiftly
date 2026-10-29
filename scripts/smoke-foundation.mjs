import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
if (!email || !password) throw new Error("Set SMOKE_EMAIL and SMOKE_PASSWORD for a disposable test admin");

class Client {
  cookie = "";
  csrf = "";
  async request(path, method = "GET", body, expected = 200) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(method === "GET" ? {} : { origin: base, "x-csrf-token": this.csrf }),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(this.cookie ? { cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
    const setCookies = response.headers.getSetCookie();
    if (setCookies.length) {
      const cookies = Object.fromEntries(setCookies.map((value) => value.split(";")[0].split("=")));
      this.cookie = Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join("; ");
      this.csrf = cookies.csrf ?? this.csrf;
    }
    return data;
  }
}

const admin = new Client();
const login = await admin.request("/api/auth/login", "POST", { identifier: email, password });
assert.equal(login.must_change_password, true);
await admin.request("/api/foundation/stores", "GET", undefined, 403);
await admin.request("/api/auth/change-password", "POST", {
  old_password: password, new_password: `Test-${randomBytes(20).toString("base64url")}`,
});
const suffix = randomBytes(4).toString("hex");
const store = await admin.request("/api/foundation/stores", "POST", { code: `T${suffix}`, name: `Test store ${suffix}`, timezone: "Asia/Ho_Chi_Minh" }, 201);
const position = await admin.request("/api/foundation/positions", "POST", { name: `Test position ${suffix}` }, 201);
const employee = await admin.request(`/api/foundation/stores/${store.id}/employees`, "POST", {
  email: `staff-${suffix}@shiftly.test`, full_name: "Test Employee", positions: [{ position_id: position.id, skill_level: 3 }],
}, 201);
const template = await admin.request(`/api/foundation/stores/${store.id}/shift-templates`, "POST", {
  name: "Night", start_time: "22:00", end_time: "06:00",
}, 201);
await admin.request(`/api/foundation/stores/${store.id}/staffing-requirements`, "POST", {
  weekday: 6, shift_template_id: template.id, position_id: position.id, min_count: 1, ideal_count: 1,
}, 201);
const requirementPath=`/api/foundation/stores/${store.id}/staffing-requirements`;
await admin.request(requirementPath,"POST",{weekday:6,shift_template_id:template.id,position_id:position.id,min_count:-1,ideal_count:1},422);
await admin.request(requirementPath,"POST",{weekday:6,shift_template_id:template.id,position_id:position.id,min_count:2,ideal_count:1},422);
await admin.request(requirementPath,"POST",{weekday:6,shift_template_id:template.id,position_id:position.id,min_count:1,ideal_count:1},409);
const staff = new Client();
await staff.request("/api/auth/login", "POST", { identifier: employee.email, password: employee.temporary_password });
await staff.request("/api/foundation/stores", "POST", { code: "X", name: "Denied" }, 403);
await staff.request("/api/auth/change-password", "POST", {
  old_password: employee.temporary_password, new_password: `Test-${randomBytes(20).toString("base64url")}`,
});
await staff.request(`/api/foundation/stores/${store.id}/employees`, "GET", undefined, 403);
const ownPhone=`090${randomBytes(4).toString("hex")}`;
const profile=await staff.request("/api/foundation/me/profile","PATCH",{phone:ownPhone,display_name:"Test display"});
assert.equal(profile.phone,ownPhone);
assert.equal((await staff.request("/api/foundation/me/profile")).display_name,"Test display");
await staff.request("/api/foundation/me/profile","PATCH",{system_role:"admin"},422);
await admin.request(`/api/foundation/positions/${position.id}`,"PATCH",{is_active:false});
await admin.request(`/api/foundation/stores/${store.id}`,"PATCH",{is_active:false});
assert.equal((await admin.request("/api/foundation/positions")).find((item)=>item.id===position.id)?.is_active,false);
assert.equal((await admin.request("/api/foundation/stores")).find((item)=>item.id===store.id)?.is_active,false);
console.log("Foundation smoke passed: login gate, CRUD, role denial, invalid staffing, retained inactive records");

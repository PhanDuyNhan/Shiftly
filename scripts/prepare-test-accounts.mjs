// Use only with disposable local seed accounts. Passwords come from the shell.
const base=process.env.TEST_BASE_URL??"http://localhost:3000";
const initial=process.env.TEST_INITIAL_PASSWORD;
const ready=process.env.TEST_NEW_PASSWORD;
const adminInitial=process.env.TEST_ADMIN_INITIAL_PASSWORD;
const adminReady=process.env.TEST_ADMIN_NEW_PASSWORD;
if(!initial||!ready||!adminInitial||!adminReady)throw new Error("Set TEST_INITIAL_PASSWORD, TEST_NEW_PASSWORD, TEST_ADMIN_INITIAL_PASSWORD and TEST_ADMIN_NEW_PASSWORD");

async function prepare(email,oldPassword,newPassword){
  const login=await fetch(`${base}/api/auth/login`,{method:"POST",headers:{origin:base,"content-type":"application/json"},body:JSON.stringify({identifier:email,password:oldPassword})});
  const data=await login.json();
  if(!login.ok)throw new Error(`${email}: login failed (${login.status}: ${data.message})`);
  if(!data.must_change_password)return console.log(`${email}: already ready`);
  const cookies=Object.fromEntries(login.headers.getSetCookie().map((value)=>value.split(";")[0].split("=")));
  const response=await fetch(`${base}/api/auth/change-password`,{method:"POST",headers:{origin:base,"content-type":"application/json","x-csrf-token":cookies.csrf,cookie:Object.entries(cookies).map(([key,value])=>`${key}=${value}`).join("; ")},body:JSON.stringify({old_password:oldPassword,new_password:newPassword})});
  if(!response.ok)throw new Error(`${email}: password change failed (${response.status}: ${(await response.json()).message})`);
  console.log(`${email}: ready`);
}

await prepare("admin-test@shiftly.test",adminInitial,adminReady);
for(const email of ["demo-manager-b@shiftly.test","demo-linh@shiftly.test","demo-minh@shiftly.test","demo-mai@shiftly.test","demo-an@shiftly.test","demo-binh@shiftly.test","demo-ha@shiftly.test"])
  await prepare(email,initial,ready);

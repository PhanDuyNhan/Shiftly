"use client";
import { useState } from "react";
import { api } from "../lib/api";

export default function ChangePasswordPage() {
  const [oldPassword,setOld]=useState(""),[newPassword,setNew]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  return <main className="auth-wrap"><div className="card auth-card"><span className="auth-symbol" aria-hidden="true">✦</span><p className="eyebrow">Bảo vệ tài khoản</p><h1>Đổi mật khẩu</h1><p className="page-intro">Tạo mật khẩu mới để tiếp tục sử dụng Shiftly.</p><form onSubmit={async(event)=>{event.preventDefault();setBusy(true);setError("");try{await api("/api/auth/change-password","POST",{old_password:oldPassword,new_password:newPassword});location.href="/";}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}>
    <label htmlFor="old-password">Mật khẩu hiện tại</label><input id="old-password" type="password" value={oldPassword} onChange={(event)=>setOld(event.target.value)} required autoComplete="current-password" />
    <label htmlFor="new-password">Mật khẩu mới</label><input id="new-password" type="password" minLength={12} value={newPassword} onChange={(event)=>setNew(event.target.value)} required autoComplete="new-password" /><p className="muted">Ít nhất 12 ký tự.</p>
    {error && <p role="alert" className="notice error">{error}</p>}<button disabled={busy}>{busy?"Đang lưu…":"Lưu mật khẩu →"}</button></form></div></main>;
}

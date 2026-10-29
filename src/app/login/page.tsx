"use client";
import { useState } from "react";
import { api } from "../lib/api";

export default function LoginPage() {
  const [identifier,setIdentifier]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  return <main className="auth-wrap"><div className="card auth-card"><span className="auth-symbol" aria-hidden="true">S</span><p className="eyebrow">Không gian làm việc</p><h1>Đăng nhập</h1><p className="page-intro">Xem lịch, quản lý ca và theo dõi đơn nghỉ của bạn.</p><form onSubmit={async(event)=>{event.preventDefault();setBusy(true);setError("");try{const result=await api<{must_change_password:boolean}>("/api/auth/login","POST",{identifier,password});location.href=result.must_change_password?"/change-password":"/";}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}>
    <label htmlFor="identifier">Email hoặc số điện thoại</label><input id="identifier" value={identifier} onChange={(event)=>setIdentifier(event.target.value)} required autoComplete="username" placeholder="ten@cuahang.vn" />
    <label htmlFor="password">Mật khẩu</label><input id="password" type="password" value={password} onChange={(event)=>setPassword(event.target.value)} required autoComplete="current-password" placeholder="Nhập mật khẩu" />
    {error && <p role="alert" className="notice error">{error}</p>}<button disabled={busy}>{busy?"Đang đăng nhập…":"Đăng nhập →"}</button></form></div></main>;
}

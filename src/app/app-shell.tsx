"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "./lib/api";

type Me = {email:string|null;phone:string|null;system_role:string;must_change_password:boolean;memberships:{store_id:string;store_name:string;role_in_store:string}[]};

export function AppShell({children}:{children:React.ReactNode}){
  const path=usePathname();
  const [me,setMe]=useState<Me|null>(null);
  useEffect(()=>{api<Me>("/api/me").then(setMe).catch(()=>setMe(null));},[path]);
  const managers=me?.memberships.filter((item)=>item.role_in_store==="manager")??[];
  const links=me?.must_change_password?[]:[
    {href:"/",label:"Tổng quan"},{href:"/schedule",label:"Lịch của tôi"},
    {href:"/leave",label:"Nghỉ phép"},{href:"/availability",label:"Khả dụng"},
    ...(managers.length?[{href:`/stores/${managers[0].store_id}`,label:"Quản lý cửa hàng"}]:[]),
    ...(me?.system_role==="admin"?[{href:"/admin",label:"Quản trị"}]:[]),
  ];
  const active=(href:string)=>href==="/"?path==="/":path===href||path.startsWith(`${href}/`);
  return <>
    <header className="site-header"><div className="site-header-inner">
      <a className="brand" href="/" aria-label="Shiftly - Trang chủ"><span className="brand-mark" aria-hidden="true">S</span><span><strong>Shiftly</strong><small>Quản lý ca làm thông minh</small></span></a>
      {me&&!me.must_change_password&&<nav className="site-nav" aria-label="Điều hướng chính">{links.map((link)=><a key={link.href} href={link.href} className={active(link.href)?"active":undefined} aria-current={active(link.href)?"page":undefined}>{link.label}</a>)}</nav>}
      <div className="header-account">{me?<><span className="account-name" title={me.email??me.phone??"Tài khoản"}>{me.email??me.phone??"Tài khoản"}</span><a className="account-link" href={me.must_change_password?"/change-password":"/profile"}>{me.must_change_password?"Đổi mật khẩu":"Hồ sơ"}</a></>:<a className="account-link" href="/login">Đăng nhập</a>}</div>
    </div></header>
    {children}
    <footer className="site-footer"><span>Shiftly</span><span>Lịch ca rõ ràng cho mọi người.</span></footer>
  </>;
}

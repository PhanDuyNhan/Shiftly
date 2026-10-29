"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Profile={full_name:string;display_name:string|null;phone:string|null;address:string|null;avatar_url:string|null;emergency_contact_name:string|null;emergency_contact_phone:string|null;bank_name:string|null;bank_account:string|null};
const labels:Record<Exclude<keyof Profile,"full_name">,string>={display_name:"Tên hiển thị",phone:"Số điện thoại",address:"Địa chỉ",avatar_url:"Đường dẫn ảnh đại diện",emergency_contact_name:"Tên liên hệ khẩn cấp",emergency_contact_phone:"Số liên hệ khẩn cấp",bank_name:"Ngân hàng",bank_account:"Số tài khoản"};
export default function ProfilePage(){
  const [profile,setProfile]=useState<Profile|null>(null),[message,setMessage]=useState("");
  useEffect(()=>{api<Profile>("/api/foundation/me/profile").then(setProfile).catch((err:Error)=>setMessage(err.message));},[]);
  return <main><h1>Hồ sơ cá nhân</h1>{profile && <form className="card" onSubmit={async(event)=>{event.preventDefault();try{const {full_name: _fullName,...editable}=profile;const payload=Object.fromEntries(Object.entries(editable).map(([key,value])=>[key,typeof value==="string"&&value.trim()===""?null:value]));const saved=await api<Profile>("/api/foundation/me/profile","PATCH",payload);setProfile(saved);setMessage("Đã lưu");}catch(err){setMessage((err as Error).message);}}}>
    <p>Họ tên: {profile.full_name}</p>{(Object.keys(labels) as (keyof typeof labels)[]).map((key)=><div key={key}><label>{labels[key]}</label><input value={profile[key]??""} onChange={(event)=>setProfile({...profile,[key]:event.target.value})}/></div>)}
    <p>{message}</p><button>Lưu</button></form>}</main>;
}

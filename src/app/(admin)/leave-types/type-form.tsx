"use client";
import { useState } from "react";
import { api } from "../../lib/api";
type LeaveType={id:string;name:string;is_paid:boolean;requires_attachment:boolean;is_active:boolean};
export function TypeForm({type,onSaved}:{type?:LeaveType;onSaved:()=>Promise<void>}){
  const [name,setName]=useState(type?.name??""),[paid,setPaid]=useState(type?.is_paid??false),[attachment,setAttachment]=useState(type?.requires_attachment??false),[error,setError]=useState("");
  return <form onSubmit={async(event)=>{event.preventDefault();setError("");try{await api(type?`/api/leave-types/${type.id}`:"/api/leave-types",type?"PATCH":"POST",{name,is_paid:paid,requires_attachment:attachment});await onSaved();}catch(err){setError((err as Error).message);}}}>
    <label>Tên loại</label><input value={name} onChange={(e)=>setName(e.target.value)} required/>
    <label><input style={{width:"auto"}} type="checkbox" checked={paid} onChange={(e)=>setPaid(e.target.checked)}/> Trả lương</label>
    <label><input style={{width:"auto"}} type="checkbox" checked={attachment} onChange={(e)=>setAttachment(e.target.checked)}/> Yêu cầu tệp</label>
    <p className="muted">Đổi yêu cầu tệp chỉ áp dụng cho đơn mới. Ngừng sử dụng không xóa đơn cũ.</p>{error&&<p className="error">{error}</p>}<button>{type?"Lưu thay đổi":"Tạo loại"}</button>
  </form>;
}

"use client";
import { useEffect,useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../../../lib/api";
import { ReviewForm } from "./review-form";
type Leave={id:string;user_id:string;leave_type_name:string;start_date:string;end_date:string;reason:string;status:string;has_attachment:boolean;review_note:string|null};
type Impact={affected_assignments:{assignment_id:string;work_date:string;start_at:string;end_at:string;schedule_status:string}[]};
export default function StoreLeaveDetail(){
  const {storeId,id}=useParams<{storeId:string;id:string}>();const [row,setRow]=useState<Leave|null>(null),[impact,setImpact]=useState<Impact|null>(null),[error,setError]=useState("");
  useEffect(()=>{Promise.all([api<Leave>(`/api/leave-requests/${id}`),api<Impact>(`/api/leave-requests/${id}/impact`)]).then(([r,i])=>{setRow(r);setImpact(i);}).catch((err:Error)=>setError(err.message));},[id]);
  return <main><p><a href={`/stores/${storeId}/leave`}>← Đơn của cửa hàng</a></p><h1>Xét duyệt đơn nghỉ</h1>{error&&<p className="error">{error}</p>}{row&&<><div className="card"><p><strong>{row.leave_type_name}</strong> · {row.status}</p><p>Nhân viên: {row.user_id}</p><p>{row.start_date} – {row.end_date}</p><p>Lý do: {row.reason}</p>{row.review_note&&<p>Ghi chú: {row.review_note}</p>}{row.has_attachment&&<a href={`/api/leave-requests/${id}/attachment`}>Tải tệp đính kèm</a>}</div>
    <div className="card"><h2>Ca bị ảnh hưởng</h2>{impact?.affected_assignments.length?impact.affected_assignments.map((item)=><p key={item.assignment_id}>{item.work_date}: {new Date(item.start_at).toLocaleString("vi-VN")} – {new Date(item.end_at).toLocaleString("vi-VN")} ({item.schedule_status})</p>):<p>Không có ca liên quan.</p>}</div>{row.status==="pending"&&<ReviewForm id={id}/>}</>}</main>;
}

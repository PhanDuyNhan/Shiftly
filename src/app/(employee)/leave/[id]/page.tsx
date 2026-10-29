"use client";
import { useEffect,useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../lib/api";
import { CancelAction } from "./cancel-action";

type Leave={id:string;leave_type_name:string;start_date:string;end_date:string;reason:string;status:string;has_attachment:boolean;reviewed_at:string|null;review_note:string|null};
export default function LeaveDetail(){
  const id=useParams<{id:string}>().id;const [row,setRow]=useState<Leave|null>(null),[error,setError]=useState("");
  useEffect(()=>{api<Leave>(`/api/leave-requests/${id}`).then(setRow).catch((err:Error)=>setError(err.message));},[id]);
  return <main><p><a href="/leave">← Đơn của tôi</a></p><h1>Chi tiết đơn nghỉ</h1>{error&&<p className="error">{error}</p>}{row&&<div className="card"><p><strong>{row.leave_type_name}</strong> · {row.status}</p><p>{row.start_date} – {row.end_date}</p><p>Lý do: {row.reason}</p>{row.reviewed_at&&<p>Đã xét duyệt: {new Date(row.reviewed_at).toLocaleString("vi-VN")} · {row.review_note??"Không có ghi chú"}</p>}{row.has_attachment&&<p><a href={`/api/leave-requests/${id}/attachment`}>Tải tệp đính kèm</a></p>}{(row.status==="pending"||row.status==="approved")&&<><p className="muted">Đơn chờ có thể hủy. Đơn đã duyệt chỉ được hủy trước ngày bắt đầu nghỉ theo giờ cửa hàng.</p><CancelAction id={id}/></>}</div>}</main>;
}

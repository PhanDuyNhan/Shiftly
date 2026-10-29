"use client";
import { useEffect,useState } from "react";
import { api } from "../../lib/api";

type Leave={id:string;start_date:string;end_date:string;leave_type_name:string;status:string;reason:string;created_at:string};
const statusLabel:Record<string,string>={pending:"Chờ duyệt",approved:"Đã duyệt",rejected:"Từ chối",cancelled:"Đã hủy"};
export default function LeavePage(){
  const [rows,setRows]=useState<Leave[]>([]),[error,setError]=useState("");
  useEffect(()=>{api<Leave[]>("/api/leave-requests").then(setRows).catch((err:Error)=>setError(err.message));},[]);
  return <main><p className="eyebrow">Nghỉ phép</p><div className="section-heading"><div><h1>Đơn nghỉ của tôi</h1><p className="page-intro">Theo dõi yêu cầu nghỉ và quyết định của quản lý.</p></div><a className="button-link" href="/leave/new">+ Gửi đơn mới</a></div>{error&&<p role="alert" className="notice error">{error}</p>}
    {rows.length===0?<div className="empty-state"><strong>Chưa có đơn nghỉ nào</strong><p>Khi cần nghỉ, gửi đơn để quản lý xem và phản hồi.</p><a className="button-link" href="/leave/new">Gửi đơn đầu tiên →</a></div>:<div className="scroll"><table><thead><tr><th>Loại nghỉ</th><th>Thời gian</th><th>Trạng thái</th><th></th></tr></thead><tbody>{rows.map((row)=><tr key={row.id}><td><strong>{row.leave_type_name}</strong></td><td>{row.start_date} – {row.end_date}</td><td><span className={`status status-${row.status}`}>{statusLabel[row.status]??row.status}</span></td><td><a href={`/leave/${row.id}`}>Xem chi tiết →</a></td></tr>)}</tbody></table></div>}
  </main>;
}

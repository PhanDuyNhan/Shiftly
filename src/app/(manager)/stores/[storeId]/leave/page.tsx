"use client";
import { useEffect,useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../../lib/api";
type Leave={id:string;user_id:string;start_date:string;end_date:string;status:string;leave_type_name:string};
export default function StoreLeavePage(){
  const storeId=useParams<{storeId:string}>().storeId;const [rows,setRows]=useState<Leave[]>([]),[status,setStatus]=useState("pending"),[error,setError]=useState("");
  useEffect(()=>{api<Leave[]>(`/api/leave-requests?store_id=${storeId}${status?`&status=${status}`:""}`).then(setRows).catch((err:Error)=>setError(err.message));},[storeId,status]);
  return <main><h1>Đơn nghỉ của cửa hàng</h1><label>Lọc trạng thái</label><select style={{maxWidth:250}} value={status} onChange={(event)=>setStatus(event.target.value)}><option value="">Tất cả</option>{["pending","approved","rejected","cancelled"].map((item)=><option key={item} value={item}>{item}</option>)}</select>{error&&<p className="error">{error}</p>}
    <div className="scroll"><table><thead><tr><th>Nhân viên</th><th>Loại nghỉ</th><th>Ngày</th><th>Trạng thái</th><th></th></tr></thead><tbody>{rows.map((row)=><tr key={row.id}><td>{row.user_id}</td><td>{row.leave_type_name}</td><td>{row.start_date} – {row.end_date}</td><td>{row.status}</td><td><a href={`/stores/${storeId}/leave/${row.id}`}>Xem</a></td></tr>)}</tbody></table></div></main>;
}

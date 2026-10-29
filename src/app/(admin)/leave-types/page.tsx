"use client";
import { useEffect,useState } from "react";
import { api } from "../../lib/api";
import { TypeForm } from "./type-form";
type LeaveType={id:string;name:string;is_paid:boolean;requires_attachment:boolean;is_active:boolean};
export default function LeaveTypesPage(){
  const [rows,setRows]=useState<LeaveType[]>([]),[message,setMessage]=useState("");
  const refresh=()=>api<LeaveType[]>("/api/leave-types?include_inactive=true").then(setRows);
  useEffect(()=>{refresh().catch((err:Error)=>setMessage(err.message));},[]);
  const act=async(work:()=>Promise<unknown>)=>{try{await work();await refresh();setMessage("Đã lưu");}catch(err){setMessage((err as Error).message);}};
  return <main><h1>Loại nghỉ</h1>{message&&<p>{message}</p>}<div className="card" style={{maxWidth:500}}><h2>Tạo loại</h2><TypeForm onSaved={refresh}/></div>
    <div className="scroll"><table><thead><tr><th>Tên</th><th>Trả lương</th><th>Yêu cầu tệp</th><th>Trạng thái</th><th></th></tr></thead><tbody>{rows.map((row)=><tr key={row.id}><td>{row.name}</td><td>{row.is_paid?"Có":"Không"}</td><td>{row.requires_attachment?"Có":"Không"}</td><td>{row.is_active?"Hoạt động":"Ngừng dùng"}</td><td><button className="secondary" onClick={()=>void act(()=>api(`/api/leave-types/${row.id}`,"PATCH",{is_active:!row.is_active}))}>{row.is_active?"Ngừng dùng":"Mở lại"}</button></td></tr>)}</tbody></table></div>{rows.map((row)=><details className="card" key={row.id}><summary>Sửa {row.name}</summary><TypeForm type={row} onSaved={refresh}/></details>)}<p className="muted">Loại ngừng dùng không xuất hiện trong đơn mới; đơn đã gửi vẫn giữ loại cũ.</p></main>;
}

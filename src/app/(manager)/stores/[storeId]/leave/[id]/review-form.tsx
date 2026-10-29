"use client";
import { useState } from "react";
import { api } from "../../../../../lib/api";
export function ReviewForm({id}:{id:string}){
  const [note,setNote]=useState(""),[error,setError]=useState(""),[currentStatus,setCurrentStatus]=useState(""),[busy,setBusy]=useState(false);
  const submit=async(decision:"approved"|"rejected")=>{setBusy(true);setError("");try{await api(`/api/leave-requests/${id}/review`,"POST",{decision,review_note:note});location.reload();}catch(err){setError((err as Error).message);try{const current=await api<{status:string}>(`/api/leave-requests/${id}`);setCurrentStatus(current.status);}catch{}}finally{setBusy(false);}};
  return <div className="card"><h2>Quyết định</h2><label>Ghi chú (bắt buộc nếu từ chối)</label><textarea value={note} onChange={(event)=>setNote(event.target.value)} rows={3}/><div className="row"><button disabled={busy||!!currentStatus} onClick={()=>void submit("approved")}>Duyệt</button><button disabled={busy||!!currentStatus||!note.trim()} className="danger" onClick={()=>void submit("rejected")}>Từ chối</button></div>{error&&<p className="error">{error}. Trạng thái hiện tại: {currentStatus||"không đọc được"}.</p>}</div>;
}

"use client";
import { useState } from "react";
import { api } from "../../../lib/api";
export function CancelAction({id}: {id:string}){
  const [error,setError]=useState("");
  return <><button className="danger" onClick={async()=>{if(!confirm("Hủy đơn nghỉ này?"))return;try{await api(`/api/leave-requests/${id}/cancel`,"POST");location.reload();}catch(err){setError((err as Error).message);}}}>Hủy đơn</button>{error&&<p className="error">{error}</p>}</>;
}

"use client";
import { useEffect,useState } from "react";
import { api,csrfToken } from "../../../lib/api";

type Store={id:string;name:string};type LeaveType={id:string;name:string;requires_attachment:boolean};
export default function NewLeavePage(){
  const [stores,setStores]=useState<Store[]>([]),[types,setTypes]=useState<LeaveType[]>([]);
  const [storeId,setStoreId]=useState(""),[typeId,setTypeId]=useState(""),[start,setStart]=useState(""),[end,setEnd]=useState(""),[reason,setReason]=useState(""),[file,setFile]=useState<File|null>(null);
  const [error,setError]=useState(""),[fieldErrors,setFieldErrors]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false);
  useEffect(()=>{Promise.all([api<Store[]>("/api/foundation/stores"),api<LeaveType[]>("/api/leave-types")]).then(([s,t])=>{setStores(s);setTypes(t);}).catch((err:Error)=>setError(err.message));},[]);
  const needsFile=types.find((type)=>type.id===typeId)?.requires_attachment;
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();setError("");setFieldErrors({});
    const fields:Record<string,string>={};
    if(!storeId)fields.store_id="Chọn cửa hàng";
    if(!typeId)fields.leave_type_id="Chọn loại nghỉ";
    if(!start)fields.start_date="Chọn ngày bắt đầu";
    if(!end||end<start)fields.end_date="Ngày kết thúc phải từ ngày bắt đầu trở đi";
    if(!reason.trim())fields.reason="Nhập lý do";
    if(needsFile&&!file)fields.attachment="Loại nghỉ này cần tệp đính kèm";
    if(file&&file.size>4*1024*1024)fields.attachment="Tệp vượt 4 MB";
    if(Object.keys(fields).length){setFieldErrors(fields);return;}
    setBusy(true);
    try{
      const form=new FormData();form.set("store_id",storeId);form.set("leave_type_id",typeId);form.set("start_date",start);form.set("end_date",end);form.set("reason",reason.trim());if(file)form.set("attachment",file);
      const response=await fetch("/api/leave-requests",{method:"POST",headers:{"x-csrf-token":csrfToken()},body:form});
      const data=await response.json();
      if(!response.ok){
        if(Array.isArray(data.details?.issues)){
          const issues:Record<string,string>={};
          for(const issue of data.details.issues)issues[String(issue.path?.[0]??"form")]=issue.message;
          setFieldErrors(issues);
        }
        throw new Error(data.message??"Không gửi được đơn");
      }
      location.href=`/leave/${data.id}`;
    }catch(err){setError((err as Error).message);}finally{setBusy(false);}
  };
  return <main><h1>Gửi đơn nghỉ</h1><form className="card" style={{maxWidth:550}} onSubmit={submit} noValidate>
    <label>Cửa hàng</label><select value={storeId} onChange={(event)=>setStoreId(event.target.value)}><option value="">Chọn cửa hàng</option>{stores.map((store)=><option key={store.id} value={store.id}>{store.name}</option>)}</select>{fieldErrors.store_id&&<p className="error">{fieldErrors.store_id}</p>}
    <label>Loại nghỉ</label><select value={typeId} onChange={(event)=>setTypeId(event.target.value)}><option value="">Chọn loại</option>{types.map((type)=><option key={type.id} value={type.id}>{type.name}{type.requires_attachment?" · cần tệp":""}</option>)}</select>{fieldErrors.leave_type_id&&<p className="error">{fieldErrors.leave_type_id}</p>}
    <label>Từ ngày</label><input type="date" value={start} onChange={(event)=>setStart(event.target.value)}/>{fieldErrors.start_date&&<p className="error">{fieldErrors.start_date}</p>}
    <label>Đến ngày</label><input type="date" min={start} value={end} onChange={(event)=>setEnd(event.target.value)}/>{fieldErrors.end_date&&<p className="error">{fieldErrors.end_date}</p>}
    <label>Lý do</label><textarea rows={4} value={reason} onChange={(event)=>setReason(event.target.value)}/>{fieldErrors.reason&&<p className="error">{fieldErrors.reason}</p>}
    <label>Tệp đính kèm {needsFile?"(bắt buộc)":"(nếu có)"}</label><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event)=>setFile(event.target.files?.[0]??null)}/><p className="muted">Một tệp PDF, JPEG hoặc PNG, tối đa 4 MB.</p>{fieldErrors.attachment&&<p className="error">{fieldErrors.attachment}</p>}
    {error&&<p className="error">{error}</p>}<button disabled={busy}>Gửi đơn</button></form></main>;
}

"use client";
import { useEffect,useState } from "react";
import { api } from "../../../lib/api";

type Template={id:string;name:string;start_time:string;end_time:string;is_active:boolean};
type Preference={work_date:string;shift_template_id:string;preference:-1|1|2};
type PageData={store:{id:string;name:string};templates:Template[];preferences:Preference[];deadline:string};
function nextMonday(){const now=new Date();const day=(now.getUTCDay()+6)%7;now.setUTCDate(now.getUTCDate()-day+7);return now.toISOString().slice(0,10);}
function addDays(date:string,days:number){const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export default function PreferencePage(){
  const [week,setWeek]=useState(nextMonday()),[data,setData]=useState<PageData|null>(null),[preferences,setPreferences]=useState<Preference[]>([]),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  const refresh=async()=>{const result=await api<PageData>(`/api/me/shift-preferences?week=${week}`);setData(result);setPreferences(result.preferences);};
  useEffect(()=>{refresh().catch((err:Error)=>setMessage(err.message));},[week]);
  const set=(date:string,templateId:string,value:string)=>{setPreferences((before)=>{const next=before.filter((item)=>!(item.work_date===date&&item.shift_template_id===templateId));if(value)next.push({work_date:date,shift_template_id:templateId,preference:Number(value) as -1|1|2});return next;});};
  const save=async()=>{setBusy(true);setMessage("");try{const result=await api<{preferences:Preference[]}>(`/api/me/shift-preferences?week=${week}`,"PUT",{preferences});setPreferences(result.preferences);await refresh();setMessage("Đã lưu nguyện vọng ca");}catch(err){setMessage((err as Error).message);}finally{setBusy(false);}};
  return <main><p><a href="/availability">← Khả dụng</a></p><p className="eyebrow">Đăng ký ca làm</p><h1>Nguyện vọng ca của tôi</h1><p className="page-intro">Chọn mức mong muốn cho từng ca trong tuần. Cửa hàng trực thuộc được hệ thống xác định từ hồ sơ nhân viên của bạn.</p>
    <div className="card"><div className="grid"><div><label htmlFor="preference-week">Tuần bắt đầu Thứ 2</label><input id="preference-week" type="date" value={week} onChange={(event)=>setWeek(event.target.value)}/></div><div><label>Cửa hàng trực thuộc</label><p><strong>{data?.store.name??"Đang tải…"}</strong></p></div></div>{data?.deadline&&<p className="muted">Hạn đăng ký: {new Date(data.deadline).toLocaleString("vi-VN")}</p>}</div>
    {message&&<p role="status" className={`notice ${message.startsWith("Đã")?"":"error"}`}>{message}</p>}
    {data&&<section className="card"><h2>Chọn ca trong tuần</h2><p className="muted">“Rất muốn” và “Có thể” là ưu tiên; lịch chính thức do quản lý công bố.</p>{data.templates.length===0?<div className="empty-state"><strong>Chưa có ca mẫu</strong><p>Quản lý cửa hàng cần tạo ca mẫu trước khi bạn đăng ký.</p></div>:<div className="scroll"><table><thead><tr><th>Ngày</th>{data.templates.map((template)=><th key={template.id}>{template.name}<br/><span className="muted">{template.start_time.slice(0,5)}–{template.end_time.slice(0,5)}</span></th>)}</tr></thead><tbody>{Array.from({length:7},(_,i)=>addDays(week,i)).map((date)=><tr key={date}><td><strong>{date}</strong></td>{data.templates.map((template)=><td key={template.id}><select aria-label={`${template.name}, ${date}`} value={preferences.find((item)=>item.work_date===date&&item.shift_template_id===template.id)?.preference??""} onChange={(event)=>set(date,template.id,event.target.value)}><option value="">Không chọn</option><option value="2">Rất muốn</option><option value="1">Có thể</option><option value="-1">Ngại</option></select></td>)}</tr>)}</tbody></table></div>}<div className="row" style={{marginTop:18}}><button onClick={()=>void save()} disabled={busy||data.templates.length===0}>{busy?"Đang lưu…":"Lưu nguyện vọng"}</button><span className="muted">{preferences.length} lựa chọn</span></div></section>}
  </main>;
}

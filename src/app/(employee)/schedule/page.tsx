"use client";
import { useEffect,useState } from "react";
import { api } from "../../lib/api";
type Assignment={assignment_id:string;work_date:string;start_at:string;end_at:string;store_id:string;store_name:string;timezone:string;position_id:string;version:number};
type Rule={weekday:number;start_time:string;end_time:string;kind:string;valid_from:string;valid_to:string|null};
type Exception={id:string;on_date:string;start_time:string|null;end_time:string|null;kind:string};
type Preference={id:string;work_date:string;shift_template_id:string;preference:number};
function monday(){const d=new Date();const day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day);return d.toISOString().slice(0,10);}
export default function MySchedule(){
  const [week,setWeek]=useState(monday()),[rows,setRows]=useState<Assignment[]>([]),[rules,setRules]=useState<Rule[]>([]),[exceptions,setExceptions]=useState<Exception[]>([]),[preferences,setPreferences]=useState<Preference[]>([]),[error,setError]=useState("");
  useEffect(()=>{const end=new Date(`${week}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);Promise.all([
    api<Assignment[]>(`/api/me/schedule?week=${week}`),api<Rule[]>("/api/me/availability-rules"),
    api<Exception[]>(`/api/me/availability-exceptions?from=${week}&to=${end.toISOString().slice(0,10)}`),
    api<{preferences:Preference[]}>(`/api/me/shift-preferences?week=${week}`),
  ]).then(([assignments,recurring,overrides,choices])=>{setRows(assignments);setRules(recurring);setExceptions(overrides);setPreferences(choices.preferences);setError("");}).catch((err:Error)=>setError(err.message));},[week]);
  return <main><h1>Lịch làm việc của tôi</h1><label>Tuần bắt đầu Thứ 2</label><input type="date" style={{maxWidth:230}} value={week} onChange={(e)=>setWeek(e.target.value)}/>{error&&<p className="error">{error}</p>}
    <div className="card"><h2>Khai báo của tôi</h2><p>Bận lặp lại: {rules.filter((r)=>r.kind==="busy"&&r.valid_from<=new Date(new Date(`${week}T00:00:00Z`).getTime()+6*86400000).toISOString().slice(0,10)&&(!r.valid_to||r.valid_to>=week)).map((r)=>`Thứ ${r.weekday} ${r.start_time}–${r.end_time}`).join(", ")||"Chưa có"}</p><p>Ngoại lệ tuần này: {exceptions.map((e)=>`${e.on_date} ${e.start_time?`${e.start_time}–${e.end_time}`:"cả ngày"} (${e.kind})`).join(", ")||"Chưa có"}</p><p>Nguyện vọng: {preferences.map((p)=>`${p.work_date} · mức ${p.preference}`).join(", ")||"Chưa có"}</p><p><a href="/availability">Sửa giờ bận</a> · <a href="/availability/preferences">Sửa nguyện vọng</a></p></div>
    <h2>Ca đã công bố</h2>{rows.length===0?<p>Chưa có ca đã công bố trong tuần.</p>:<div className="scroll"><table><thead><tr><th>Ngày</th><th>Bắt đầu</th><th>Kết thúc</th><th>Cửa hàng</th></tr></thead><tbody>{rows.map((r)=><tr key={r.assignment_id}><td>{r.work_date}</td><td>{new Date(r.start_at).toLocaleString("vi-VN",{timeZone:r.timezone})}</td><td>{new Date(r.end_at).toLocaleString("vi-VN",{timeZone:r.timezone})}</td><td>{r.store_name}</td></tr>)}</tbody></table></div>}</main>;
}

"use client";
import { useEffect,useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../../../lib/api";
import { AutoAssignAction } from "./auto-assign-action";
import { ScheduleActions,AssignmentEditActions,AddAssignmentAction,type ValidationResult } from "./edit-actions";

type Slot={id:string;work_date:string;start_at:string;end_at:string;position_id:string;min_count:number;ideal_count:number};
type Assignment={id:string;slot_id:string;user_id:string;status:string;is_pinned:boolean};
type Warning={slot_id:string;missing_count:number;rejected?:Record<string,number>;code:string};
type Schedule={id:string;store_id:string;week_start:string;status:string;version:number;slots:Slot[];assignments:Assignment[];runs:{id:string;score:string;runtime_ms:number;warnings:Warning[];fairness:{swaps:number;users:{user_id:string;target_hours_week:number;assigned_hours:number}[]}|null}[]};
type Employee={id:string;full_name:string;status:string;home_store_name:string};
type Position={id:string;name:string};
type Store={id:string;timezone:string;name:string};
const statusLabel:Record<string,string>={draft:"Bản nháp",published:"Đã công bố",assigned:"Đã xếp",needs_cover:"Cần người thay",cancelled:"Đã hủy"};
const issueLabel:Record<string,string>={busy:"Bận",rest:"Thiếu nghỉ giữa ca",leave:"Nghỉ đã duyệt",skill:"Thiếu kỹ năng",overlap:"Trùng giờ",daily_hours:"Vượt giờ/ngày",weekly_hours:"Vượt giờ/tuần",weekly_day_off:"Thiếu ngày nghỉ",membership:"Không thuộc cửa hàng"};
export default function ScheduleDetail(){
  const {storeId,scheduleId}=useParams<{storeId:string;scheduleId:string}>();
  const [schedule,setSchedule]=useState<Schedule|null>(null),[employees,setEmployees]=useState<Employee[]>([]),[positions,setPositions]=useState<Position[]>([]),[timezone,setTimezone]=useState("Asia/Ho_Chi_Minh"),[validation,setValidation]=useState<ValidationResult|null>(null),[userId,setUserId]=useState(""),[reason,setReason]=useState(""),[message,setMessage]=useState("");
  const refresh=async()=>{const [s,e,p,stores]=await Promise.all([api<Schedule>(`/api/schedules/${scheduleId}`),api<Employee[]>("/api/foundation/available-employees"),api<Position[]>("/api/foundation/positions"),api<Store[]>("/api/foundation/stores")]);setSchedule(s);setEmployees(e);setPositions(p);setTimezone(stores.find((store)=>store.id===storeId)?.timezone??"Asia/Ho_Chi_Minh");};
  useEffect(()=>{refresh().catch((err:Error)=>setMessage(err.message));},[scheduleId,storeId]);
  const name=(id:string)=>employees.find((employee)=>employee.id===id)?.full_name??"Nhân viên";
  const position=(id:string)=>positions.find((item)=>item.id===id)?.name??"Vị trí";
  const local=(value:string)=>new Date(value).toLocaleTimeString("vi-VN",{timeZone:timezone,hour:"2-digit",minute:"2-digit"});
  const warnings=schedule?.runs[0]?.warnings??[];
  return <main>
    <p><a href={`/stores/${storeId}/schedules`}>← Lịch tuần</a></p>
    <p className="eyebrow">Quản lý lịch ca</p><h1>Lịch tuần {schedule?.week_start??""}</h1>
    {message&&<p role="alert" className="notice error">{message}</p>}
    {schedule&&<>
      <div className="card"><div className="row"><span className={`status status-${schedule.status}`}>{statusLabel[schedule.status]??schedule.status}</span><span className="muted">Phiên bản {schedule.version}</span><span className="muted">{schedule.slots.length} ca cần xếp</span></div><p className="muted">Chạy xếp tự động, kiểm tra ràng buộc rồi công bố cho nhân viên.</p><div className="row"><AutoAssignAction scheduleId={scheduleId} status={schedule.status} onDone={refresh} onError={setMessage}/><ScheduleActions scheduleId={scheduleId} status={schedule.status} onDone={refresh} onError={setMessage} onValidate={setValidation}/></div></div>
      {validation&&<div className={`notice ${validation.violations.length?"error":""}`}><strong>{validation.violations.length? `${validation.violations.length} vi phạm cần xử lý`:"Không có vi phạm cứng"}</strong> · {validation.warnings.length} ca thiếu người{validation.violations.map((item,i)=><p key={i}>{item.issues.map((issue)=>issueLabel[issue.code]??issue.code).join(", ")}</p>)}</div>}
      {warnings.length>0&&<div className="notice warning"><strong>{warnings.length} ca chưa đủ người.</strong> {warnings.map((warning)=><p key={warning.slot_id}>Thiếu {warning.missing_count} người. {Object.entries(warning.rejected??{}).map(([code,count])=>`${issueLabel[code]??code}: ${count}`).join(" · ")}</p>)}</div>}
      <section className="card"><h2>Chỉnh phân công</h2><p className="muted">Chọn nhân viên từ cửa hàng của bạn hoặc cửa hàng khác. Hệ thống kiểm tra trùng giờ, giờ làm và nghỉ phép trước khi lưu. Lịch đã công bố cần lý do cho mỗi thay đổi.</p><div className="grid"><div><label htmlFor="schedule-employee">Nhân viên</label><select id="schedule-employee" value={userId} onChange={(e)=>setUserId(e.target.value)}><option value="">Chọn nhân viên</option>{employees.filter((employee)=>employee.status==="active").map((employee)=><option key={employee.id} value={employee.id}>{employee.full_name} · {employee.home_store_name}</option>)}</select></div><div><label htmlFor="schedule-reason">Lý do chỉnh lịch</label><input id="schedule-reason" value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="Ví dụ: hỗ trợ cửa hàng khác" /></div></div></section>
      <div className="section-heading"><h2>Danh sách ca</h2><span className="muted">Giờ địa phương của cửa hàng</span></div>
      {schedule.slots.length===0?<div className="empty-state"><strong>Tuần này chưa có ca</strong><p>Kiểm tra ca mẫu và nhu cầu nhân sự của cửa hàng.</p></div>:<div className="scroll"><table><thead><tr><th>Ngày / giờ</th><th>Vị trí</th><th>Nhu cầu</th><th>Nhân viên</th><th>Thêm người</th></tr></thead><tbody>{schedule.slots.map((slot)=>{const assigned=schedule.assignments.filter((item)=>item.slot_id===slot.id);const active=assigned.filter((item)=>item.status==="assigned").length;return <tr key={slot.id}><td><strong>{slot.work_date}</strong><br/>{local(slot.start_at)} – {local(slot.end_at)}</td><td>{position(slot.position_id)}</td><td><span className={`status ${active<slot.min_count?"status-pending":"status-approved"}`}>{active} / {slot.min_count} tối thiểu</span><p className="muted">Lý tưởng: {slot.ideal_count}</p></td><td>{assigned.length===0?<span className="muted">Chưa có người</span>:assigned.map((item)=><div key={item.id} className="stack" style={{marginBottom:10}}><div><strong>{name(item.user_id)}</strong> <span className={`status status-${item.status}`}>{statusLabel[item.status]??item.status}</span> {item.is_pinned&&<span title="Ca đã khóa">📌</span>}</div>{item.status==="assigned"&&<AssignmentEditActions assignmentId={item.id} pinned={item.is_pinned} version={schedule.version} status={schedule.status} reason={reason} onDone={refresh} onError={setMessage}/>}</div>)}</td><td><AddAssignmentAction slotId={slot.id} userId={userId} version={schedule.version} status={schedule.status} reason={reason} onDone={refresh} onError={setMessage}/></td></tr>;})}</tbody></table></div>}
      <div className="section-heading"><h2>Lần xếp tự động</h2></div>
      {schedule.runs.length===0?<div className="empty-state"><strong>Chưa có lần xếp tự động</strong><p>Chạy xếp tự động để xem độ phủ và giờ mục tiêu.</p></div>:schedule.runs.map((run)=><section className="card" key={run.id}><div className="row"><span className="metric"><strong>{run.score}</strong><span>điểm</span></span><span className="muted">{run.runtime_ms} ms · {run.fairness?.swaps??0} hoán đổi</span></div>{run.fairness?.users.filter((person)=>person.target_hours_week>0||person.assigned_hours>0).length?<div className="scroll"><table><thead><tr><th>Nhân viên</th><th>Giờ đã xếp</th><th>Giờ mục tiêu</th></tr></thead><tbody>{run.fairness?.users.filter((person)=>person.target_hours_week>0||person.assigned_hours>0).map((person)=><tr key={person.user_id}><td>{name(person.user_id)}</td><td>{person.assigned_hours}</td><td>{person.target_hours_week}</td></tr>)}</tbody></table></div>:<p className="muted">Chưa có giờ được xếp.</p>}</section>)}
    </>}
  </main>;
}

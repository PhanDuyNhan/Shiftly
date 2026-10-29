"use client";
import { api } from "../../../../../lib/api";
export type ValidationResult={violations:{slot_id:string;issues:{code:string;message:string}[]}[];warnings:{slot_id:string;missing_count:number}[]};
type Common={scheduleId:string;status:string;version:number;reason:string;onDone:()=>Promise<void>;onError:(message:string)=>void};
export function ScheduleActions({scheduleId,status,onDone,onError,onValidate}:{scheduleId:string;status:string;onDone:()=>Promise<void>;onError:(message:string)=>void;onValidate:(result:ValidationResult)=>void}){
  return <div className="row"><button className="secondary" onClick={async()=>{try{onValidate(await api<ValidationResult>(`/api/schedules/${scheduleId}/validate`,"POST"));}catch(err){onError((err as Error).message);}}}>Kiểm tra</button><button disabled={status!=="draft"} onClick={async()=>{try{await api(`/api/schedules/${scheduleId}/publish`,"POST");await onDone();}catch(err){onError((err as Error).message);}}}>Công bố</button></div>;
}
export function AssignmentEditActions({assignmentId,pinned,version,status,reason,onDone,onError}:{assignmentId:string;pinned:boolean;version:number;status:string;reason:string;onDone:()=>Promise<void>;onError:(message:string)=>void}){
  const update=async(action:"pin"|"unpin"|"unassign")=>{if(status==="published"&&!reason.trim()){onError("Nhập lý do để sửa lịch đã công bố");return;}try{await api(`/api/assignments/${assignmentId}`,"PATCH",{action,expected_version:version,reason});await onDone();}catch(err){onError((err as Error).message+". Tải lại để lấy phiên bản mới nếu lịch đã thay đổi.");}};
  return <span className="row"><button className="secondary" onClick={()=>void update(pinned?"unpin":"pin")}>{pinned?"Bỏ khóa":"Khóa"}</button><button className="danger" disabled={pinned} onClick={()=>void update("unassign")}>Bỏ ca</button></span>;
}
export function AddAssignmentAction({slotId,userId,version,status,reason,onDone,onError}:{slotId:string;userId:string;version:number;status:string;reason:string;onDone:()=>Promise<void>;onError:(message:string)=>void}){
  return <button disabled={!userId} onClick={async()=>{if(status==="published"&&!reason.trim()){onError("Nhập lý do để sửa lịch đã công bố");return;}try{await api(`/api/slots/${slotId}/assignments`,"POST",{user_id:userId,expected_version:version,reason});await onDone();}catch(err){onError((err as Error).message+". Tải lại để lấy phiên bản mới nếu lịch đã thay đổi.");}}}>Thêm</button>;
}

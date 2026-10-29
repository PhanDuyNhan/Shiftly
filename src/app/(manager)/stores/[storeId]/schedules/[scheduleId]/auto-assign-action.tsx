"use client";
import { api } from "../../../../../lib/api";
export function AutoAssignAction({scheduleId,status,onDone,onError}:{scheduleId:string;status:string;onDone:()=>Promise<void>;onError:(message:string)=>void}){
  return <div><button disabled={status!=="draft"} onClick={async()=>{try{await api(`/api/schedules/${scheduleId}/auto-assign`,"POST");await onDone();}catch(err){onError((err as Error).message);}}}>Xếp tự động</button><p className="muted">Ca đã khóa được giữ nguyên. Nếu dữ liệu mới làm ca đó vi phạm ràng buộc, yêu cầu trả xung đột và lịch không đổi.</p></div>;
}

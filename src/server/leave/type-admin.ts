import { getPool } from "@/db/client";
import { HttpError } from "./errors";

export type LeaveTypeInput={name:string;is_paid:boolean;requires_attachment:boolean};
export type LeaveTypePatch=Partial<LeaveTypeInput>&{is_active?:boolean};

export async function createLeaveType(input:LeaveTypeInput){
  const row=(await getPool().query(`INSERT INTO leave_types (name,is_paid,requires_attachment)
    VALUES ($1,$2,$3) RETURNING *`,[input.name.trim(),input.is_paid,input.requires_attachment])).rows[0];
  return row;
}

export async function updateLeaveType(id:string,fields:LeaveTypePatch){
  const entries=Object.entries(fields);
  if(!entries.length)throw new HttpError(422,"invalid","No fields to update");
  const updated=await getPool().query(`UPDATE leave_types SET ${entries.map(([key],index)=>`${key}=$${index+2}`).join(",")}
    WHERE id=$1 RETURNING *`,[id,...entries.map(([key,value])=>key==="name"?String(value).trim():value)]);
  if(!updated.rows[0])throw new HttpError(404,"not_found","Leave type not found");
  return updated.rows[0];
}

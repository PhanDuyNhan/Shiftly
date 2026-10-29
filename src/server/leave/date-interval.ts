import { assertDateRange } from "./date-range";

function nextDate(value:string):string {
  const date=new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate()+1);
  return date.toISOString().slice(0,10);
}

function offsetMinutes(at:Date,timezone:string):number {
  const part=new Intl.DateTimeFormat("en-US",{timeZone:timezone,timeZoneName:"shortOffset"}).formatToParts(at).find((item)=>item.type==="timeZoneName")?.value;
  if(!part||part==="GMT"||part==="UTC") return 0;
  const match=part.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if(!match) throw new Error(`Cannot parse timezone offset: ${part}`);
  return (match[1]==="-"?-1:1)*(Number(match[2])*60+Number(match[3]??0));
}

export function localMidnightUtc(date:string,timezone:string):Date {
  return localDateTimeUtc(date,"00:00",timezone);
}

export function localDateTimeUtc(date:string,time:string,timezone:string):Date {
  assertDateRange(date,date);
  if(!/^\d{2}:\d{2}$/.test(time)) throw new Error("Invalid time");
  const midnight=Date.parse(`${date}T${time}:00Z`);
  let instant=new Date(midnight);
  for(let i=0;i<3;i++) instant=new Date(midnight-offsetMinutes(instant,timezone)*60_000);
  return instant;
}

export function leaveInterval(startDate:string,endDate:string,timezone:string):{start:Date;end:Date}{
  assertDateRange(startDate,endDate);
  return {start:localMidnightUtc(startDate,timezone),end:localMidnightUtc(nextDate(endDate),timezone)};
}

export function overlaps(a:{start:Date;end:Date},b:{start:Date;end:Date}):boolean {
  return a.start<b.end && b.start<a.end;
}

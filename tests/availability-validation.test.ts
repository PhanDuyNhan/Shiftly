import test from "node:test";
import assert from "node:assert/strict";
import { ruleSchema,exceptionSchema } from "../src/server/scheduling/availability-validation";

test("recurring rule cannot cross midnight; split it into two days",()=>{
  const base={weekday:6,kind:"busy" as const,valid_from:"2026-11-02"};
  assert.equal(ruleSchema.safeParse({...base,start_time:"22:00",end_time:"06:00"}).success,false);
  assert.equal(ruleSchema.safeParse({...base,start_time:"22:00",end_time:"23:59"}).success,true);
  assert.equal(ruleSchema.safeParse({...base,weekday:7,start_time:"00:00",end_time:"06:00"}).success,true);
});

test("exception time endpoints are both present or both absent",()=>{
  assert.equal(exceptionSchema.safeParse({on_date:"2026-11-07",kind:"busy",start_time:null,end_time:null}).success,true);
  assert.equal(exceptionSchema.safeParse({on_date:"2026-11-07",kind:"busy",start_time:"09:00",end_time:null}).success,false);
});

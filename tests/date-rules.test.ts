import test from "node:test";
import assert from "node:assert/strict";
import { localDate,mayCancel,validDate } from "../src/server/leave/date-range";
import { leaveInterval,overlaps } from "../src/server/leave/date-interval";
import { addDays,assertMonday,registrationDeadline,shiftInterval } from "../src/server/scheduling/time";

test("calendar dates reject impossible values and do not shift with server timezone",()=>{
  assert.equal(validDate("2026-02-29"),false);
  assert.equal(validDate("2028-02-29"),true);
  assert.equal(localDate(new Date("2026-11-07T18:00:00Z"),"Asia/Ho_Chi_Minh"),"2026-11-08");
});

test("approved leave covers both local boundary days and an overnight shift",()=>{
  const leave=leaveInterval("2026-11-08","2026-11-08","Asia/Ho_Chi_Minh");
  const night=shiftInterval("2026-11-07","22:00","06:00","Asia/Ho_Chi_Minh");
  assert.equal(overlaps(leave,night),true);
  assert.equal(leave.start.toISOString(),"2026-11-07T17:00:00.000Z");
  assert.equal(leave.end.toISOString(),"2026-11-08T17:00:00.000Z");
});

test("approved cancellation closes at start of first local day",()=>{
  assert.equal(mayCancel("approved","2026-11-08","Asia/Ho_Chi_Minh",new Date("2026-11-07T16:59:59Z")),true);
  assert.equal(mayCancel("approved","2026-11-08","Asia/Ho_Chi_Minh",new Date("2026-11-07T17:00:00Z")),false);
  assert.equal(mayCancel("pending","2026-11-08","Asia/Ho_Chi_Minh",new Date("2026-11-08T00:00:00Z")),true);
  assert.equal(mayCancel("rejected","2026-11-08","Asia/Ho_Chi_Minh"),false);
});

test("week and registration deadline use preceding week",()=>{
  assertMonday("2026-11-02");
  assert.throws(()=>assertMonday("2026-11-03"));
  assert.equal(addDays("2026-11-02",6),"2026-11-08");
  assert.equal(registrationDeadline("2026-11-02",7,"20:00","Asia/Ho_Chi_Minh").toISOString(),"2026-11-01T13:00:00.000Z");
});

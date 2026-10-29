# Tasks: Lập lịch ca làm tuần

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [API contract](contracts/scheduling-api.openapi.yaml), [leave integration](contracts/leave-integration.md), [quickstart.md](quickstart.md).

**Prerequisites**: Feature `002-shiftly-foundation` cung cấp session, quyền theo cửa hàng, người/vị trí/kỹ năng, ca mẫu, nhu cầu và cấu hình cửa hàng. Feature `003-leave-requests` cung cấp đơn nghỉ `approved`, dịch vụ khoảng nghỉ và contract `needs_cover`. Repo hiện mới có tài liệu; các đường dẫn `src/` là tệp sẽ tạo khi triển khai. Không tạo lại module thuộc `002`/`003` nếu đã có.

**Tests**: Spec không yêu cầu TDD hoặc tác vụ viết test tự động riêng. Mỗi phase có tiêu chí nghiệm thu độc lập; T062 ghi kết quả thực tế theo quickstart sau khi ứng dụng chạy được.

**Organization**: Task theo thứ tự phụ thuộc. `[P]` chỉ đánh dấu khi tệp độc lập và không cần task khác chưa hoàn tất trong cùng nhóm.

## Phase 1: Setup

**Purpose**: Chuẩn bị chung Next.js/TypeScript/PostgreSQL theo plan; tái dùng cấu hình của các feature khác nếu đã tồn tại.

- [X] T001 Tạo hoặc cập nhật `package.json` cho Next.js, React, TypeScript, Zod, Drizzle và lệnh phát triển/migration dùng chung, không nhân đôi dependency đã có.
- [X] T002 Tạo hoặc cập nhật `tsconfig.json` và `next.config.ts` cho cấu trúc `src/app`, `src/server`, `src/db` của [plan.md](plan.md).
- [X] T003 [P] Cập nhật `.env.example` với biến PostgreSQL, session từ feature `002` và múi giờ mặc định của cửa hàng, không ghi bí mật thật.
- [X] T004 [P] Tạo hoặc cập nhật `compose.yaml` để chạy PostgreSQL cục bộ phục vụ quickstart, giữ dịch vụ đã có của feature khác.

**Checkpoint**: Cấu trúc chung có thể cài đặt và kết nối môi trường phát triển; chưa có nghiệp vụ lập lịch.

---

## Phase 2: Foundational

**Purpose**: Schema, quyền, thời gian và giao dịch dùng chung cho cả ba user story.

- [X] T005 Tạo hoặc mở rộng `src/db/client.ts` và `drizzle.config.ts` để feature lịch dùng cùng kết nối/migration PostgreSQL với `002` và `003`.
- [X] T006 Tạo `src/db/schema/scheduling.ts` cho `availability_rules`, `availability_exceptions`, `shift_preferences`, `schedules`, `shift_slots`, `shift_assignments`, `schedule_runs` và `schedule_revisions` theo [data-model.md](data-model.md).
- [X] T007 Tạo `src/db/migrations/0002_scheduling.sql` sau `0001_leave.sql`, gồm bảng/chỉ mục/ràng buộc lịch, unique `(store_id, week_start)` cho lịch hiện hành, revision snapshot và predicate chống trùng `status = 'assigned'` ngay khi tạo `shift_assignments`; feature `003` không tạo migration sửa bảng này.
- [X] T008 Tạo `src/server/scheduling/access.ts` dùng session/membership của `002` để giới hạn manager theo cửa hàng, admin toàn hệ thống và employee chỉ dữ liệu của mình; tạo `src/server/scheduling/concurrency.ts` để khóa hàng `users` liên quan theo UUID tăng dần trước khi khóa lịch/đơn và đọc lại trạng thái; truy vấn chéo cửa hàng chỉ trả tổng giờ hoặc mã vi phạm.
- [X] T009 [P] Tạo `src/server/scheduling/time.ts` cho tuần bắt đầu Thứ 2, ngày địa phương `Asia/Ho_Chi_Minh`, khoảng timestamp ca qua đêm và hạn đăng ký tuần trước.
- [X] T010 [P] Tạo `src/server/scheduling/errors.ts` ánh xạ lỗi quyền, dữ liệu ngày/giờ, hết hạn, version cũ và vi phạm ràng buộc sang mã phản hồi trong API contract.
- [X] T011 Tạo `src/server/scheduling/audit.ts` ghi người thực hiện, thời điểm, trước/sau và lý do vào audit log cùng giao dịch thay đổi lịch.
- [X] T012 Tạo `src/server/scheduling/csrf.ts` kiểm tra nguồn yêu cầu và mã chống giả mạo cho các route ghi bằng phiên cookie theo cách feature `002` sử dụng.

**Checkpoint**: Mọi story có thể dùng quyền, schema, thời gian và giao dịch chung; migration không nhân đôi phân công hiệu lực qua các phiên bản.

---

## Phase 3: User Story 1 - Nhân viên khai báo khả dụng và ca mong muốn (Priority: P1) 🎯 MVP đầu vào

**Goal**: Nhân viên tự quản lý bận lặp lại/ngoại lệ và nguyện vọng tuần trước hạn, xem lại dữ liệu đã gửi.

**Independent Test**: Dùng nhân viên A cùng ca mẫu/tuần mẫu của `002`; lưu quy tắc bận, ngoại lệ và nguyện vọng, xem lại; thử sửa sau hạn và truy cập dữ liệu người khác. Không cần UI quản lý hoặc solver.

- [X] T013 [US1] Tạo `src/server/scheduling/availability-validation.ts` kiểm tra weekday, khoảng giờ cùng ngày, ngày hiệu lực, ngoại lệ cả ngày và các khoảng giao nhau theo [data-model.md](data-model.md).
- [X] T014 [P] [US1] Tạo `src/server/scheduling/preference-validation.ts` kiểm tra tuần Thứ 2, `work_date` thuộc tuần, ca mẫu đúng cửa hàng/còn hoạt động và mức -1/1/2.
- [X] T015 [US1] Tạo `src/server/scheduling/availability.ts` để đọc/thay quy tắc bận lặp lại của chính người dùng và đọc/thêm/xóa ngoại lệ, áp dụng quyền từ T008.
- [X] T016 [US1] Tạo `src/server/scheduling/availability-resolver.ts` tổng hợp quy tắc lặp lại/ngoại lệ theo phần thời gian giao; `available` không được ghi đè nghỉ đã duyệt, quy tắc bận qua đêm dùng hai ngày địa phương.
- [X] T017 [US1] Tạo `src/server/scheduling/preferences.ts` để đọc/thay nguyện vọng tuần của chính người dùng, lấy deadline từ `store_settings`, từ chối ghi sau hạn và giữ dữ liệu cũ khi lỗi.
- [X] T018 [US1] Tạo GET/PUT `src/app/api/me/availability-rules/route.ts` theo API contract, suy ra `user_id` từ phiên và kiểm tra CSRF khi ghi.
- [X] T019 [US1] Tạo GET/POST `src/app/api/me/availability-exceptions/route.ts` theo API contract, chỉ đọc/ghi ngoại lệ của người gọi.
- [X] T020 [US1] Tạo DELETE `src/app/api/me/availability-exceptions/[exceptionId]/route.ts` với điều kiện ngoại lệ thuộc người gọi.
- [X] T021 [US1] Tạo GET/PUT `src/app/api/me/shift-preferences/route.ts` theo API contract, trả deadline và lỗi hết hạn rõ ràng.
- [X] T022 [US1] Tạo giao diện khai báo bận/ngoại lệ tại `src/app/(employee)/availability/page.tsx`, có cách nhập hai khoảng theo ngày cho bận qua đêm.
- [X] T023 [US1] Tạo giao diện chọn nguyện vọng theo tuần tại `src/app/(employee)/availability/preferences/page.tsx`, hiển thị mức ưu tiên, deadline và dữ liệu đã lưu.
- [X] T024 [US1] Tạo trang xem dữ liệu khai báo của tuần sắp tới tại `src/app/(employee)/schedule/page.tsx`; chưa đọc ca làm đã công bố, phần đó thuộc US3/T053–T057.
- [X] T025 [US1] Nối `src/app/(employee)/availability/page.tsx` với T018–T021 để hiển thị lỗi từng trường, trạng thái lưu và dữ liệu đọc lại sau khi gửi.

**Checkpoint**: US1 hoạt động độc lập với US2/US3 bằng dữ liệu nền tảng; luồng nhập thông thường có thể đo SC-006.

---

## Phase 4: User Story 2 - Quản lý tạo và xếp lịch nháp (Priority: P1)

**Goal**: Quản lý đúng cửa hàng xem độ phủ, tạo slot từ nhu cầu và chạy greedy để có lịch nháp, giữ ca đã khóa và giải thích slot thiếu.

**Independent Test**: Dùng nhu cầu/nhân viên mẫu từ `002` và khả dụng/nguyện vọng mẫu (có thể seed nếu US1 UI chưa có); tạo nháp, chạy xếp lại với ca pinned, đối chiếu slot thiếu, cảnh báo và quyền cửa hàng B.

- [X] T026 [US2] Tạo `src/server/scheduling/slots.ts` sinh slot cho bảy ngày từ ca mẫu/nhu cầu đang hoạt động, chụp `min_count`/`ideal_count` và timestamp đúng cho ca qua đêm.
- [X] T027 [P] [US2] Tạo `src/server/scheduling/assignments.ts` đọc phân công `assigned` hiệu lực từ mọi cửa hàng cho cùng nhân viên, loại `needs_cover/cancelled` và chỉ trả tổng giờ/kết luận cho người không có quyền cửa hàng khác.
- [X] T028 [US2] Tạo `src/server/scheduling/hard-constraints.ts` kiểm tra H1–H9 trên ứng viên/lịch: bận, nghỉ duyệt, trùng giờ, có bản ghi kỹ năng 1–5 cho vị trí, giờ tuần theo `max_hours_week` nhỏ nhất của các membership còn hiệu lực, giờ/ngày theo `max_hours_day` nhỏ nhất và nghỉ giữa ca theo `min_rest_hours` lớn nhất của các cửa hàng có ca liên quan, ngày nghỉ tuần, sức chứa slot và pinned.
- [X] T029 [US2] Tạo `src/server/scheduling/leave-eligibility.ts` đọc khoảng nghỉ `approved` mới nhất từ feature `003` và so giao `[start_at,end_at)` kể cả ca qua đêm; trạng thái khác không chặn ca.
- [X] T030 [US2] Tạo `src/server/scheduling/candidate-explanations.ts` tổng hợp lý do ứng viên bị loại và số người thiếu theo slot mà không đưa lịch cửa hàng khác vào phản hồi.
- [X] T031 [US2] Tạo `src/server/scheduling/coverage.ts` tổng hợp nhu cầu, người khả dụng và nguyện vọng theo ngày/ca/vị trí từ T016/T028/T029.
- [X] T032 [US2] Tạo `src/server/scheduling/create-draft.ts` tạo duy nhất một lịch hiện hành cho cửa hàng/tuần, sinh slot trong cùng giao dịch và từ chối tuần không bắt đầu Thứ 2.
- [X] T033 [US2] Tạo `src/server/scheduling/greedy.ts` xếp slot khan hiếm trước, chọn người theo nguyện vọng/giờ mục tiêu, phủ `min_count` rồi tối ưu đến `ideal_count`, không vượt trần và không vi phạm T028.
- [X] T034 [US2] Tạo `src/server/scheduling/local-improvement.ts` thử hoán đổi cục bộ có giới hạn thời gian, chỉ nhận thay đổi vẫn qua T028 và giữ pinned.
- [X] T035 [US2] Tạo `src/server/scheduling/auto-assign.ts` khóa hàng `users` của các ứng viên theo T008 trước khi khóa lịch draft, đọc lại nghỉ/khả dụng, giữ phân công pinned, chạy T033/T034, ghi `schedule_runs` cùng score/runtime/warnings/fairness và rollback khi pinned xung đột.
- [X] T036 [US2] Tạo GET/POST `src/app/api/stores/[storeId]/schedules/route.ts` cho đọc lịch theo tuần và tạo draft đúng quyền, trả xung đột nếu lịch đã có.
- [X] T037 [US2] Tạo GET `src/app/api/stores/[storeId]/coverage/route.ts` trả tổng hợp độ phủ của T031 theo cửa hàng được phép.
- [X] T038 [US2] Tạo POST `src/app/api/schedules/[scheduleId]/auto-assign/route.ts` chỉ cho manager/admin của cửa hàng chạy lại draft.
- [X] T039 [US2] Tạo trang tổng hợp và tạo nháp tại `src/app/(manager)/stores/[storeId]/schedules/page.tsx`, hiển thị nhu cầu, người khả dụng và deadline.
- [X] T040 [US2] Tạo trang lịch nháp/lần chạy tại `src/app/(manager)/stores/[storeId]/schedules/[scheduleId]/page.tsx`, hiển thị slot, số thiếu, lý do, score và giờ mục tiêu/thực tế.
- [X] T041 [US2] Tạo điều khiển chạy/xếp lại tại `src/app/(manager)/stores/[storeId]/schedules/[scheduleId]/auto-assign-action.tsx`, nêu rõ ca pinned được giữ và xung đột nếu dữ liệu mới làm ca đó không hợp lệ.
- [X] T042 [US2] Nối `src/app/(manager)/stores/[storeId]/schedules/[scheduleId]/page.tsx` với T035–T038 để cập nhật kết quả chạy và cảnh báo mà không hiển thị dữ liệu cửa hàng khác.

**Checkpoint**: US2 tạo được lịch nháp có báo thiếu và quyền đúng cửa hàng; có thể dùng fixture khả dụng/nguyện vọng mà không phụ thuộc UI của US1.

---

## Phase 5: User Story 3 - Kiểm tra, chỉnh sửa và công bố lịch (Priority: P1)

**Goal**: Quản lý xem lý do thiếu, chỉnh lịch có validator, công bố lịch hợp lệ và lưu phiên bản khi sửa lịch đã công bố.

**Independent Test**: Dùng draft fixture với slot/phân công mẫu (không cần solver US2); thử chỉnh vi phạm/hợp lệ, công bố, xem bằng tài khoản nhân viên rồi sửa published có/không có lý do và version cũ.

- [X] T043 [US3] Tạo `src/server/scheduling/validate-schedule.ts` chạy lại T028/T029 trên toàn lịch và dữ liệu mới nhất, phân biệt vi phạm cứng với cảnh báo thiếu `min_count`.
- [X] T044 [US3] Tạo `src/server/scheduling/revisions.ts` lưu snapshot lịch/slot/phân công trước sửa published, lý do, người/thời điểm và tăng version trong cùng giao dịch.
- [X] T045 [US3] Tạo `src/server/scheduling/edit-assignment.ts` thêm/đổi/hủy/pin/unpin phân công với `expected_version`, khóa hàng `users` của người cũ/mới theo T008 trước khi khóa lịch, đọc lại nghỉ, kiểm quyền/T043, yêu cầu lý do và T044 khi published.
- [X] T046 [US3] Tạo `src/server/scheduling/publish.ts` khóa hàng `users` của mọi người đang được phân công theo T008 trước khi khóa draft, đọc lại nghỉ và kiểm T043 trong cùng giao dịch, ghi `published_at/by` và audit; từ chối nếu vi phạm cứng hoặc trạng thái đã đổi.
- [X] T047 [US3] Tạo `src/server/scheduling/read-published.ts` chỉ đọc version hiện hành và phân công `assigned` của chính nhân viên; không trả draft hoặc `needs_cover` như giờ làm.
- [X] T048 [US3] Tạo POST `src/app/api/schedules/[scheduleId]/validate/route.ts` trả vi phạm có mã/vị trí và cảnh báo slot thiếu.
- [X] T049 [US3] Tạo POST `src/app/api/schedules/[scheduleId]/publish/route.ts` gọi T046 và trả version đã công bố.
- [X] T050 [US3] Tạo POST `src/app/api/slots/[slotId]/assignments/route.ts` để thêm người vào slot draft/published qua T045, yêu cầu lý do khi published.
- [X] T051 [US3] Tạo PATCH `src/app/api/assignments/[assignmentId]/route.ts` cho reassign/unassign/pin/unpin qua T045, trả xung đột khi version cũ hoặc vi phạm.
- [X] T052 [US3] Tạo GET `src/app/api/schedules/[scheduleId]/revisions/route.ts` để quản lý/admin xem lịch sử version trong đúng cửa hàng.
- [X] T053 [US3] Tạo GET `src/app/api/me/schedule/route.ts` cho nhân viên xem lịch published của mình theo tuần.
- [X] T054 [US3] Tạo `src/server/scheduling/needs-cover.ts` là dịch vụ duy nhất chuyển ca published chưa kết thúc giao nghỉ sang `needs_cover` sau khi giao dịch duyệt đã khóa hàng người dùng theo T008; tạo revision hệ thống `approved_leave:<id>` và audit cùng giao dịch, không tự phục hồi khi hủy đơn.
- [X] T055 [US3] Cập nhật `src/app/(manager)/stores/[storeId]/schedules/[scheduleId]/page.tsx` với vi phạm, lý do slot thiếu, phân công pinned, `needs_cover`, phiên bản và hành động công bố.
- [X] T056 [US3] Tạo biểu mẫu chỉnh/pin/công bố tại `src/app/(manager)/stores/[storeId]/schedules/[scheduleId]/edit-actions.tsx`, bắt buộc lý do cho published và hiển thị version mới/xung đột.
- [X] T057 [US3] Cập nhật `src/app/(employee)/schedule/page.tsx` để chỉ hiển thị phân công published `assigned` hiện hành và giờ theo múi giờ cửa hàng.

**Checkpoint**: US3 hoạt động với draft fixture; việc sửa published có snapshot và lý do, nhân viên chỉ thấy version hiện hành.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Hoàn thiện tài liệu và bằng chứng nghiệm thu sau khi các story được chọn đã chạy được.

- [X] T058 Cập nhật `README.md` với lệnh cấu hình/migration/seed cho lịch tuần và liên kết `specs/001-shift-scheduling/quickstart.md`.
- [X] T059 [P] Tạo `docs/scheduling-operations.md` mô tả xử lý ca pinned xung đột, slot thiếu, lỗi solver, version cũ, thay đổi nghỉ đã duyệt và ranh giới quyền liên chi nhánh.
- [X] T060 [P] Tạo `src/db/seed/scheduling-demo.ts` với fixture khả thi/thiếu người, ca qua đêm, pinned, nghỉ duyệt và ca ở cửa hàng B theo quickstart; chạy lại không tạo bản trùng.
- [X] T061 Kiểm tra đường dẫn/tài liệu API và cập nhật `specs/001-shift-scheduling/quickstart.md` bằng lệnh chạy thực tế cùng dữ liệu seed T060 sau khi ứng dụng tồn tại.
- [X] T062 Ghi kết quả nghiệm thu SC-001–SC-007, H1–H9, quyền chéo cửa hàng, ca qua đêm và revision vào `specs/001-shift-scheduling/acceptance-results.md`, gồm số lần thử, thời gian đo, kết quả thực tế và lỗi còn mở; chỉ đánh dấu đạt khi có bằng chứng.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Feature 002 (session + membership + cấu hình) ──┐
                                                ├─> Phase 1 Setup -> Phase 2 Foundational
PostgreSQL + audit_logs từ nền tảng ─────────────┘                         │
                                                                          ├─> US1 nhập liệu
                                                                          ├─> US2 nháp/solver
                                                                          └─> US3 chỉnh/công bố
Feature 003 (approved leave + review) ────────────────────────────────────────> T029, T054
```

- Phase 1 hoàn tất trước Phase 2; Phase 2 chặn mọi user story.
- US1 độc lập sau Foundation, dùng ca mẫu/cấu hình của `002`; không cần lịch nháp.
- US2 dùng dữ liệu khả dụng/nguyện vọng từ US1 hoặc fixture seed; UI US1 không phải điều kiện bắt đầu. T029 cần contract dữ liệu nghỉ từ `003` hoặc adapter fixture tương đương để nghiệm thu riêng.
- US3 dùng draft từ US2 hoặc fixture và cần validator T028/T029 của US2, nhưng không cần solver/UI US2 để nghiệm thu luồng chỉnh/công bố; T054 cần review của `003` và dữ liệu lịch đã công bố. Feature `003` nối review vào T054 tại task T043 của mình.
- Phase 6 theo sau các story được chọn; T062 cần ứng dụng chạy được và dữ liệu T060.

### Parallel Opportunities

- Sau T001/T002, T003 và T004 ở tệp độc lập.
- Sau schema/migration và quyền nền tảng, T009 với T010 ở tệp độc lập.
- Trong US1, T014 có thể chuẩn bị độc lập với T013; các route T018–T021 làm trên tệp khác nhau sau khi dịch vụ tương ứng xong.
- Trong US2, T027 có thể chuẩn bị độc lập với T026; T036–T038 là route khác nhau sau khi dịch vụ hoàn tất.
- Trong US3, T044 có thể chuẩn bị độc lập với T043 sau Foundation; T048–T053 là route khác nhau sau dịch vụ tương ứng.
- T059 và T060 ở tệp độc lập sau story; T061 chờ T060, T062 chờ dữ liệu/lệnh chạy.

### Parallel Example: User Story 1

```text
T013: availability-validation.ts
T014: preference-validation.ts (độc lập)
Sau T015/T017: T018 availability-rules route và T021 shift-preferences route ở tệp khác nhau
```

### Parallel Example: User Story 2

```text
T026: slots.ts
T027: assignments.ts (độc lập)
Sau T032/T035: T036 schedules route, T038 auto-assign route ở tệp khác nhau
```

### Parallel Example: User Story 3

```text
T043: validate-schedule.ts
T044: revisions.ts (độc lập)
Sau T045/T046: T050 add-assignment route, T049 publish route ở tệp khác nhau
```

## Implementation Strategy

1. **MVP đầu vào:** Setup + Foundational + US1 để nhân viên khai báo và xem lại dữ liệu tuần; nghiệm thu độc lập trước khi nối solver.
2. **Lịch nháp:** US2 tạo slot, tổng hợp độ phủ, greedy và cảnh báo; ưu tiên tính đúng của validator trước điểm chất lượng.
3. **Công bố:** US3 dùng cùng validator cho chỉnh tay/công bố, thêm snapshot version và tích hợp `needs_cover`.
4. **Hoàn thiện:** Phase 6 tạo fixture và ghi kết quả quickstart. Không công bố SC đạt chỉ vì task đã được đánh dấu hoàn thành.

## Notes

- Mỗi task nêu tệp đích cụ thể; các tệp `src/` chưa có trong repo hiện tại.
- `[P]` chỉ công việc độc lập theo tệp và phụ thuộc; không sửa cùng route/dịch vụ song song.
- Không triển khai CP-SAT, đổi ca, thông báo hoặc AI trong danh sách này.


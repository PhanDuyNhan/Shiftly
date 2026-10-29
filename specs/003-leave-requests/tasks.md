# Tasks: Xin nghỉ phép và duyệt đơn

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [API contract](contracts/leave-api.openapi.yaml), [scheduling contract](contracts/scheduling-integration.md)

**Prerequisites**: Spec nền tảng `002-shiftly-foundation` phải cung cấp tài khoản, phiên đăng nhập, `users`, `stores`, `store_memberships` và quyền admin/quản lý/nhân viên. Spec lập lịch `001-shift-scheduling` phải cung cấp dữ liệu phân công và điểm tích hợp để hoàn thành US4. Repo hiện chưa có source code; các đường dẫn `src/` dưới đây là tệp cần tạo khi triển khai.

**Verification**: Không thêm tác vụ viết test vì yêu cầu tính năng không đề nghị TDD hoặc test riêng. T052 ghi bằng chứng nghiệm thu thủ công cho SC-001–SC-006 theo quickstart.

**Organization**: Tác vụ theo thứ tự phụ thuộc. `[P]` chỉ dùng khi công việc nằm ở tệp khác nhau và không chờ tác vụ chưa hoàn tất trong cùng nhóm.

## Phase 1: Setup

**Purpose**: Tạo một ứng dụng web theo cấu trúc trong plan, đủ chỗ cho các module của tính năng.

- [X] T001 Tạo `package.json` cho ứng dụng Next.js/TypeScript, gồm Next.js, React, Zod, Drizzle và các lệnh phát triển/migration.
- [X] T002 Tạo `tsconfig.json` và `next.config.ts` cho cấu trúc `src/app`, `src/server`, `src/db` trong `specs/003-leave-requests/plan.md`.
- [X] T003 [P] Tạo `.env.example` với biến kết nối PostgreSQL, khóa phiên từ spec nền tảng và cấu hình kho tệp riêng tư; không đặt giá trị bí mật thật.
- [X] T004 [P] Tạo `compose.yaml` cho PostgreSQL và kho tệp riêng tư phục vụ phát triển cục bộ theo `specs/003-leave-requests/quickstart.md`.

**Checkpoint**: Cấu trúc ứng dụng và cấu hình môi trường đã sẵn sàng; chưa có chức năng nghiệp vụ.

---

## Phase 2: Foundational

**Purpose**: Dữ liệu và các quy tắc dùng chung, bắt buộc trước mọi user story.

- [X] T005 Tạo kết nối PostgreSQL và cấu hình migration trong `src/db/client.ts` và `drizzle.config.ts`.
- [X] T006 Khai báo `leave_types`, `leave_requests` và các liên kết tới dữ liệu nền tảng trong `src/db/schema/leave.ts` theo `specs/003-leave-requests/data-model.md`.
- [X] T007 Tạo migration `src/db/migrations/0001_leave.sql` cho bảng/chỉ mục, kiểm tra ngày và lý do, `btree_gist`, cùng ràng buộc loại trừ đơn `pending`/`approved` giao ngày.
- [X] T008 Tạo `src/server/leave/access.ts` để lấy người dùng từ phiên nền tảng, xác minh membership đúng cửa hàng, quyền admin/quản lý và cấm tự xét duyệt; từ chối mặc định khi thiếu dữ liệu nền tảng.
- [X] T009 [P] Tạo `src/server/leave/date-range.ts` để tính ngày địa phương bao gồm hai ngày biên và so sánh điều kiện hủy trước ngày bắt đầu.
- [X] T010 Tạo `src/server/leave/audit.ts` để ghi lịch sử gửi, duyệt, từ chối, hủy trong cùng giao dịch với thay đổi đơn.
- [X] T011 [P] Tạo `src/server/leave/errors.ts` ánh xạ lỗi quyền, dữ liệu, trùng ngày, trạng thái và kích thước tệp sang mã phản hồi trong contract.
- [X] T012 Tạo `src/server/leave/repository.ts` cho đọc đơn/loại nghỉ theo phạm vi quyền và cập nhật trạng thái có điều kiện, không nhận `user_id` từ client.
- [X] T013 Tạo `src/server/leave/csrf.ts` để kiểm tra nguồn yêu cầu và mã chống giả mạo cho các Route Handlers ghi dữ liệu bằng phiên cookie.

**Checkpoint**: Ràng buộc dữ liệu, quyền và thao tác giao dịch dùng chung đã sẵn sàng; mọi story có thể dùng dữ liệu mẫu độc lập.

---

## Phase 3: User Story 1 - Nhân viên gửi và theo dõi đơn nghỉ (Priority: P1) 🎯 MVP

**Goal**: Nhân viên gửi đơn hợp lệ với tối đa một tệp và xem đơn của chính mình.

**Independent Test**: Với tài khoản và loại nghỉ mẫu, gửi đơn hợp lệ; đơn thiếu lý do/tệp bắt buộc hoặc trùng ngày bị từ chối; nhân viên khác không xem được đơn/tệp.

- [X] T014 [US1] Tạo `src/db/seed/leave-types.ts` với ít nhất Nghỉ phép năm và Nghỉ ốm (loại thứ hai yêu cầu tệp), bảo đảm chạy seed lặp lại không tạo bản trùng; tạo GET loại nghỉ đang hoạt động tại `src/app/api/leave-types/route.ts` để biểu mẫu chỉ cho chọn loại hợp lệ.
- [X] T015 [P] [US1] Tạo validation biểu mẫu trong `src/server/leave/validation.ts` cho ngày, lý do, loại nghỉ, tối đa một tệp và định dạng/kích thước đã chốt trong plan.
- [X] T016 [P] [US1] Tạo adapter lưu/đọc/xóa tệp riêng tư trong `src/server/storage/private-attachment.ts`, dùng tên lưu trữ ngẫu nhiên và không xuất URL công khai.
- [X] T017 [US1] Tạo `src/server/leave/attachments.ts` để kiểm tra nội dung tệp PDF/JPEG/PNG tối đa 4 MB và chỉ đọc tệp sau khi `access.ts` cho phép.
- [X] T018 [US1] Tạo `src/server/leave/create.ts` để kiểm tra loại nghỉ còn hiệu lực, quyền gửi và đơn giao ngày; lưu tệp rồi tạo đơn `pending` và audit, xóa bù tệp nếu giao dịch thất bại.
- [X] T019 [US1] Tạo `src/server/leave/read.ts` cho danh sách/chi tiết đơn của chính nhân viên, không đưa khóa tệp riêng tư vào phản hồi.
- [X] T020 [US1] Tạo GET/POST `src/app/api/leave-requests/route.ts` theo contract, với `user_id` từ phiên và lỗi thống nhất.
- [X] T021 [US1] Tạo GET `src/app/api/leave-requests/[id]/route.ts` cho chi tiết đơn trong phạm vi quyền.
- [X] T022 [US1] Tạo GET `src/app/api/leave-requests/[id]/attachment/route.ts` kiểm tra quyền mỗi lần tải và trả tệp với cache riêng tư.
- [X] T023 [US1] Tạo biểu mẫu điện thoại tại `src/app/(employee)/leave/new/page.tsx` cho loại nghỉ, ngày, lý do, một tệp và lỗi từng trường.
- [X] T024 [US1] Tạo danh sách và chi tiết đơn của mình tại `src/app/(employee)/leave/page.tsx` và `src/app/(employee)/leave/[id]/page.tsx`, gồm trạng thái và kết quả duyệt.

**Checkpoint**: Nhân viên gửi và theo dõi đơn độc lập với màn hình quản lý; T014 cung cấp loại nghỉ mẫu cho MVP.

---

## Phase 4: User Story 2 - Quản lý xét duyệt trong cửa hàng (Priority: P2)

**Goal**: Quản lý đúng cửa hàng xem tác động và quyết định một đơn `pending`; admin có cùng quyền trên mọi cửa hàng.

**Independent Test**: Với đơn chờ của A/B, quản lý A chỉ thấy A, xem ca bị ảnh hưởng, duyệt/từ chối một lần; quản lý B hoặc người gửi không tự xét duyệt được.

- [X] T025 [P] [US2] Tạo cầu nối đọc tác động ca trong `src/server/scheduling/leave-impact.ts`, trả danh sách rỗng khi chưa có lịch.
- [X] T026 [US2] Tạo hoặc mở rộng `src/server/leave/read.ts` cho danh sách đơn của quản lý/admin theo `store_id`, trạng thái và khoảng ngày, giữ lọc quyền ở server.
- [X] T027 [US2] Tạo hoặc mở rộng GET `src/app/api/leave-requests/route.ts` để quản lý/admin lọc danh sách theo cửa hàng đúng như contract.
- [X] T028 [US2] Tạo `src/server/leave/review.ts` với chuyển `pending → approved/rejected` có điều kiện, ghi chú bắt buộc khi từ chối, cấm tự duyệt và audit cùng giao dịch.
- [X] T029 [US2] Tạo POST `src/app/api/leave-requests/[id]/review/route.ts` trả xung đột khi trạng thái đã đổi, không ghi đè quyết định khác.
- [X] T030 [US2] Tạo GET `src/app/api/leave-requests/[id]/impact/route.ts` chỉ cho người có quyền xét duyệt xem ca liên quan.
- [X] T031 [US2] Tạo danh sách lọc đơn của cửa hàng tại `src/app/(manager)/stores/[storeId]/leave/page.tsx`.
- [X] T032 [US2] Tạo trang chi tiết đơn và tác động ca tại `src/app/(manager)/stores/[storeId]/leave/[id]/page.tsx`.
- [X] T033 [US2] Tạo biểu mẫu duyệt/từ chối và ghi chú tại `src/app/(manager)/stores/[storeId]/leave/[id]/review-form.tsx`, hiển thị trạng thái mới khi có xung đột.

**Checkpoint**: Quản lý xét duyệt đơn trong phạm vi quyền ngay cả khi US1 UI chưa có, bằng đơn mẫu trong dữ liệu.

---

## Phase 5: User Story 3 - Nhân viên hủy đơn còn được phép (Priority: P3)

**Goal**: Người gửi hủy đơn chờ, hoặc đơn đã duyệt trước ngày bắt đầu; lịch sử còn nguyên.

**Independent Test**: Hủy đơn `pending` và `approved` trước ngày bắt đầu; đơn đã đến ngày nghỉ hoặc đã `rejected/cancelled` không hủy được.

- [X] T034 [US3] Tạo `src/server/leave/cancel.ts` cập nhật trạng thái có điều kiện theo ngày địa phương, chỉ cho người gửi hủy và giữ thông tin duyệt/audit.
- [X] T035 [US3] Tạo POST `src/app/api/leave-requests/[id]/cancel/route.ts` trả xung đột khi đơn không còn hủy được.
- [X] T036 [US3] Tạo điều khiển hủy và lời giải thích điều kiện hủy tại `src/app/(employee)/leave/[id]/cancel-action.tsx`.
- [X] T037 [US3] Tích hợp điều khiển hủy vào `src/app/(employee)/leave/[id]/page.tsx` và cập nhật trạng thái sau quyết định.

**Checkpoint**: Luồng hủy hoạt động độc lập với module lịch; không tự khôi phục ca đã đổi trạng thái.

---

## Phase 6: User Story 4 - Nghỉ đã duyệt ảnh hưởng khả năng xếp ca (Priority: P4)

**Goal**: Module lịch dùng đơn `approved` làm khoảng không thể xếp, kể cả ca qua đêm; ca đã công bố chưa kết thúc trùng đơn duyệt chuyển thành `needs_cover` theo quy tắc PRD.

**Independent Test**: Với bốn trạng thái đơn và ca giao hai ngày biên/qua đêm, chỉ đơn `approved` cản xếp ca; duyệt trùng lịch đã công bố để lại ca cần người thay và lịch sử quyết định.

- [X] T038 [US4] Tạo `src/server/leave/approved-intervals.ts` trả các khoảng nghỉ đã duyệt theo người/cửa hàng/tuần, loại bỏ `pending/rejected/cancelled`.
- [X] T039 [P] [US4] Tạo `src/server/leave/date-interval.ts` chuyển ngày nghỉ địa phương sang khoảng thời gian thực, bao gồm hai ngày biên và ca qua đêm.
- [X] T040 [US4] Tạo `src/server/leave/scheduling-feed.ts` kết hợp T038/T039 để module lịch của feature `001` đọc khoảng nghỉ `approved` theo người/cửa hàng/tuần; feature `001` sở hữu `src/server/scheduling/leave-eligibility.ts`.
- [X] T041 [US4] Tạo `src/server/leave/review-lock.ts` dùng cơ chế khóa hàng `users` trong `src/server/scheduling/concurrency.ts` của feature `001` trước khi khóa lịch/đơn và đọc lại trạng thái, bảo đảm duyệt nghỉ và ghi lịch cùng người được tuần tự hóa.
- [X] T042 [US4] Tạo `src/server/leave/scheduling-bridge.ts` gọi dịch vụ `src/server/scheduling/needs-cover.ts` duy nhất của feature `001` trong cùng giao dịch duyệt, nhận số ca bị ảnh hưởng; không tạo migration hoặc dịch vụ cập nhật phân công riêng.
- [X] T043 [US4] Nối `src/server/leave/review.ts` với T041/T042 khi duyệt; nếu cập nhật ca hoặc revision thất bại thì quyết định duyệt rollback. Feature `001` sở hữu validator tại `src/server/scheduling/validate-schedule.ts` và kiểm tra nghỉ ở `src/server/scheduling/leave-eligibility.ts`.

**Checkpoint**: Bảo đảm lịch tuần không xếp vào ngày nghỉ đã duyệt. T041–T043 phụ thuộc dịch vụ khóa/phân công của feature `001`; migration `0002_scheduling.sql` của feature `001` tạo predicate `assigned` ngay từ đầu.

---

## Phase 7: User Story 5 - Admin quản lý loại nghỉ (Priority: P5)

**Goal**: Admin duy trì loại nghỉ dùng chung; loại ngừng hoạt động không chọn được cho đơn mới nhưng còn trong đơn cũ.

**Independent Test**: Admin tạo/sửa/ngừng sử dụng loại nghỉ yêu cầu tệp; quản lý và nhân viên không sửa danh mục, đơn cũ vẫn hiện loại đã chọn.

- [X] T044 [US5] Tạo `src/server/leave/type-admin.ts` cho admin tạo/sửa/ngừng sử dụng loại nghỉ, chặn tên trùng và giữ tham chiếu đơn cũ.
- [X] T045 [US5] Tạo hoặc mở rộng `src/app/api/leave-types/route.ts` cho admin xem cả loại ngừng hoạt động và tạo loại mới, giữ GET loại đang hoạt động cho biểu mẫu nhân viên.
- [X] T046 [US5] Tạo PATCH `src/app/api/leave-types/[id]/route.ts` cho admin sửa trạng thái, tên, trả lương và yêu cầu tệp.
- [X] T047 [US5] Tạo trang danh mục loại nghỉ tại `src/app/(admin)/leave-types/page.tsx` với trạng thái hoạt động và khả năng sửa.
- [X] T048 [US5] Tạo biểu mẫu loại nghỉ tại `src/app/(admin)/leave-types/type-form.tsx`, trình bày tác động của việc ngừng sử dụng lên đơn mới.

**Checkpoint**: Admin quản lý được danh mục mà không thay đổi tính hợp lệ của đơn đã gửi.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Hoàn thiện bảo mật vận hành và tài liệu sau các story được chọn.

- [X] T049 Tạo dọn tệp mồ côi sau lỗi lưu đơn trong `src/server/leave/attachment-cleanup.ts`, chỉ xử lý khóa không còn được `leave_requests` tham chiếu.
- [X] T050 [P] Cập nhật `README.md` với cấu hình kho tệp riêng tư, migration, quyền cần có và liên kết `specs/003-leave-requests/quickstart.md`.
- [X] T051 [P] Tạo `docs/leave-operations.md` mô tả xử lý lỗi kho tệp, đơn trùng ngày, xung đột xét duyệt và ranh giới tích hợp `needs_cover`.
- [ ] T052 Ghi kết quả nghiệm thu thủ công SC-001–SC-006, gồm vai trò, dữ liệu mẫu, số lần thử, thời gian đo, kết quả thực tế và lỗi còn mở, trong `specs/003-leave-requests/acceptance-results.md` theo [quickstart.md](quickstart.md); chỉ đánh dấu đạt khi có bằng chứng.

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Spec 002 (auth + store membership) ──┐
                                    ├─> Phase 1 Setup -> Phase 2 Foundational
Database nền tảng / audit_logs ──────┘                         │
                                                               ├─> US1 gửi/xem
                                                               ├─> US2 duyệt (đơn mẫu hoặc US1)
                                                               ├─> US3 hủy (đơn mẫu hoặc US1)
                                                               ├─> US5 loại nghỉ admin
                                                               └─> US4 dữ liệu nghỉ đã duyệt
                                                                        │
Spec 001 (phân công + xác nhận lịch) ────────────────────────────────────┘
```

- Phase 1 hoàn tất trước Phase 2; Phase 2 chặn mọi user story.
- US1 cần ít nhất một loại nghỉ mẫu từ dữ liệu seed hoặc US5. US2/US3 có thể dùng đơn mẫu để nghiệm thu riêng mà không chờ UI của US1.
- US4 cần đơn `approved`; có thể dùng dữ liệu mẫu, nhưng T041–T043 còn phụ thuộc phần phân công/xác nhận lịch của spec `001`.
- Phase 8 theo sau những story được chọn để triển khai; T049 cần cơ chế tệp của US1.

### Parallel Opportunities

- Sau T001/T002, T003 và T004 làm ở tệp độc lập.
- Sau schema/migration và hợp đồng nền tảng, T009 với T011 có thể làm song song.
- Trong US1, T015 và T016 độc lập trước khi T017/T018 nối chúng; T021 độc lập với form T023 khi dịch vụ đọc đã sẵn sàng.
- Trong US2, T025 có thể chuẩn bị độc lập; form T033 chỉ bắt đầu sau dịch vụ/route xét duyệt.
- US2, US3 và US5 có thể đi song song sau Phase 2 nếu có đơn/loại nghỉ mẫu, nhưng các tác vụ sửa chung `src/server/leave/read.ts` và route collection phải được phối hợp tuần tự.
- Trong US4, T039 độc lập với truy vấn T038; T040 phụ thuộc cả hai.

### Parallel Example: User Story 1

```text
Task T015: Biểu mẫu hợp lệ trong src/server/leave/validation.ts
Task T016: Kho tệp riêng tư trong src/server/storage/private-attachment.ts
Sau cả hai: T017 kiểm tra tệp -> T018 tạo đơn
```

### Parallel Example: User Story 2

```text
Task T025: Đọc tác động lịch trong src/server/scheduling/leave-impact.ts
Task T026: Chuẩn bị danh sách quản lý trong src/server/leave/read.ts sau Foundation
Sau dịch vụ xét duyệt T028: T029 route quyết định -> T033 biểu mẫu duyệt/từ chối
```

## Implementation Strategy

1. **MVP đầu tiên:** Hoàn thành Setup, Foundational và US1 để nhân viên gửi/xem đơn; chạy seed loại nghỉ của T014.
2. **Luồng xét duyệt:** Thêm US2 rồi US3 để xử lý trạng thái và hủy đơn đầy đủ.
3. **Tích hợp lịch:** Thực hiện US4 khi spec `001` có phân công/validator; áp dụng quy tắc `needs_cover` trong [scheduling-integration.md](contracts/scheduling-integration.md).
4. **Quản trị danh mục:** US5 có thể triển khai song song sau Foundational; hoàn tất trước khi bỏ dữ liệu loại nghỉ seed khỏi quy trình sử dụng.
5. **Hoàn thiện:** Làm Phase 8 sau các story cần giao, rồi ghi kết quả nghiệm thu theo `specs/003-leave-requests/quickstart.md` vào T052.

## Notes

- Mỗi tác vụ có đường dẫn đích cụ thể; các đường dẫn source là tệp sẽ được tạo khi triển khai, không phải tệp hiện đã có.
- `[P]` chỉ các việc độc lập theo tệp; không chạy song song hai việc cùng sửa một route/dịch vụ.
- Không triển khai đổi ca, thông báo hoặc đơn nghỉ gộp nhiều chi nhánh trong danh sách này.



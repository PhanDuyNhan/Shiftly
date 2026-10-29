# Implementation Plan: Lập lịch ca làm tuần

**Feature**: `001-shift-scheduling` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: `specs/001-shift-scheduling/spec.md`. Script plan được chạy với feature override; nhánh Git thực tế vẫn là `003-leave-requests`.

## Summary

Xây luồng nhân viên khai báo khả dụng/nguyện vọng, quản lý tạo và xếp lịch nháp, kiểm tra/chỉnh lịch rồi công bố. Dùng cùng ứng dụng Next.js/TypeScript và PostgreSQL với spec nền tảng. Solver greedy theo độ khan hiếm dùng chung validator ràng buộc cứng với thao tác tay và công bố. Giữ lịch sử lần chạy, lý do slot thiếu và phiên bản lịch đã công bố. Tài khoản/cấu hình lấy từ spec `002`, nghỉ đã duyệt từ spec `003`.

## Technical Context

**Cập nhật 2026-10-28**: Nhân viên có đúng một tư cách cửa hàng gốc và một quản lý trực tiếp. API nguyện vọng suy ra cửa hàng gốc từ phiên đăng nhập. Quản lý có thể chỉnh lịch cửa hàng mình bằng cách chọn nhân viên từ cửa hàng khác; validator kiểm tra toàn bộ ca và nghỉ phép của nhân viên trên các cửa hàng.

**Language/Version**: TypeScript 5.x, Node.js 22 LTS  
**Primary Dependencies**: Next.js App Router, React, Zod, Drizzle ORM, PostgreSQL driver; xác thực từ spec `002`  
**Storage**: PostgreSQL cho khả dụng, nguyện vọng, lịch, phân công, lần chạy và audit  
**Verification**: Nghiệm thu theo [quickstart.md](quickstart.md), đối chiếu H1–H9 và SC-001–SC-007; test tự động có thể bổ sung khi triển khai  
**Target Platform**: Trình duyệt điện thoại/máy tính, Node.js chạy trong Docker hoặc môi trường hỗ trợ Next.js Route Handlers  
**Project Type**: Web application chung codebase với spec `002` và `003`  
**Performance Goals**: Một cửa hàng, một tuần và tối đa 30 nhân viên: từ tạo nháp đến công bố dưới 5 phút; ghi `runtime_ms` mỗi lần xếp tự động  
**Constraints**: Một cửa hàng/lịch; tuần bắt đầu Thứ 2; ngày địa phương `Asia/Ho_Chi_Minh`, timestamp UTC; không vi phạm H1–H9 đang bật; tổng giờ tuần đọc phân công hiệu lực ở mọi cửa hàng mà không lộ lịch cửa hàng khác; duyệt nghỉ và ghi phân công cùng khóa hàng người dùng trước khi đọc dữ liệu quyết định  
**Scale/Scope**: MVP một cửa hàng/tuần, khoảng 30 nhân viên; greedy heuristic và cải thiện cục bộ; chưa có CP-SAT, đổi ca, thông báo hay AI

## Constitution Check

*GATE: kiểm tra trước nghiên cứu và sau thiết kế.*

- `.specify/memory/constitution.md` là template chưa ratify, nên chưa có nguyên tắc dự án cụ thể để dùng làm gate.
- Gate từ PRD/spec: quyền theo vai trò/cửa hàng ở server; không công bố vi phạm cứng; giữ lịch sử chỉnh lịch; bảo vệ dữ liệu cửa hàng khác; giữ phạm vi MVP.
- **Trước nghiên cứu**: đạt theo PRD/spec; các quyết định còn mở được giải quyết trong [research.md](research.md).
- **Sau thiết kế**: đạt theo [data-model.md](data-model.md), [contracts](contracts/) và [quickstart.md](quickstart.md).

## Project Structure

### Documentation

```text
specs/001-shift-scheduling/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
├── contracts/
│   ├── scheduling-api.openapi.yaml
│   └── leave-integration.md
└── checklists/requirements.md
```

`tasks.md` là đầu ra của bước `/speckit-tasks`, sau khi plan hoàn tất.

### Source Code (repository root)

```text
src/
├── app/
│   ├── (employee)/availability/
│   ├── (employee)/schedule/
│   ├── (manager)/stores/[storeId]/schedules/
│   └── api/
│       ├── me/availability-rules/
│       ├── me/availability-exceptions/
│       ├── me/shift-preferences/
│       ├── stores/[storeId]/schedules/
│       └── schedules/[scheduleId]/
├── server/
│   ├── auth/                  # từ spec 002
│   ├── scheduling/            # quyền, slot, validator, solver, phiên bản
│   └── leave/                 # contract từ spec 003
└── db/
    ├── schema/scheduling.ts
    └── migrations/
```

**Structure Decision**: Cùng Next.js app và PostgreSQL với các feature khác. Scheduling sở hữu lịch/slot/phân công; leave cung cấp khoảng nghỉ đã duyệt và cập nhật `needs_cover` qua cùng DB transaction. Không tạo service Python cho MVP.

## Phase 0: Research Decisions

1. Greedy xếp slot ít ứng viên trước, chấm điểm nguyện vọng và giờ mục tiêu, rồi cải thiện cục bộ có giới hạn thời gian. Mọi kết quả dùng chung validator H1–H9; slot không thể phủ giữ trống với lý do.
2. Ngoại lệ khả dụng ghi đè phần thời gian giao quy tắc lặp lại trong ngày; nghỉ đã duyệt luôn chặn, nguyện vọng không mở khóa giờ bận. Ca qua đêm kiểm bằng khoảng timestamp thực.
3. Hạn đăng ký lấy từ cấu hình cửa hàng trong tuần trước tuần cần xếp; mặc định Chủ nhật 20:00. Sau hạn, từ chối thay đổi nguyện vọng.
4. Khi sửa lịch đã công bố, lưu snapshot phiên bản hiện hành cùng lý do vào `schedule_revisions`, tăng `schedules.version`, rồi sửa phân công hiện hành trong một giao dịch. Không nhân đôi hàng phân công `assigned`, tránh xung đột ràng buộc chống trùng ca; lịch sử nằm ở snapshot.
5. Kiểm tra giờ tuần đọc phân công `assigned` ở mọi cửa hàng của nhân viên; quản lý chỉ nhận tổng giờ/kết luận cần thiết, không nhận chi tiết lịch cửa hàng khác. `needs_cover` không tính độ phủ/giờ.
6. Duyệt nghỉ, xếp tự động, chỉnh phân công và công bố cùng khóa hàng `users` của nhân viên liên quan theo thứ tự UUID tăng dần trước khi khóa lịch/đơn và đọc dữ liệu nghỉ; sau khi chờ khóa phải đọc lại trạng thái mới nhất. Như vậy duyệt nghỉ và lưu lịch cho cùng người không thể bỏ qua nhau.

Chi tiết và phương án khác ở [research.md](research.md).

## Phase 1: Design and Contracts

1. [Data model](data-model.md) giữ bảng PRD về khả dụng, nguyện vọng, lịch, slot, phân công, lần chạy; thêm `schedule_revisions` và audit lý do. Migration `0002_scheduling.sql` của feature này tạo `shift_assignments` ngay với predicate `status = 'assigned'`; feature `003` không tạo migration sửa lại bảng này.
2. [API contract](contracts/scheduling-api.openapi.yaml) quy định nhập liệu nhân viên, đọc tổng hợp, tạo/xếp/kiểm tra/chỉnh/công bố lịch và đọc lịch của mình. Endpoint ghi kiểm tra quyền và trạng thái mới nhất.
3. [Leave integration](contracts/leave-integration.md) quy định khoảng nghỉ đã duyệt, ca qua đêm, `needs_cover` và ranh giới giao dịch với spec `003`.
4. [Quickstart](quickstart.md) nêu dữ liệu mẫu, kịch bản nghiệm thu và cách đo SC-001–SC-007.
5. Cập nhật `AGENTS.md` trỏ đến plan của feature `001`.

## Complexity Tracking

Không có vi phạm constitution. Snapshot revision cần để giữ lịch sử chỉnh lịch mà không tạo phân công trùng giờ ở bản cũ/mới.

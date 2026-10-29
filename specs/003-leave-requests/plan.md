# Implementation Plan: Xin nghỉ phép và duyệt đơn

**Branch**: `003-leave-requests` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-leave-requests/spec.md`

## Summary

Xây luồng nhân viên gửi, theo dõi và hủy đơn nghỉ; quản lý duyệt hoặc từ chối trong cửa hàng; admin quản lý loại nghỉ. Dữ liệu nghỉ đã duyệt được dùng làm ràng buộc của lịch tuần. Một ứng dụng Next.js/TypeScript dùng PostgreSQL, kiểm tra quyền và trạng thái ở server, lưu tệp trong kho riêng. Các quyết định kỹ thuật và nguồn tham khảo nằm trong [research.md](research.md).

## Technical Context

**Cập nhật 2026-10-28**: Nhân viên gửi đơn tại cửa hàng gốc duy nhất; quản lý trực tiếp của họ xét duyệt. Nghỉ đã duyệt chặn phân công và chuyển ca đã công bố bị ảnh hưởng sang `needs_cover` ở mọi cửa hàng nơi nhân viên nhận ca.

**Language/Version**: TypeScript 5.x, Node.js 22 LTS  
**Primary Dependencies**: Next.js App Router, React, Zod, Drizzle ORM; sử dụng xác thực/phiên từ tính năng nền tảng  
**Storage**: PostgreSQL cho đơn/loại nghỉ/audit; kho tệp riêng qua adapter (volume riêng khi phát triển, private object storage khi triển khai)  
**Verification**: Nghiệm thu thủ công theo [quickstart.md](quickstart.md), ghi kết quả cho SC-001–SC-006; Vitest, PostgreSQL integration tests và Playwright là hướng bổ sung khi có yêu cầu viết test  
**Target Platform**: Trình duyệt điện thoại và máy tính; ứng dụng Node.js chạy trong Docker hoặc môi trường hỗ trợ Next.js Route Handlers  
**Project Type**: Web application với giao diện và điểm vào dữ liệu cùng một codebase  
**Performance Goals**: Danh sách/chi tiết đơn hiện trong dưới 1 giây ở mức demo; thao tác gửi hoặc xét duyệt trả kết quả trong dưới 2 giây với tệp không quá 4 MB, không tính thời gian mạng tải tệp  
**Constraints**: Một cửa hàng trên mỗi đơn; ngày nghỉ trọn ngày theo múi giờ cửa hàng; một tệp tối đa 4 MB; không mở URL tệp công khai; xử lý đồng thời và đơn trùng ngày ở tầng dữ liệu  
**Scale/Scope**: Demo một cửa hàng với khoảng 30 nhân viên và vài trăm đơn/năm; cấu trúc quyền vẫn cho admin làm việc với nhiều cửa hàng theo PRD

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- File `.specify/memory/constitution.md` hiện là template chưa được điền/ratify, nên chưa có nguyên tắc dự án có thể kiểm tra như một gate bắt buộc.
- Các yêu cầu có hiệu lực từ PRD và spec được áp dụng làm gate: quyền theo vai trò/cửa hàng ở server; dữ liệu cá nhân và tệp riêng tư; quyết định duyệt có dấu vết; ràng buộc ngày/trạng thái không bị phá khi có yêu cầu đồng thời; không triển khai đổi ca, thông báo hay xử lý nghỉ gộp nhiều chi nhánh.
- **Trước nghiên cứu:** Constitution gate chưa áp dụng vì file vẫn là template; kiểm tra yêu cầu PRD/spec đạt, các lựa chọn kỹ thuật được giải quyết trong [research.md](research.md).
- **Sau thiết kế:** Constitution gate chưa áp dụng vì file vẫn là template; kiểm tra yêu cầu PRD/spec đạt qua [data-model.md](data-model.md), [contracts](contracts/) và [quickstart.md](quickstart.md).

## Project Structure

### Documentation (this feature)

```text
specs/003-leave-requests/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
├── contracts/
│   ├── leave-api.openapi.yaml
│   └── scheduling-integration.md
└── checklists/
    ├── requirements.md
    └── leave-workflow.md
```

`acceptance-results.md` sẽ được tạo ở T052 khi có ứng dụng để nghiệm thu thực tế.

### Source Code (repository root)

```text
src/
├── app/
│   ├── (employee)/leave/
│   ├── (manager)/stores/[storeId]/leave/
│   ├── (admin)/leave-types/
│   └── api/
│       ├── leave-types/
│       └── leave-requests/
├── server/
│   ├── auth/                 # từ spec nền tảng
│   ├── leave/                # quyền, quy tắc, giao dịch và tác động lịch
│   ├── storage/              # adapter tệp riêng tư
│   └── scheduling/           # contract tích hợp từ spec lập lịch
└── db/
    ├── schema/
    └── migrations/

```

**Structure Decision**: Repo hiện mới có tài liệu, chưa có source code. Dùng một ứng dụng Next.js theo PRD; các thư mục trên là cấu trúc sẽ tạo khi triển khai. Module leave sở hữu đơn, loại nghỉ và tệp; module scheduling sở hữu phân công ca. Module leave gọi contract scheduling khi một quyết định ảnh hưởng lịch đã công bố.

## Phase 0: Research Decisions

- Chọn một ứng dụng Next.js với Route Handlers và lớp nghiệp vụ server; quyền không phụ thuộc vào việc ẩn nút trên giao diện.
- Chọn PostgreSQL + migration SQL để chặn đơn trùng ngày ở tầng dữ liệu, cập nhật trạng thái có điều kiện trong giao dịch.
- Chọn tệp riêng tư, tối đa 4 MB, đọc qua điểm vào có kiểm tra quyền.
- Áp dụng quy tắc PRD cho nghỉ trùng lịch đã công bố: duyệt và chuyển ca chưa kết thúc liên quan sang `needs_cover` qua module lịch. `needs_cover` giữ lịch sử người ban đầu nhưng không còn tính vào lịch làm việc hiệu lực, giờ dự kiến hoặc độ phủ.

Chi tiết và các lựa chọn đã loại có trong [research.md](research.md); không còn quyết định kỹ thuật bỏ ngỏ cho kế hoạch này.

## Phase 1: Design and Contracts

1. Giữ hai thực thể chính của PRD là loại nghỉ và đơn nghỉ. Thêm ràng buộc chống trùng khoảng ngày ở trạng thái chờ/đã duyệt; giữ khóa tệp riêng trong trường đính kèm hiện có. [Data model](data-model.md) mô tả validation, chỉ mục, trạng thái và giao dịch.
2. Cung cấp contract đọc loại nghỉ, gửi/xem/hủy đơn, duyệt/từ chối, xem tác động và tải tệp có kiểm tra quyền. [API contract](contracts/leave-api.openapi.yaml) quy định mã lỗi và giới hạn dữ liệu.
3. Định nghĩa contract với module lập lịch cho ngày nghỉ đã duyệt, ca qua đêm, `needs_cover` và hủy đơn đã duyệt trong [scheduling-integration.md](contracts/scheduling-integration.md). Bảng phân công cùng predicate hiệu lực do migration `0002_scheduling.sql` của feature `001` sở hữu.
4. [Quickstart](quickstart.md) mô tả cấu hình tối thiểu, dữ liệu mẫu, cách nghiệm thu theo vai trò và mẫu ghi kết quả cho các tiêu chí thành công.
5. Cập nhật phần Spec Kit được quản lý trong `AGENTS.md` để trỏ đến kế hoạch này.

## Complexity Tracking

Không có vi phạm constitution cần giải trình. Ràng buộc loại trừ và kho tệp riêng là yêu cầu trực tiếp để bảo toàn dữ liệu và quyền riêng tư của tính năng.

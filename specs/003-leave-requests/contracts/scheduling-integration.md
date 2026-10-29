# Contract: Nghỉ phép ↔ lập lịch tuần

**Chủ sở hữu dữ liệu:** Module nghỉ sở hữu trạng thái đơn; module lịch sở hữu slot, phân công và trạng thái `needs_cover`. Giao tiếp dùng cùng nguồn dữ liệu PostgreSQL và một lớp dịch vụ nội bộ, không gọi HTTP vòng qua chính ứng dụng.

## 1. Dữ liệu khả dụng cho bộ xếp lịch

Module lịch nhận tập `(user_id, store_id, start_date, end_date)` của đơn `approved` khi tạo, chạy lại hoặc kiểm tra lịch. Các trạng thái khác không có hiệu lực nghỉ phép. Khoảng ngày bao gồm cả hai ngày biên và được hiểu theo múi giờ cửa hàng.

Để kiểm tra ca, đổi ngày nghỉ thành `[00:00 start_date, 00:00 ngày sau end_date)` theo múi giờ cửa hàng. Ca có `[start_at, end_at)` giao với khoảng này không được gán cho người đó, kể cả ca bắt đầu hôm trước và kết thúc trong ngày nghỉ.

**Bảo đảm:** Module lịch khóa hàng `users` của nhân viên liên quan theo UUID tăng dần trước khi khóa lịch/đơn, rồi đọc lại dữ liệu nghỉ mới nhất trong giao dịch xác nhận phân công/công bố. Dữ liệu đọc trước khi lấy khóa không được dùng để bỏ qua kiểm tra cuối. Module leave dùng cùng thứ tự khóa khi duyệt.

## 2. Xem tác động trước khi xét duyệt

Module nghỉ gọi hàm đọc của module lịch với `store_id`, `user_id` và khoảng ngày. Kết quả gồm các phân công giao khoảng nghỉ, trạng thái lịch và thời gian ca. Chỉ quản lý đúng cửa hàng hoặc admin được xem tác động. Nếu chưa có lịch, trả danh sách rỗng.

## 3. Duyệt đơn trùng lịch đã công bố

Theo quy tắc PRD áp dụng cho feature này, duyệt đơn không bị chặn vì đã có phân công. Trước quyết định, khóa hàng `users` của người gửi rồi khóa các lịch liên quan và đọc lại trạng thái đơn. Trong cùng giao dịch:

1. Module nghỉ chuyển đơn `pending → approved` nếu người xét duyệt còn quyền.
2. Module lịch chuyển phân công đã công bố giao ngày nghỉ từ `assigned` sang `needs_cover` nếu ca chưa kết thúc tại thời điểm duyệt (`end_at > reviewed_at`); không xóa phân công hoặc tự gán người thay. Ca đã kết thúc giữ nguyên lịch sử.
3. Với mỗi lịch đã công bố bị ảnh hưởng, module lịch lưu snapshot phiên bản trước, ghi lý do hệ thống `approved_leave:<leave_request_id>`, tăng version và audit; module nghỉ ghi lịch sử quyết định và số ca bị ảnh hưởng.

`needs_cover` giữ `user_id` của người được xếp ban đầu để truy vết, nhưng không còn là phân công đang làm của họ: loại khỏi lịch làm việc đang hiệu lực, tổng giờ dự kiến và độ phủ nhân sự. Màn hình quản lý vẫn thấy ca thiếu người cùng người được xếp ban đầu trong lịch sử. Khi chọn người thay, module lịch tạo/xác nhận phân công hợp lệ theo spec lịch tuần; không coi dòng `needs_cover` là người đang phủ ca.

Module lịch của feature `001` tạo `shift_assignments` bằng migration `0002_scheduling.sql` với predicate loại trừ `status = 'assigned'`, để ca `needs_cover` không chiếm giờ của người ban đầu. Feature `003` không tạo migration hoặc dịch vụ sửa phân công riêng. Giữ ràng buộc `UNIQUE (slot_id, user_id)`; nếu gán lại chính người đó sau khi hủy đơn, module lịch xử lý trạng thái dòng cũ theo quy trình sửa lịch trước khi xác nhận.

Nếu bất kỳ bước nào thất bại, giao dịch quay lại toàn bộ. Các ca trong bản nháp được kiểm tra lại trước khi lưu/công bố theo spec lịch tuần.

## 4. Hủy đơn đã duyệt

Khi người gửi hủy trước ngày nghỉ đầu tiên, đơn chuyển `approved → cancelled`. Lần lập lịch/kiểm tra kế tiếp không còn dùng khoảng nghỉ đó. Không tự đổi `needs_cover → assigned`, vì ca có thể đã được xử lý thủ công hoặc nhận người thay. Quản lý xử lý lại ca qua chức năng lịch tuần.

## 5. Ranh giới phạm vi

Contract này không tạo thông báo, đổi ca, gợi ý người thay, hay hỗ trợ một đơn nghỉ cho nhiều cửa hàng. Module nghỉ chỉ hiển thị tác động và thay đổi trạng thái đơn; giao diện/chính sách sửa lịch do [spec lập lịch](../../001-shift-scheduling/spec.md) quyết định.

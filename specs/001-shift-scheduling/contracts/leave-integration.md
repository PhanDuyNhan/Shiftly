# Contract: Lập lịch tuần ↔ nghỉ phép

**Nguồn quyền sở hữu:** Module leave sở hữu `leave_requests`; module scheduling sở hữu `schedules`, `shift_slots`, `shift_assignments`. Dùng cùng PostgreSQL transaction qua lớp dịch vụ nội bộ. Xem [contract gốc của spec `003`](../../003-leave-requests/contracts/scheduling-integration.md).

## Khi tạo, sửa, chạy lại hoặc công bố lịch

1. Lấy đơn `approved` của người và cửa hàng liên quan, chuyển ngày nghỉ trọn vẹn thành khoảng `[00:00 start_date, 00:00 ngày sau end_date)` theo múi giờ cửa hàng.
2. So với `[shift_slots.start_at, shift_slots.end_at)` bằng timestamp thực; ca qua đêm giao ngày nghỉ cũng bị chặn.
3. Khóa hàng `users` của nhân viên liên quan theo UUID tăng dần trước khi khóa lịch/đơn và đọc lại dữ liệu nghỉ trong cùng giao dịch xác nhận phân công/công bố. `pending`, `rejected`, `cancelled` không chặn ca.
4. Không tính `shift_assignments.status = needs_cover` là phân công đang làm, độ phủ, giờ dự kiến hoặc ca chồng giờ của người ban đầu. Giữ dòng đó ở danh sách ca cần người của quản lý.

## Khi duyệt đơn trùng lịch đã công bố

Module leave khóa hàng `users` của người gửi trước, rồi mới khóa lịch/đơn và kiểm tra lại trạng thái `pending`; module này gọi dịch vụ scheduling trong cùng transaction với quyết định duyệt. Dịch vụ tìm phân công `assigned` trên lịch đã công bố giao khoảng nghỉ và chưa kết thúc tại `reviewed_at`, chuyển sang `needs_cover`, giữ người ban đầu để truy vết. Với mỗi lịch công bố bị ảnh hưởng, dịch vụ lưu snapshot phiên bản trước, ghi lý do hệ thống `approved_leave:<leave_request_id>`, tăng version và audit trong cùng transaction; không cần quản lý nhập lý do cho quyết định leave. Ca đã kết thúc giữ nguyên. Bất kỳ lỗi cập nhật nào làm rollback cả quyết định duyệt. Không tự gán người thay hoặc gửi thông báo.

Nếu sau đó quản lý sửa ca cần người trên lịch đã công bố, quy trình chỉnh lịch của feature `001` yêu cầu lý do, snapshot phiên bản trước, validator và tăng version. Nếu người gửi hủy đơn đã duyệt trước ngày bắt đầu, không tự đổi `needs_cover` về `assigned`.

## Ràng buộc DB và quyền

Migration `0002_scheduling.sql` của feature `001` tạo predicate chống trùng giờ `status = 'assigned'` ngay khi tạo bảng; feature `003` không sửa ràng buộc này. Phiên bản lịch cũ được lưu dưới dạng snapshot, không tạo thêm dòng `assigned` trùng giờ. Quản lý chỉ thấy tác động/lịch của cửa hàng mình; kiểm tra giờ liên chi nhánh chạy ở server và chỉ trả tổng giờ hoặc mã vi phạm.

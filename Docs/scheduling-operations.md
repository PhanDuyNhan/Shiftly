# Vận hành lịch ca tuần

- Migration `0002_scheduling.sql` tạo lịch, slot, phân công, khả dụng, nguyện vọng, lần chạy và revision. Chỉ `shift_assignments.status='assigned'` chiếm giờ và bị ràng buộc chống trùng; `needs_cover` giữ dấu vết người ban đầu nhưng không tính độ phủ hoặc lịch làm việc hiệu lực.
- `db:seed:scheduling-demo` tạo hai cửa hàng, ca qua đêm, phân công pinned, nghỉ đã duyệt và ca ở cửa hàng B. Chạy lại không nhân đôi. Dữ liệu này chỉ dành cho môi trường phát triển.
- Solver giữ ca pinned. Nếu dữ liệu mới khiến pinned vi phạm ràng buộc, chạy lại trả `409` và không thay draft. Slot thiếu được giữ trống với `missing_count` và mã lý do; không gán người không hợp lệ để lấp thiếu.
- `validate` chạy lại bộ kiểm tra ràng buộc trước công bố. Vi phạm cứng chặn công bố; thiếu `min_count` là cảnh báo để quản lý xử lý. Mỗi lần xếp lưu score, runtime, cảnh báo và số giờ theo người trong `schedule_runs`.
- Sửa lịch đã công bố cần `expected_version` và lý do. Dịch vụ lưu snapshot vào `schedule_revisions` trước khi đổi phân công, tăng version và audit trong cùng giao dịch. Version cũ trả `409`; tải lại lịch rồi thử lại trên version mới.
- Khi nghỉ đã duyệt giao ca published chưa kết thúc, dịch vụ scheduling chuyển `assigned` sang `needs_cover` cùng giao dịch duyệt. Quản lý xem ca thiếu người và xếp người thay bằng thao tác chỉnh lịch có lý do. Hủy nghỉ không tự phục hồi phân công cũ.
- Giao dịch ghi lịch khóa hàng `users` theo UUID tăng dần trước khi khóa lịch/đơn. Kiểm tra nghỉ sau khi có khóa. Truy vấn giờ liên chi nhánh chỉ dùng để xét giới hạn; phản hồi quản lý không chứa chi tiết lịch cửa hàng khác.

# Vận hành nghỉ phép

- Đơn mới chỉ chấp nhận nhân viên có membership còn hiệu lực tại cửa hàng và loại nghỉ đang hoạt động. `user_id` lấy từ phiên. PostgreSQL chặn đơn `pending`/`approved` giao ngày bằng ràng buộc loại trừ; API trả `409`.
- Tệp PDF/JPEG/PNG tối đa 4 MB được kiểm tra phần mở rộng, dung lượng và chữ ký; lưu ngoài `public/` bằng khóa ngẫu nhiên. Endpoint tải kiểm tra quyền trên mỗi lần đọc và trả `Cache-Control: private, no-store`.
- Nếu tạo đơn thất bại sau khi lưu tệp, dịch vụ xóa bù. Nếu xóa bù thất bại, chạy `npm run attachments:cleanup` trong môi trường có quyền kho tệp; lệnh chỉ xóa tệp không còn tham chiếu và cũ hơn một giờ. Kiểm tra log `Orphaned leave attachment` để xác định khóa cần xử lý.
- Duyệt/từ chối chỉ chuyển từ `pending`; quyết định đồng thời hoặc hủy trước quyết định làm yêu cầu sau nhận `409`. Khi từ chối, ghi chú bắt buộc. Quyết định và audit nằm cùng giao dịch.
- Duyệt nghỉ khóa hàng người gửi trước khi khóa lịch/đơn. Phân công đã công bố giao ngày nghỉ và chưa kết thúc chuyển `needs_cover`, tạo revision hệ thống và tăng version cùng giao dịch; lỗi bất kỳ rollback cả quyết định. Không tự tìm người thay. Hủy đơn đã duyệt trước ngày bắt đầu bỏ chặn cho lần xếp sau nhưng không tự khôi phục ca `needs_cover`.
- Ngày nghỉ là ngày địa phương của cửa hàng, bao gồm hai biên. Ca qua đêm được so bằng khoảng timestamp thực. Sau khi nhân viên nghỉ việc, quản lý hiện tại của cửa hàng gốc và admin vẫn xem được đơn/tệp lịch sử.

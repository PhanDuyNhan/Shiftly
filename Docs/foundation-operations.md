# Vận hành nền tảng

- Migration `0000_foundation.sql` tạo cửa hàng, tài khoản, membership, vị trí/kỹ năng, ca mẫu, nhu cầu, cấu hình, audit và bảng phiên. Chạy trước migration nghỉ và lịch.
- `db:seed:admin` tạo admin đầu tiên bằng biến môi trường; không in mật khẩu. Tài khoản mới và tài khoản vừa đặt lại mật khẩu phải đổi mật khẩu tạm trước khi dùng chức năng khác.
- Khóa hoặc ghi nhận nghỉ việc làm phiên cũ bị từ chối từ yêu cầu kế tiếp vì mỗi yêu cầu đọc lại `users.status`. Thu hồi quản lý có hiệu lực tương tự qua membership.
- Quản lý ghi nhận nghỉ việc đặt `users.status='left'` trên toàn hệ thống và `left_at` tại cửa hàng gốc. Chỉ quản lý đã ghi nhận sự kiện, khi vẫn còn quyền tại cửa hàng đó, hoặc admin có thể khôi phục. Audit giữ người, thời điểm và dữ liệu trước/sau.
- Sau 5 lần nhập sai cùng định danh trong cửa sổ 15 phút, đăng nhập bị chặn 15 phút. Thông báo sai mật khẩu không xác nhận tài khoản tồn tại. Kiểm tra `login_attempts` khi điều tra; không xóa bản ghi trên môi trường thật nếu chưa xác định nguyên nhân.
- Mã cửa hàng, tên vị trí, định danh đăng nhập và tổ hợp nhu cầu có ràng buộc duy nhất ở DB. API trả `409` khi trùng. Nhu cầu âm hoặc lý tưởng thấp hơn tối thiểu trả `422`.

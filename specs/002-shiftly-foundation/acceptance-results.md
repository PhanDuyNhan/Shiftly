# Kết quả nghiệm thu nền tảng

Ngày kiểm tra: 2026-10-28. Môi trường: Next.js production build và PostgreSQL cục bộ `shiftly_codex_dev`; mỗi script dùng admin thử nghiệm riêng. `smoke-foundation` chạy 1 lượt sau bổ sung kiểm tra trong 1,83 giây; `smoke-security` chạy 1 lượt trong 2,18 giây (thời gian lệnh, không phải thời gian thao tác người dùng).

| Tiêu chí | Số lần / kết quả thực tế | Trạng thái |
| --- | --- | --- |
| SC-001, từ chối mọi thao tác ngoài quyền | Script kiểm tra quyền chéo cửa hàng, vai trò nhân viên, CSRF và thu hồi quản lý; các trường hợp thử đều bị từ chối | Đạt trong phạm vi mẫu; cần rà soát mọi endpoint |
| SC-002, buộc đổi mật khẩu tạm | 2 tài khoản thử đăng nhập và bị chặn khỏi dữ liệu cho đến khi đổi mật khẩu | Đạt trong phạm vi mẫu |
| SC-003, admin thiết lập cửa hàng/quản lý/vị trí trong 5 phút | API tạo cửa hàng và vị trí hoạt động; chưa đo luồng giao diện đầy đủ | Chưa nghiệm thu |
| SC-004, tạo nhân viên/kỹ năng trong 3 phút | 1 luồng API tạo nhân viên và kỹ năng thành công; chưa đo thao tác quản lý | Chưa nghiệm thu |
| SC-005, cấu hình ba ca/nhu cầu trong 5 phút | API tạo ca mẫu và nhu cầu hoạt động; chưa đo đủ ba ca qua giao diện | Chưa nghiệm thu |
| SC-006, từ chối cấu hình nhu cầu sai | Script thử 1 số âm, 1 lý tưởng thấp hơn tối thiểu, 1 tổ hợp trùng; cả 3 bị từ chối | Đạt trong phạm vi mẫu |
| SC-007, ≥90% người tham gia hoàn thành lần đầu | Chưa có người tham gia đánh giá | Chưa nghiệm thu |
| SC-008, giữ lịch sử mục ngừng dùng | Script ngừng dùng 1 cửa hàng, 1 vị trí rồi đọc lại cả hai; `smoke-security` kiểm khóa/nghỉ việc/khôi phục tài khoản | Đạt trong phạm vi mẫu |

Lỗi còn mở / giới hạn bằng chứng: các tiêu chí thời gian và khả dụng cần người tham gia; các khẳng định 100% cần bộ kiểm thử đầy đủ hơn mẫu hiện có.

# Kết quả nghiệm thu lập lịch ca

Ngày kiểm tra: 2026-10-28. Môi trường: Next.js production build, PostgreSQL cục bộ `shiftly_codex_dev`, múi giờ cửa hàng `Asia/Ho_Chi_Minh`. Dữ liệu thử được tạo bằng `db:seed:scheduling-demo` và các script trong `scripts/`. Mỗi script API được chạy lại sau build cuối; `smoke-scheduling` hoàn tất trong 2,30 giây và `smoke-demo` trong 0,50 giây (thời gian lệnh, không phải thời gian thao tác người dùng).

| Tiêu chí | Số lần / kết quả thực tế | Trạng thái |
| --- | --- | --- |
| SC-001, tạo đến công bố dưới 5 phút với tối đa 30 người | 1 luồng API tạo/xếp/công bố thành công trong 2,30 giây; fixture này ít hơn 30 người và chưa đo thao tác giao diện | Cần nghiệm thu người dùng với 30 người |
| SC-002, không vi phạm H1–H9 | 1 luồng công bố và 2 lượt xếp demo đi qua validator; không có vi phạm cứng ở lịch công bố. Chưa có ma trận thử riêng từng H1–H9 | Đạt trong phạm vi mẫu; cần ma trận đầy đủ |
| SC-003, nguyện vọng mức 1/2 ≥70% | Tuần khả thi `2026-11-09`: 5/5 phân công có nguyện vọng mức 2 (100%) theo truy vấn DB | Đạt trên fixture demo |
| SC-004, lệch giờ mục tiêu ≤15% | Tuần khả thi: 5 nhân viên có mục tiêu 6 giờ, mỗi người được xếp 6 giờ; độ lệch lớn nhất 0%. Quản lý thấy mục tiêu và giờ thực tế trong lần xếp | Đạt trên fixture demo |
| SC-005, slot thiếu có lý do | Tuần thiếu `2026-11-02`: 1 slot thiếu 1 người; cảnh báo ghi `busy`, `rest`, `leave`, `skill` cùng số ứng viên bị loại | Đạt trên fixture demo |
| SC-006, khai báo dưới 2 phút | Chưa đo thời gian thao tác của nhân viên trên điện thoại | Chưa nghiệm thu |
| SC-007, từ chối 100% truy cập ngoài quyền | 1 lượt `smoke-security` và 1 lượt `smoke-scheduling` kiểm tra các đường chéo cửa hàng và quyền; tất cả trường hợp trong script bị từ chối | Đạt trong phạm vi mẫu; cần rà soát mọi endpoint |

Ca qua đêm được kiểm trong `smoke-scheduling`; chỉnh lịch công bố ghi revision/version, version cũ trả xung đột; duyệt nghỉ chuyển ca giao ngày chưa kết thúc sang `needs_cover`. Fixture có ca pinned ở A và phân công của cùng người tại B. `smoke-demo` xác nhận tuần thiếu người và tuần phủ đủ. Lần xếp demo mới nhất ghi `runtime_ms` 289 ms, thấp hơn ngưỡng 5 phút nhưng chưa đại diện cho 30 người.

Lỗi còn mở / giới hạn bằng chứng: chưa có thử nghiệm giao diện với người dùng; chưa đo luồng 30 nhân viên; chưa chạy ma trận đầy đủ từng H1–H9 và mọi route. Không tuyên bố các tiêu chí đó đạt 100% từ số mẫu nhỏ.

## Cập nhật quan hệ quản lý và ca liên cửa hàng (2026-10-28)

Docker app tại `localhost:3000` và PostgreSQL tại cổng 5433 đang chạy; migration `0003_single_employee_manager` đã áp dụng. Kiểm tra DB cho thấy 0 nhân viên có hơn một cửa hàng gốc đang hiệu lực và 0 nhân viên đang hiệu lực thiếu quản lý trực tiếp. `smoke-preferences-home` xác nhận nhân viên chỉ gửi nguyện vọng ca của cửa hàng gốc, không gửi `store_id`. `smoke-cross-store` xác nhận quản lý B xếp Linh (thuộc A) vào ca tại B mà không tạo tư cách B. `smoke-cross-store-leave` xác nhận nghỉ do quản lý A duyệt chuyển ca B đã công bố sang `needs_cover`. `smoke-manager-ownership` xác nhận quản lý khác trong cùng cửa hàng không được xem/sửa nhân viên hoặc xét đơn của họ trước khi admin chuyển quản lý trực tiếp. Build, 6 unit test và `smoke-ready-accounts` đều đạt. Chưa có thử nghiệm giao diện do người dùng thực hiện.

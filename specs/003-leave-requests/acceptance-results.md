# Kết quả nghiệm thu nghỉ phép

Ngày kiểm tra: 2026-10-28. Môi trường: Next.js production build và PostgreSQL cục bộ `shiftly_codex_dev`; tài khoản admin thử nghiệm riêng cho mỗi lượt script. `smoke-leave` chạy 1 lượt sau bổ sung kiểm tra, hoàn tất trong 1,95 giây (thời gian lệnh, không phải thời gian thao tác người dùng).

| Tiêu chí | Số lần / kết quả thực tế | Trạng thái |
| --- | --- | --- |
| SC-001, ≥90% nhân viên gửi đơn hợp lệ dưới 2 phút trên điện thoại | 1 luồng API gửi thành công; chưa có nhóm nhân viên thử giao diện điện thoại | Chưa nghiệm thu |
| SC-002, quản lý quyết định dưới 1 phút | 1 luồng API xét duyệt thành công; chưa đo thời gian thao tác quản lý | Chưa nghiệm thu |
| SC-003, từ chối 100% ngoài phạm vi | Script kiểm tra tự duyệt, người khác đọc đơn/tệp, quyền chéo cửa hàng; các trường hợp được thử đều bị từ chối | Đạt trong phạm vi mẫu; cần rà soát mọi route |
| SC-004, chỉ nghỉ approved cản xếp ca và ca lịch sử không đổi | Script lịch thử duyệt nghỉ giao ca công bố, chuyển `needs_cover` và ghi revision; test đơn vị kiểm ranh giới ngày/ca qua đêm. Chưa có ma trận đủ bốn trạng thái trên mọi thao tác tạo/sửa/công bố | Đạt trong phạm vi mẫu; cần ma trận đầy đủ |
| SC-005, trạng thái/thời điểm và duyệt đồng thời | Script thử hủy, tự duyệt bị từ chối và hai quyết định đồng thời: một quyết định thắng, một xung đột | Đạt trong phạm vi mẫu |
| SC-006, tệp bắt buộc và loại cũ | Script thử thiếu tệp bị từ chối, gửi có tệp, ngừng dùng một loại nghỉ thử và đọc lại tên loại trên đơn cũ; loại đó không còn trong danh sách chọn của nhân viên | Đạt trong phạm vi mẫu |

Lỗi còn mở / giới hạn bằng chứng: chưa có thử nghiệm người dùng trên điện thoại, chưa đo thời gian ra quyết định và chưa chạy đủ ma trận quyền/trạng thái.

Cập nhật 2026-10-28: `smoke-manager-ownership` xác nhận chỉ quản lý trực tiếp được xem và duyệt đơn của nhân viên, kể cả khi có quản lý khác trong cùng cửa hàng. `smoke-cross-store-leave` xác nhận đơn nghỉ ở cửa hàng gốc sau khi duyệt cập nhật ca đã công bố tại cửa hàng khác sang `needs_cover`.

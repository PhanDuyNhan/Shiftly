# Quickstart: Xin nghỉ phép

Ứng dụng dùng Next.js và PostgreSQL. Cài đặt và cấu hình theo [README](../../README.md). Lệnh cục bộ:

```sh
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:seed:leave
npm run dev
```

Tạo admin bằng `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` và `npm run db:seed:admin`; admin tạo cửa hàng, quản lý và nhân viên trong giao diện. Đặt `DATABASE_URL`, `SESSION_SECRET`, `APP_ORIGIN`, `PRIVATE_ATTACHMENT_DIR` trong `.env.local` trước khi chạy. Tệp phải nằm ngoài `public/`.

## Điều kiện trước khi chạy

1. Hoàn thành tài khoản, vai trò và cửa hàng theo [spec nền tảng](../002-shiftly-foundation/spec.md): một admin, quản lý cửa hàng A, nhân viên A và quản lý cửa hàng B để kiểm tra quyền.
2. Có PostgreSQL và migration của `leave_types`, `leave_requests`, `audit_logs`, ràng buộc chống đơn trùng ngày trong [data-model.md](data-model.md).
3. Có kho tệp riêng tư; ứng dụng được cấu hình khóa truy cập kho, còn trình duyệt không nhận khóa đó.
4. Nếu kiểm tra tác động lên ca đã công bố, hoàn thành contract module lịch trong [scheduling-integration.md](contracts/scheduling-integration.md). Nếu chưa có lịch, phần xem tác động phải trả danh sách rỗng.

## Dữ liệu mẫu

- Cửa hàng A và B, mỗi cửa hàng có một quản lý; nhân viên Linh thuộc A.
- Chạy seed T014 để có Nghỉ phép năm (không cần tệp) và Nghỉ ốm (cần tệp). Admin tạo thêm một loại rồi ngừng sử dụng để kiểm tra lịch sử.
- Dùng tuần bắt đầu Thứ 2 ngày 2026-11-02 theo múi giờ `Asia/Ho_Chi_Minh`; Linh có một ca vào Thứ 7 ngày 2026-11-07 để xem tác động.

## Luồng nghiệm thu chính

1. Linh đăng nhập, chọn Nghỉ phép năm, nhập 2026-11-07 đến 2026-11-08, lý do và gửi. Kiểm tra đơn ở trạng thái chờ duyệt, hiển thị đúng hai ngày.
2. Quản lý A mở đơn và xem tác động. Ca Thứ 7 của Linh xuất hiện; quản lý B không xem được nội dung đơn hoặc tệp.
3. Quản lý A duyệt. Kiểm tra người/thời điểm duyệt được lưu; bộ lập lịch coi cả 07 và 08/11 là thời gian không thể xếp Linh. Ca đã công bố chưa kết thúc trùng nghỉ chuyển sang “cần người thay”: giữ Linh trong lịch sử nhưng không tính vào lịch hiệu lực, giờ dự kiến hoặc độ phủ; quản lý thấy ca thiếu người.
4. Tạo đơn Nghỉ ốm thiếu tệp, thiếu lý do, ngày kết thúc trước ngày bắt đầu, hoặc trùng ngày với đơn còn hiệu lực. Mỗi lần thử phải báo đúng lỗi và không tạo đơn.
5. Tạo đơn chờ khác, cho Linh hủy; quản lý không thể xét duyệt đơn đã hủy. Thử hủy đơn đã duyệt trước ngày bắt đầu rồi kiểm tra lịch lần sau không còn coi đó là ngày nghỉ.
6. Thử hai quản lý quyết định cùng một đơn chờ. Chỉ quyết định đầu tiên thành công; yêu cầu còn lại nhận xung đột, không ghi đè.
7. Admin ngừng sử dụng một loại nghỉ đã có đơn. Loại này không còn được chọn cho đơn mới, nhưng đơn cũ vẫn hiển thị đúng tên loại.
8. Gửi và duyệt một đơn có ngày đã qua hoặc đang diễn ra. Đơn được lưu cho hồ sơ; ca đã kết thúc không đổi, ca đã công bố chưa kết thúc giao ngày nghỉ chuyển sang “cần người thay”.
9. Cho nhân viên nghỉ việc sau khi đã gửi đơn có tệp. Xác nhận quản lý hiện tại của cửa hàng gốc và admin còn xem được tệp, người ngoài cửa hàng không xem được.

## Ghi kết quả nghiệm thu

T052 tạo `acceptance-results.md` trong thư mục feature. Với mỗi tiêu chí SC-001–SC-006, ghi ngày chạy, người/vai trò, dữ liệu, số lần thử, kết quả thực tế, đường dẫn bằng chứng và lỗi còn mở. Chỉ ghi “đạt” khi có kết quả quan sát được:

| Tiêu chí | Cách đo tối thiểu |
| --- | --- |
| SC-001 | Ít nhất 10 nhân viên thử độc lập trên điện thoại; ghi thời gian từng người và tỷ lệ gửi đúng trong dưới 2 phút. |
| SC-002 | Ít nhất 10 lần quản lý mở đơn chờ và ra quyết định; ghi thời gian từ lúc mở đến phản hồi. |
| SC-003 | Thử truy cập danh sách, chi tiết, tệp, quyết định từ tài khoản ngoài quyền ở cả hai cửa hàng; ghi số bị từ chối/tổng số. |
| SC-004 | Thử tạo, sửa, xác nhận ca với từng trạng thái đơn, hai ngày biên và ca qua đêm; xác nhận ca đã kết thúc không bị sửa và `needs_cover` không tính độ phủ/giờ. |
| SC-005 | Thử mọi chuyển trạng thái hợp lệ/không hợp lệ, ranh giới ngày bắt đầu và hai quản lý quyết định đồng thời; ghi số trường hợp đạt/tổng số. |
| SC-006 | Thử thiếu tệp bắt buộc và ngừng dùng loại đã có đơn; ghi số trường hợp đạt/tổng số. |

## Ranh giới nghiệm thu

Hoàn tất luồng trên không yêu cầu đổi ca, thông báo, gợi ý người thay hoặc đơn nghỉ trên nhiều chi nhánh. Việc sửa/công bố lại lịch được nghiệm thu trong spec lập lịch tuần.

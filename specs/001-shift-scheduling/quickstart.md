# Quickstart: Nghiệm thu lập lịch ca làm tuần

Ứng dụng đã có mã nguồn Next.js. Chuẩn bị môi trường theo [README](../../README.md), rồi chạy:

```sh
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:seed:leave
# Đặt DEMO_PASSWORD trong môi trường trước lệnh sau
npm run db:seed:scheduling-demo
npm run dev
```

Migration chạy theo thứ tự nền tảng → nghỉ phép → lịch ca. Fixture demo tạo cửa hàng `DEMO-A`, `DEMO-B`, quản lý A/B, sáu nhân viên (Linh, Minh, Mai, An, Binh, Ha), hai vị trí, ca qua đêm pinned ở A, nghỉ đã duyệt của Minh và ca tại B. Tuần 2026-11-02 là fixture thiếu người; tuần 2026-11-09 là fixture khả thi để xếp lại. Chạy seed lặp lại không nhân đôi dữ liệu. Tài khoản demo dùng mật khẩu tạm từ `DEMO_PASSWORD` và phải đổi khi đăng nhập.

Migration `0003_single_employee_manager.sql` đảm bảo mỗi nhân viên có một cửa hàng gốc cùng quản lý trực tiếp. Linh thuộc `DEMO-A` nhưng có thể nhận ca tại `DEMO-B`. Trang đăng ký ca của Linh tự hiện ca `DEMO-A`, không có bộ chọn cửa hàng.

## Điều kiện

1. Spec `002` cung cấp phiên đăng nhập, admin, quản lý cửa hàng A/B, nhân viên, kỹ năng, ca mẫu, nhu cầu và cấu hình giới hạn/hạn đăng ký.
2. Spec `003` cung cấp đơn nghỉ `approved` và contract `needs_cover`; migration `0002_scheduling.sql` của feature `001` tạo phân công với predicate hiệu lực `status = 'assigned'`.
3. PostgreSQL có các bảng trong [data-model.md](data-model.md), kể cả `schedule_revisions`, và audit log.

## Fixture demo

- Cửa hàng A có ba ca (sáng, chiều, tối; thêm một ca qua đêm để kiểm ranh giới), vị trí pha chế/thu ngân, nhu cầu tối thiểu/lý tưởng cho tuần bắt đầu Thứ 2 theo `Asia/Ho_Chi_Minh`.
- Ít nhất sáu nhân viên cho kịch bản xuyên suốt; bộ đo SC-001 dùng tối đa 30 nhân viên. Có người thiếu kỹ năng, người chạm giờ tuần, người có bận lặp lại/ngoại lệ, người có đơn nghỉ đã duyệt, một ca pinned và một nhân viên có phân công ở cửa hàng B.
- Hai fixture chất lượng: **khả thi** để đo độ lệch giờ và tỷ lệ nguyện vọng; **thiếu người** để kiểm slot trống và lý do.

## Luồng chính

1. Nhân viên khai báo bận lặp lại, ngoại lệ bận/rảnh và nguyện vọng ca trong tuần trước hạn. Xác nhận chỉ thấy/sửa dữ liệu của mình. Thử gửi nguyện vọng sau hạn Chủ nhật 20:00 của tuần trước, phải nhận lỗi và dữ liệu cũ giữ nguyên.
2. Quản lý A xem tổng hợp theo ngày/ca/vị trí; quản lý B thử truy cập cùng URL/API, bị từ chối. Tạo lịch nháp, kiểm tra slot từ nhu cầu đã cấu hình và ca qua đêm có timestamp đúng.
3. Chạy greedy. Kiểm tra `schedule_runs` có thời gian, điểm, số slot thiếu, cảnh báo/lý do và giờ mục tiêu/thực tế; ca pinned giữ nguyên. Với fixture thiếu người, slot thiếu vẫn trống. Tuần khả thi `2026-11-09` có năm slot sáng và năm nhân viên đủ kỹ năng với mục tiêu 6 giờ/tuần để đo SC-003/SC-004.
4. Thử xếp vào giờ bận, nghỉ đã duyệt, sai kỹ năng, trùng giờ, vượt giờ ngày/tuần, thiếu nghỉ giữa ca và vi phạm ngày nghỉ tuần. Validator từ chối từng thao tác; giờ liên chi nhánh được tính nhưng chi tiết cửa hàng B không lộ.
5. Công bố lịch hợp lệ; nhân viên chỉ thấy ca `assigned` của mình ở phiên bản mới nhất. Lịch nháp hoặc `needs_cover` không hiện là giờ làm hiệu lực.
6. Sửa lịch đã công bố: thiếu lý do bị từ chối; có lý do thì lưu snapshot version cũ, tăng version, audit và chỉ cho lưu nếu validator đạt. Thử `expected_version` cũ nhận xung đột.
7. Duyệt đơn nghỉ trùng ca đã công bố chưa kết thúc: ca chuyển `needs_cover`, độ phủ/giờ giảm, lịch tăng version với revision hệ thống và quản lý thấy ca cần người; ca đã kết thúc không đổi. Hủy đơn trước ngày nghỉ không tự phục hồi phân công cũ.
8. Cho quản lý bắt đầu lưu/công bố một ca của Linh cùng lúc quản lý khác duyệt đơn nghỉ của Linh giao ca đó. Dù thao tác nào hoàn tất trước, kết quả cuối không có phân công `assigned` giao nghỉ đã duyệt; quyết định còn lại đọc lại dữ liệu sau khi chờ khóa.

## Ghi kết quả SC-001–SC-007

Ghi ngày, fixture, số lần thử, thời gian đo, kết quả thực tế và lỗi còn mở. Chỉ ghi đạt khi có số liệu:

| Tiêu chí | Cách đo |
| --- | --- |
| SC-001 | Đồng hồ từ mở tạo lịch đến công bố với tối đa 30 nhân viên; dưới 5 phút. |
| SC-002 | Mọi phân công tạo/công bố chạy validator H1–H9; số vi phạm cứng bằng 0. |
| SC-003 | Trên fixture khả thi, phân công có đăng ký ca mức 1/2 chia cho tổng phân công có đăng ký ca; ít nhất 70%. |
| SC-004 | Nhóm cùng loại hợp đồng có `target_hours_week > 0`: độ lệch tối đa `abs(actual-target)/target` không quá 15%, hoặc báo mục tiêu/thực tế/lý do nếu không đạt. |
| SC-005 | Mọi slot thiếu trong fixture thiếu người có số thiếu và ít nhất một mã lý do kiểm chứng được. |
| SC-006 | Đo thời gian nhân viên khai báo khả dụng và nguyện vọng trong luồng thường; dưới 2 phút. |
| SC-007 | Thử truy cập chéo người/cửa hàng ở mọi API đọc/ghi; 100% bị từ chối. |

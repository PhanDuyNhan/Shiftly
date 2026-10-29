# Research: Lập lịch ca làm tuần

**Nguồn**: [spec.md](spec.md), PRD mục 4, 8, 9, 12–14, spec `002` và [contract nghỉ phép](../003-leave-requests/contracts/scheduling-integration.md). Repo hiện chỉ có tài liệu, chưa có mã nguồn.

## 1. Kiến trúc và solver

**Decision:** Một ứng dụng Next.js/TypeScript, PostgreSQL và lớp nghiệp vụ server. MVP dùng greedy: sắp slot theo số ứng viên hợp lệ tăng dần, chọn ứng viên theo điểm ưu tiên/nguyện vọng/thiếu giờ mục tiêu, rồi thử hoán đổi cục bộ nếu không làm hỏng ràng buộc. Ghi tham số, trạng thái, thời gian, cảnh báo và độ phủ vào `schedule_runs`.

**Rationale:** PRD §4.5 chọn greedy cho MVP; một validator chung giúp kết quả tự động, chỉnh tay và công bố tuân thủ cùng H1–H9. Ưu tiên phủ `min_count`, sau đó tối ưu đến `ideal_count`, không tạo phân công vượt `ideal_count`.

**Alternatives considered:** CP-SAT/Python service là hướng P1 của PRD, làm tăng thành phần triển khai; chỉ xếp theo nguyện vọng có thể vi phạm ràng buộc cứng.

## 2. Ràng buộc và giải thích slot thiếu

**Decision:** Validator kiểm tra bận/nghỉ đã duyệt, chồng giờ, kỹ năng, giờ/ngày, giờ/tuần, nghỉ giữa ca, ngày nghỉ liên tục 24 giờ, sức chứa slot và ca khóa. Trong MVP, có bản ghi `user_positions` với `skill_level` 1–5 là đủ cho vị trí; schema chưa có ngưỡng kỹ năng tối thiểu theo vị trí. Tổng giờ tuần gộp mọi cửa hàng dùng `max_hours_week` của tư cách cửa hàng gốc duy nhất; giờ/ngày dùng `max_hours_day` nhỏ nhất và nghỉ giữa ca dùng `min_rest_hours` lớn nhất của các cửa hàng có ca liên quan. Ca khóa xung đột dữ liệu mới khiến chạy lại/công bố bị chặn với lý do, không tự bỏ khóa. Với slot thiếu, lưu mã lý do và số ứng viên bị loại theo nguyên nhân; không trả dữ liệu cá nhân của cửa hàng khác.

**Rationale:** PRD H1–H9 không cho phép lấp nhu cầu bằng người không hợp lệ. Lý do kiểm chứng được là yêu cầu FR-009/SC-005.

**Alternatives considered:** Bỏ qua ca khóa hoặc chỉ trả thông báo chung làm sai kỳ vọng quản lý và không giải thích được kết quả.

## 3. Thời gian, khả dụng và hạn đăng ký

**Decision:** Tuần bắt đầu Thứ 2 theo `Asia/Ho_Chi_Minh`; lưu timestamp UTC. Quy tắc lặp lại dùng khoảng giờ trong cùng ngày; bận qua đêm nhập thành hai khoảng trên hai ngày. Ngoại lệ `busy`/`available` chỉ ghi đè phần giao với quy tắc lặp lại của ngày đó; `available` không bao giờ ghi đè nghỉ đã duyệt hay ràng buộc cứng khác. Nếu có quy tắc `available` cho ngày, ngoài các khoảng available/busy hợp lệ được coi là không khả dụng. Hạn đăng ký của tuần là thứ/giờ cấu hình trong tuần trước, mặc định Chủ nhật 20:00; server chỉ chặn ghi nguyện vọng sau hạn. Thay đổi lịch bận/ngoại lệ sau khi công bố không tự viết lại ca đã công bố, nhưng được dùng cho lần xếp/chỉnh/kiểm tra tiếp theo.

**Rationale:** Schema PRD giới hạn `availability_rules.end_time > start_time` và ca có thể qua đêm. Cách tính theo thời điểm thực tránh sai ở ranh giới ngày. Quy tắc deadline rõ ràng cho mọi thứ trong tuần.

**Alternatives considered:** So sánh riêng `work_date` bỏ lọt ca qua đêm; ngoại lệ thay cả ngày làm mất các khoảng bận khác.

## 4. Phiên bản lịch đã công bố

**Decision:** Giữ một `schedules` row hiện hành cho mỗi cửa hàng/tuần. Trước mỗi chỉnh sửa lịch đã công bố, ghi snapshot lịch/slot/phân công, lý do, người sửa, thời điểm vào `schedule_revisions` trong cùng giao dịch; tăng `schedules.version`, cập nhật phân công hiện hành và audit. Chỉ công bố kết quả sau khi validator chạy lại; phiên bản trước đọc từ snapshot. Không cho chỉnh sửa trực tiếp sau công bố mà thiếu lý do.

**Rationale:** DDL PRD có version nhưng không có cơ chế lưu bản cũ. Sao chép hai lịch với các phân công cùng `assigned` sẽ đụng `EXCLUDE` trên `(user_id, tstzrange)` ngay cả khi đổi predicate theo spec `003`. Snapshot tránh nhân đôi phân công hiệu lực mà vẫn giữ bằng chứng phiên bản.

**Alternatives considered:** Clone toàn bộ bảng lịch cần thêm cờ phiên bản hiệu lực và đổi ràng buộc DB/truy vấn trên mọi đường; sửa trực tiếp không snapshot làm mất lịch sử.

## 5. Tích hợp nền tảng và nghỉ phép

**Decision:** Dùng session/role/membership, kỹ năng, ca mẫu, nhu cầu và `store_settings` từ spec `002`. Quản lý chỉ đọc/sửa lịch cửa hàng mình; admin mọi cửa hàng. Validator đọc giờ tuần và khoảng nghỉ giữa ca từ mọi phân công `assigned` của nhân viên trên server, nhưng phản hồi chéo cửa hàng chỉ gồm kết luận/tổng giờ. Dùng đơn `approved` từ spec `003`; `needs_cover` là lịch sử cần người thay, không tính vào giờ, độ phủ hoặc lịch hiệu lực.

**Rationale:** Đáp ứng FR-008/FR-013 và contract của spec `003`, đồng thời không lộ chi tiết hoạt động cửa hàng khác.

**Alternatives considered:** Chỉ tính giờ của cửa hàng đang thao tác có thể vượt giới hạn tuần khi nhân viên có nhiều membership.

## 6. Phối hợp duyệt nghỉ và ghi lịch đồng thời

**Decision:** Mọi giao dịch duyệt nghỉ hoặc ghi/công bố phân công khóa hàng `users` của người liên quan bằng `SELECT ... FOR UPDATE` theo thứ tự UUID tăng dần, rồi mới khóa lịch/đơn; sau khi lấy khóa, đọc lại trạng thái nghỉ và lịch. Khi xếp tự động, khóa toàn bộ ứng viên của cửa hàng theo cùng thứ tự trước khi tính kết quả. Quyết định duyệt cập nhật ca đã công bố sang `needs_cover` trong chính giao dịch đó.

**Rationale:** Chỉ “đọc dữ liệu mới nhất trong cùng transaction” ở mức mặc định không ngăn lịch được ghi sau một lần duyệt nghỉ đồng thời. Khóa cùng hàng người dùng buộc hai luồng đi theo thứ tự: lịch ghi trước thì duyệt nghỉ xử lý ca vừa có; nghỉ duyệt trước thì lần ghi lịch sau thấy trạng thái `approved` và từ chối ca giao ngày nghỉ.

**Alternatives considered:** Chỉ khóa hàng lịch không đồng bộ với đơn nghỉ của cùng người; chỉ dựa vào ràng buộc trùng ca DB không chặn ca giao ngày nghỉ.

## 7. Nghiệm thu

**Decision:** Quickstart dùng fixture khả thi và bất khả thi riêng, ghi thời gian tạo/công bố, tỷ lệ ca theo nguyện vọng, độ lệch giờ, số slot thiếu có lý do và toàn bộ yêu cầu ngoài quyền. Chỉ đánh dấu chỉ số đạt khi có kết quả đo thực tế.

**Rationale:** SC-001–SC-007 là chỉ số đo, không thể suy ra đạt từ thiết kế hoặc từ một ảnh giao diện.

**Alternatives considered:** Chỉ kiểm tra HTTP thành công không xác nhận ràng buộc hoặc chất lượng lịch.

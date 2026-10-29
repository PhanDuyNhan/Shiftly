# Data Model: Lập lịch ca làm tuần

**Nguồn:** PRD §8.3 và [spec.md](spec.md). Bảng tài khoản/cửa hàng/vị trí/kỹ năng/ca mẫu/nhu cầu/cấu hình do spec `002` sở hữu; `leave_requests` do spec `003` sở hữu. Feature này tạo migration cho bảng lịch và snapshot phiên bản.

## Khả dụng và nguyện vọng

| Bảng | Trường và quy tắc |
| --- | --- |
| `availability_rules` | `user_id`, `weekday` 1–7, `start_time < end_time`, `kind` busy/available, `valid_from`, `valid_to`, `reason`. Khoảng giờ trong cùng ngày; bận qua đêm là hai bản ghi theo ngày. |
| `availability_exceptions` | `user_id`, `on_date`, `start_time/end_time` cùng null cho cả ngày hoặc cả hai có giá trị và `end_time > start_time`, `kind`, `reason`. Ngoại lệ ghi đè quy tắc lặp lại chỉ trên phần giao theo ngày. |
| `shift_preferences` | `user_id`, `store_id`, `work_date`, `shift_template_id`, `preference` -1/1/2, `submitted_at`; duy nhất `(user_id, work_date, shift_template_id)` như PRD. Ngày phải thuộc tuần được gửi, ca mẫu đúng cửa hàng và còn hoạt động. |

`availability_rules` và `availability_exceptions` gắn người dùng, không gắn cửa hàng trong schema PRD. API chỉ cho chính người đó ghi/đọc; khi lập lịch, server chỉ áp dụng cho membership đang hiệu lực. Nghỉ `approved` chặn ca dù có ngoại lệ `available`. Hạn đăng ký chỉ chặn ghi `shift_preferences`, không thay đổi dữ liệu đã chốt; người dùng thấy hạn trước khi gửi.
Sửa lịch bận/ngoại lệ sau khi lịch đã công bố không tự đổi phân công hiện hành; validator dùng dữ liệu mới ở lần ghi/kiểm tra tiếp theo và báo xung đột để quản lý xử lý.

## Lịch, slot và phân công

| Bảng | Trường và quy tắc |
| --- | --- |
| `schedules` | `store_id`, `week_start` là Thứ 2, `status` draft/published/archived, `version >= 1`, `created_by`, `published_by/at`; một lịch hiện hành cho mỗi cửa hàng/tuần. Thêm unique index `(store_id, week_start)` cho row hiện hành. |
| `shift_slots` | `schedule_id`, `work_date`, ca mẫu, vị trí, `start_at < end_at`, `min_count <= ideal_count`; snapshot nhu cầu tại thời điểm tạo nháp. Duy nhất `(schedule_id, work_date, shift_template_id, position_id)`. |
| `shift_assignments` | `slot_id`, `user_id`, `start_at/end_at` khớp slot, `source`, `is_pinned`, `status` assigned/needs_cover/cancelled, `note`, `created_by/at`; chỉ `assigned` là phân công hiệu lực. |
| `schedule_runs` | `schedule_id`, `algorithm=greedy`, tham số/trọng số, `status`, `score`, `runtime_ms`, `unfilled_slots`, `warnings` chứa mã lý do slot thiếu, `fairness`, người và thời điểm chạy. |
| `schedule_revisions` *(mới)* | `id`, `schedule_id`, `version`, `snapshot` JSONB của lịch/slot/phân công trước khi sửa, `reason` bắt buộc, `changed_by`, `changed_at`; duy nhất `(schedule_id, version)`. Chỉ đọc bằng quyền quản lý/admin, không dùng snapshot để tính giờ hay độ phủ. |

Schema PRD cho phép `UNIQUE (store_id, week_start, version)` nhưng chưa chặn hai row hiện hành. Chọn một row lịch hiện hành cho mỗi cửa hàng/tuần, tăng `version` trên row đó sau khi lưu revision. Không clone `shift_assignments`, nên không tạo trùng giờ giữa các phiên bản. Với thay đổi lịch đã công bố: khóa row lịch, ghi revision và audit, kiểm tra thay đổi bằng validator, cập nhật phân công/phiên bản trong cùng giao dịch. Nếu validator thất bại, rollback toàn bộ. Duyệt nghỉ phép làm ca chuyển `needs_cover` cũng tạo revision hệ thống với lý do chứa ID đơn trong cùng giao dịch. Lý do thay đổi không đặt trong `shift_assignments.note` vì đó là ghi chú ca, không phải audit phiên bản.

Migration `0002_scheduling.sql` của feature này tạo `shift_assignments` ngay với predicate `EXCLUDE ... WHERE (status = 'assigned')`; feature `003` không có migration sửa predicate. `needs_cover` giữ lịch sử người cũ nhưng không chiếm giờ. Giữ `UNIQUE (slot_id, user_id)`; nếu xếp lại đúng người cũ, xử lý dòng cũ qua quy trình sửa lịch trước khi xác nhận.

## Bộ kiểm tra và số liệu

- Tính ca bằng khoảng `[start_at,end_at)` theo timestamp thực; slot qua đêm có `end_at` ở ngày sau.
- `min_count` là nhu cầu cứng cần cố gắng phủ, không được vi phạm H1–H9 để đạt nó; `ideal_count` là mục tiêu mềm và trần số phân công `assigned` trong slot.
- Tổng giờ/ngày, tuần và nghỉ giữa ca tính trên `assigned` từ mọi cửa hàng của cùng người; không tính `needs_cover`, `cancelled` hoặc snapshot revision. Tuần được tính theo ngày địa phương của cửa hàng đang lập lịch, với ca qua đêm cộng giờ thực tế vào ngày/tuần tương ứng.
- Trong MVP, một bản ghi `user_positions` với `skill_level` từ 1 đến 5 đủ điều kiện vị trí; không có ngưỡng kỹ năng riêng. Tổng giờ tuần gộp dùng `max_hours_week` nhỏ nhất của các membership còn hiệu lực; giới hạn giờ/ngày dùng `max_hours_day` nhỏ nhất và nghỉ giữa ca dùng `min_rest_hours` lớn nhất của các cửa hàng có ca liên quan.
- Validator đọc dữ liệu mới nhất khi lưu phân công, chạy solver và công bố. Ca pinned không bị solver xóa/đổi; nếu vi phạm dữ liệu mới, trả xung đột để quản lý xử lý.
- Duyệt nghỉ và mọi giao dịch ghi/công bố lịch khóa hàng `users` của nhân viên liên quan bằng `SELECT ... FOR UPDATE` theo thứ tự UUID tăng dần, rồi mới khóa lịch/đơn và đọc lại dữ liệu. Solver khóa các ứng viên trước khi tính; khi lưu tay khóa người cũ và người mới; khi công bố khóa mọi người đang có phân công hiệu lực.
- `schedule_runs.warnings` có `slot_id`, `missing_count`, mã lý do (busy, leave, skill, overlap, hour_limit, rest, weekly_day_off, insufficient_staff) và số ứng viên bị loại; không chứa chi tiết lịch cửa hàng khác.
- Khi công bố, lưu `published_at/by`, trạng thái và audit cùng giao dịch; nhân viên chỉ đọc lịch `published` hiện hành của mình. Bản nháp không lộ cho nhân viên.

## Quyền và chuyển trạng thái

| Từ | Sang | Điều kiện |
| --- | --- | --- |
| Chưa có | `draft` | Quản lý đúng cửa hàng/admin tạo tuần hợp lệ, sinh slot từ cấu hình đang hoạt động. |
| `draft` | `draft` | Xếp lại hoặc chỉnh tay; giữ pinned; ghi `schedule_runs` cho mỗi lần solver. |
| `draft` | `published` | Validator không có vi phạm cứng; ghi người/thời điểm công bố. |
| `published` | `published` phiên bản +1 | Có lý do; snapshot phiên bản trước, sửa hợp lệ, audit cùng giao dịch. |
| `published` | `archived` | Chỉ khi thay thế/đóng lịch theo quy trình quản trị sau này; không dùng để nhân bản lịch hiện hành trong MVP. |

Nhân viên chỉ ghi khả dụng/nguyện vọng của mình và đọc lịch công bố của mình. Quản lý chỉ thao tác lịch cửa hàng đang có membership quản lý; admin toàn hệ thống. Tất cả endpoint kiểm tra quyền ở server, không tin `user_id` do client gửi.

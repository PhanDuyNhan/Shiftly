# Data Model: Xin nghỉ phép

**Cơ sở:** Schema trong PRD mục 8.3; các bổ sung dưới đây là migration của tính năng này, không thay đổi quyền sở hữu dữ liệu tài khoản/cửa hàng của spec `002` hay phân công ca của spec `001`.

## Thực thể

### Loại nghỉ (`leave_types`)

| Trường | Ý nghĩa và quy tắc |
| --- | --- |
| `id` | Định danh bất biến. |
| `name` | Tên duy nhất toàn hệ thống, không để trống. |
| `is_paid` | Chỉ để mô tả loại nghỉ; tính lương ngoài phạm vi. |
| `requires_attachment` | Nếu đúng, đơn mới của loại này phải có một tệp hợp lệ. |
| `is_active` | Loại ngừng hoạt động không chọn được cho đơn mới; đơn cũ vẫn tham chiếu được. |

Admin quản lý danh mục. Không xóa cứng loại đã được đơn tham chiếu. Khi đổi `requires_attachment`, đơn đã gửi giữ tính hợp lệ theo thời điểm gửi; không áp lại quy tắc mới cho đơn cũ.

### Đơn nghỉ (`leave_requests`)

| Trường | Ý nghĩa và quy tắc |
| --- | --- |
| `id` | Định danh bất biến. |
| `user_id` | Người gửi lấy từ phiên đăng nhập, không nhận trực tiếp từ nội dung yêu cầu. |
| `store_id` | Cửa hàng của đơn; người gửi phải có tư cách nhân viên còn hiệu lực tại đây. Một đơn chỉ thuộc một cửa hàng. |
| `leave_type_id` | Loại nghỉ phải hoạt động lúc gửi; sau đó vẫn giữ tham chiếu nếu loại ngừng hoạt động. |
| `start_date`, `end_date` | Ngày địa phương của cửa hàng, bao gồm cả hai ngày; `end_date >= start_date`. |
| `reason` | Bắt buộc, sau khi bỏ khoảng trắng đầu/cuối không được rỗng. |
| `attachment_url` | Khóa tệp riêng tư, có thể null; tên cột giữ theo PRD, giá trị không phải URL công khai. Một khóa ứng với một tệp. |
| `status` | `pending`, `approved`, `rejected`, `cancelled`; mặc định `pending`. |
| `reviewed_by`, `reviewed_at`, `review_note` | Người, thời điểm và ghi chú quyết định; `review_note` bắt buộc khi từ chối. Nếu đơn đã duyệt rồi bị hủy, thông tin duyệt vẫn giữ. |
| `created_at` | Thời điểm gửi. |

Các trường của `users`, `stores`, `store_memberships` và `shift_assignments` được tham chiếu theo PRD. `audit_logs` lưu lịch sử gửi, duyệt, từ chối và hủy; không cần cột hủy riêng cho MVP.

Cho phép gửi và duyệt đơn có ngày đã qua hoặc đang diễn ra để lưu hồ sơ; không có ràng buộc `start_date >= today`. Chỉ ca chưa kết thúc tại thời điểm duyệt mới được cập nhật do quyết định này.

## Quan hệ và quyền

- Một người gửi nhiều đơn; mỗi đơn gắn một cửa hàng và một loại nghỉ.
- Nhân viên chỉ đọc đơn của chính mình. Quản lý đọc/xét duyệt đơn có `store_id` thuộc membership quản lý còn hiệu lực; admin đọc/xét duyệt mọi cửa hàng. Không người nào được tự xét duyệt đơn mình gửi.
- Đọc tệp phải đi qua cùng kiểm tra quyền như đọc chi tiết đơn. Không trả khóa lưu trữ hoặc URL kho tệp trong danh sách/chi tiết gửi cho trình duyệt.
- Đơn cũ giữ `store_id` gốc nếu tư cách nhân viên về sau thay đổi; quyền quản lý đối với đơn được xét theo cửa hàng của đơn và vai trò hiện tại của quản lý.

## Ràng buộc dữ liệu

1. Giữ khóa ngoại và `CHECK (end_date >= start_date)` trong PRD.
2. Thêm kiểm tra lý do không rỗng sau khi bỏ khoảng trắng; thêm kiểm tra ghi chú từ chối không rỗng. Chuẩn hóa khoảng trắng ở lớp nhập trước khi lưu.
3. Thêm `btree_gist` và ràng buộc loại trừ cho cùng người/cửa hàng khi khoảng ngày giao nhau, chỉ đối với `pending` và `approved`:

   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;
   ALTER TABLE leave_requests
     ADD CONSTRAINT leave_requests_no_active_overlap
     EXCLUDE USING gist (
       user_id WITH =,
       store_id WITH =,
       daterange(start_date, end_date, '[]') WITH &&
     ) WHERE (status IN ('pending', 'approved'));
   ```

4. Giữ chỉ mục `(store_id, status, start_date)` và `(user_id, start_date)` trong PRD cho danh sách quản lý/nhân viên. Tối ưu thêm chỉ khi số liệu sử dụng cho thấy cần.
5. Nếu dữ liệu mẫu đã có, kiểm tra và xử lý đơn trùng ngày hoặc lý do rỗng trước khi áp migration; không âm thầm xóa lịch sử.
6. Ràng buộc loại trừ của `shift_assignments` trong PRD dùng `status <> 'cancelled'`, nên vẫn coi `needs_cover` là ca chiếm giờ. Feature `001` sở hữu bảng này và tạo migration `0002_scheduling.sql` với predicate `status = 'assigned'` ngay từ đầu; feature `003` không tạo migration sửa lại. `UNIQUE (slot_id, user_id)` vẫn giữ.

## Chuyển trạng thái

| Từ | Sang | Người được làm | Điều kiện |
| --- | --- | --- | --- |
| Tạo mới | `pending` | Nhân viên có quyền ở cửa hàng | Dữ liệu hợp lệ, không trùng đơn còn hiệu lực. |
| `pending` | `approved` | Quản lý đúng cửa hàng hoặc admin, không là người gửi | Quyết định đầu tiên thắng; ghi người/thời điểm xét duyệt. |
| `pending` | `rejected` | Như trên | Ghi chú từ chối bắt buộc. |
| `pending` | `cancelled` | Người gửi | Đơn vẫn đang chờ. |
| `approved` | `cancelled` | Người gửi | Ngày địa phương hiện tại của cửa hàng còn trước `start_date`. |

Không có chuyển trạng thái khác trong MVP. Cập nhật dùng điều kiện `status` và quyền trong cùng giao dịch, kiểm tra số dòng được thay đổi; cạnh tranh duyệt/hủy trả xung đột thay vì ghi đè.

## Tệp đính kèm

- Chấp nhận tối đa một tệp 4 MB, PDF/JPEG/PNG. Kiểm tra kích thước, phần mở rộng, chữ ký nội dung; tên lưu trữ ngẫu nhiên. Tệp được lưu trong kho riêng và khóa nội bộ ghi ở `attachment_url`.
- Nếu tải tệp thất bại, không tạo đơn. Nếu tệp đã lưu nhưng giao dịch tạo đơn thất bại, xóa tệp; cơ chế dọn tệp mồ côi xử lý trường hợp xóa bù thất bại.
- Endpoint tải tệp kiểm tra quyền trước khi đọc kho. Phản hồi đặt `Cache-Control: private, no-store` và `Content-Disposition: attachment`.
- Trong bản demo, tệp được giữ cùng đơn/lịch sử, không tự hết hạn. Sau khi nhân viên nghỉ việc, quyền đọc còn thuộc quản lý hiện tại của cửa hàng gốc và admin; người khác không được đọc. Thời hạn lưu và xóa dữ liệu thật cần được chốt trước khi vận hành thực tế.

## Tác động lên lịch

- Đơn `approved` tạo khoảng nghỉ `[00:00 start_date, 00:00 ngày sau end_date)` theo múi giờ cửa hàng. Lịch tuần so khoảng này với thời gian bắt đầu/kết thúc thực của ca; ca qua đêm giao khoảng nghỉ bị loại.
- Khi duyệt đơn, module nghỉ khóa hàng `users` của người gửi trước khi khóa lịch/đơn và đọc lại trạng thái; module lịch dùng cùng quy tắc khóa khi ghi/công bố. Nếu đơn trùng phân công đã công bố chưa kết thúc (`end_at > reviewed_at`), module lịch chuyển phân công `assigned` liên quan sang `needs_cover`, lưu snapshot revision hệ thống và tăng version trong cùng giao dịch; ca đã kết thúc giữ nguyên. Module nghỉ không tự tạo người thay hoặc yêu cầu quản lý công bố lại.
- `needs_cover` giữ người được xếp ban đầu để truy vết nhưng không tính là phân công đang làm, độ phủ nhân sự hoặc giờ dự kiến của người đó. Truy vấn lịch hiệu lực của nhân viên loại trừ trạng thái này; truy vấn ca cần người của quản lý vẫn hiển thị nó.
- Khi hủy đơn đã duyệt, đơn không còn cấm xếp ca từ lần kiểm tra/lập lịch sau. Không tự khôi phục phân công cũ vì có thể đã được thay thế.

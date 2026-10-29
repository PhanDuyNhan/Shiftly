# Research: Xin nghỉ phép Shiftly

**Ngày:** 2026-10-27  
**Nguồn yêu cầu:** [spec.md](spec.md), PRD mục EMP-5, MGR-8, ADM-3 và schema `leave_types`/`leave_requests`.

## 1. Ứng dụng và giao diện

**Decision:** Dùng một ứng dụng Next.js App Router với TypeScript; giao diện nhân viên ưu tiên điện thoại, các điểm vào dữ liệu dùng Route Handlers. Dùng lớp nghiệp vụ phía server cho quyền và trạng thái đơn.

**Rationale:** PRD đã chọn Next.js làm hướng chính. [Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route) hỗ trợ các thao tác đọc/ghi và nhận form có tệp. [Hướng dẫn Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend) lưu ý các route này có thể được gọi trực tiếp, nên quyền phải được kiểm tra trong mọi điểm vào.

**Alternatives considered:** Tách NestJS thành dịch vụ riêng làm tăng số thành phần cho một luồng nghiệp vụ nhỏ; Server Actions tiện cho biểu mẫu nhưng contract API của PRD phù hợp Route Handlers hơn.

## 2. Xác thực, quyền và chống yêu cầu giả mạo

**Decision:** Dùng phiên đăng nhập của spec nền tảng, kiểm tra tài khoản và quyền trên mỗi yêu cầu. `user_id` lấy từ phiên; `store_id` của đơn chỉ nhận nếu người gửi có tư cách nhân viên tại cửa hàng đó. Admin có quyền toàn hệ thống; quản lý phải có vai trò tại đúng cửa hàng và không được xét duyệt đơn của mình. Các thao tác ghi qua cookie xác thực kiểm tra nguồn yêu cầu và mã chống giả mạo.

**Rationale:** [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication) khuyến nghị kiểm tra quyền gần lớp truy cập dữ liệu. [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) khuyến nghị từ chối mặc định và xác nhận quyền trên mỗi yêu cầu. [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) nêu SameSite cookie một mình chưa đủ cho mọi trường hợp.

**Alternatives considered:** Chỉ ẩn nút trên giao diện không bảo vệ endpoint; tin `user_id` do trình duyệt gửi cho phép giả mạo người gửi.

## 3. Chống đơn trùng ngày và quyết định đồng thời

**Decision:** Thêm ràng buộc loại trừ cho cùng `(user_id, store_id)` khi hai khoảng ngày giao nhau và trạng thái thuộc `pending`/`approved`. Dùng khoảng ngày bao gồm cả hai ngày biên. Quyết định duyệt/từ chối/hủy là cập nhật có điều kiện theo trạng thái trong một giao dịch; ghi audit cùng giao dịch.

**Rationale:** Schema PRD hiện chỉ kiểm tra `end_date >= start_date`, chưa bảo vệ hai đơn gửi cùng lúc. PostgreSQL hỗ trợ [range overlap và exclusion constraints](https://www.postgresql.org/docs/current/rangetypes.html), [partial constraint predicate](https://www.postgresql.org/docs/current/sql-createtable.html) và [btree_gist](https://www.postgresql.org/docs/current/btree-gist.html) cho UUID. Điều kiện trên lệnh cập nhật được đánh giá lại sau cạnh tranh ghi theo [transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

**Alternatives considered:** Chỉ kiểm tra trùng trong ứng dụng có thể bỏ lọt hai yêu cầu đồng thời; khóa toàn bảng làm giảm khả năng mở rộng và không cần thiết.

## 4. Đồng bộ với lịch tuần

**Decision:** Lịch tuần đọc các đơn `approved` làm ngày không thể xếp; `pending`, `rejected`, `cancelled` không chặn ca. Feature `001` sở hữu dịch vụ chuyển phân công đã công bố chưa kết thúc sang `needs_cover`; feature `003` gọi dịch vụ đó trong cùng giao dịch duyệt sau khi khóa hàng người gửi. Ca đã kết thúc giữ nguyên. `needs_cover` giữ người ban đầu để truy vết nhưng không tính là phân công hiệu lực, độ phủ hay giờ dự kiến của họ. Nếu hủy đơn đã duyệt trước ngày bắt đầu, không tự khôi phục phân công cũ vì ca có thể đã được người khác nhận. Đây là quy tắc PRD áp dụng cho feature này.

**Rationale:** PRD mục 5 và 14 nêu rõ `needs_cover`; cập nhật trong cùng giao dịch tránh đơn đã duyệt nhưng lịch vẫn coi ca là bình thường. Quyền sở hữu logic phân công thuộc [spec lập lịch](../001-shift-scheduling/spec.md).

**Alternatives considered:** Chặn duyệt khi có ca đã công bố làm chậm xử lý nghỉ gấp; chỉ cảnh báo mà không đánh dấu ca khiến lịch hiển thị sai trạng thái.

## 5. Ngày, múi giờ và ca qua đêm

**Decision:** Đơn nghỉ dùng ngày địa phương của cửa hàng, bao gồm trọn ngày bắt đầu và kết thúc. Cho phép khai báo/duyệt ngày đã qua hoặc đang diễn ra để lưu hồ sơ; quyết định mới không sửa ca đã kết thúc. Cầu nối lịch đổi khoảng nghỉ thành `[00:00 ngày bắt đầu, 00:00 ngày sau ngày kết thúc)` theo múi giờ cửa hàng, rồi so với thời gian thực của ca; ca qua đêm giao với khoảng này cũng bị ảnh hưởng.

**Rationale:** Phù hợp cột ngày của PRD và tránh lỗi chỉ so sánh `work_date` đối với ca qua đêm.

**Alternatives considered:** So sánh ngày bắt đầu ca bỏ lọt ca bắt đầu hôm trước nhưng kéo dài vào ngày nghỉ.

## 6. Tệp đính kèm riêng tư

**Decision:** Giữ tối đa một tệp/đơn, tối đa 4 MB, chỉ nhận PDF, JPEG và PNG. Kiểm tra kích thước, phần mở rộng và nội dung tệp; đặt tên lưu trữ ngẫu nhiên. Lưu tệp trong kho riêng, cột `attachment_url` của PRD chứa khóa lưu trữ nội bộ, không chứa URL công khai. Chỉ endpoint đã kiểm tra quyền mới trả nội dung tệp; đặt `Cache-Control: private, no-store`. Trong bản demo, giữ tệp cùng đơn/lịch sử không tự hết hạn; người nghỉ việc không làm mất quyền đọc của quản lý cửa hàng gốc hoặc admin.

**Rationale:** [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) khuyến nghị kiểm tra loại/kích thước, tên sinh mới và lưu ngoài vùng công khai. [Vercel Functions](https://vercel.com/docs/functions/limitations) có giới hạn thân yêu cầu 4.5 MB, nên 4 MB chừa chỗ cho phần dữ liệu biểu mẫu. [Vercel private Blob](https://vercel.com/docs/vercel-blob/private-storage) và kho riêng tương đương đều hỗ trợ tải qua server đã xác thực.

**Alternatives considered:** Lưu tệp trong `public/` hoặc URL công khai làm lộ giấy tờ; lưu vào filesystem tạm của hàm triển khai không bền; tải trực tiếp lên kho từ trình duyệt phức tạp hơn mức cần thiết cho giới hạn 4 MB.

## 7. Quản lý schema và kiểm tra

**Decision:** Dùng PostgreSQL làm nguồn sự thật; mã dữ liệu ứng dụng dùng Drizzle và migration SQL có thể bổ sung thủ công cho ràng buộc loại trừ. Nghiệm thu thủ công theo quickstart và lưu kết quả SC-001–SC-006 khi triển khai; có thể thêm unit/integration/browser test nếu được yêu cầu riêng.

**Rationale:** PRD chọn PostgreSQL và cho phép Prisma/Drizzle. [Drizzle migrations](https://orm.drizzle.team/docs/migrations) lưu SQL migration có thể xem lại, phù hợp với ràng buộc PostgreSQL đặc thù.

**Alternatives considered:** Chỉ dựa vào validation ở giao diện không bảo vệ các yêu cầu trực tiếp; migration tự động không được xem lại có thể bỏ sót ràng buộc trạng thái và khoảng ngày.

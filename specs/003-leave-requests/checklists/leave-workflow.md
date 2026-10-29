# Leave Workflow Checklist: Xin nghỉ phép và duyệt đơn

**Purpose**: Rà chất lượng yêu cầu về vòng đời đơn, quyền truy cập và tác động lên lịch trước khi tạo tasks
**Created**: 2026-10-27
**Feature**: [spec.md](../spec.md)

**Note**: Checklist này đánh giá nội dung yêu cầu, không đánh giá phần mềm đã triển khai. Đánh dấu mục đạt khi tài liệu đã trả lời rõ câu hỏi.

## Requirement Completeness

- [ ] CHK001 Các yêu cầu có xác định rõ nhân viên nào còn đủ tư cách gửi đơn tại cửa hàng, kể cả khi tư cách làm việc vừa kết thúc không? [Completeness, Spec §FR-001, §Edge Cases]
- [ ] CHK002 Quyền tạo, sửa và ngừng sử dụng loại nghỉ của admin có được mô tả đủ cho loại đã có đơn tham chiếu không? [Completeness, Spec §FR-014]
- [ ] CHK003 Các trạng thái đơn và toàn bộ chuyển trạng thái hợp lệ có được nêu nhất quán giữa luồng gửi, duyệt và hủy không? [Completeness, Spec §FR-005, §FR-007, §FR-010]
- [ ] CHK004 Spec có quy định liệu đơn bắt đầu trong quá khứ hoặc đang diễn ra có được gửi và duyệt hay không? [Gap, Spec §FR-001, §FR-007]
- [ ] CHK005 Trường hợp không có loại nghỉ đang hoạt động có được mô tả như một trạng thái trống có hướng xử lý cho nhân viên không? [Gap, Spec §User Story 1]

## Requirement Clarity

- [ ] CHK006 “Ngày bắt đầu” và “ngày kết thúc” có được định nghĩa là ngày địa phương, bao gồm cả hai ngày biên, cho mọi quy tắc gửi/hủy/xếp ca không? [Clarity, Spec §FR-001, §FR-010, §FR-012]
- [ ] CHK007 Ranh giới thời điểm hủy đơn đã duyệt có đủ chính xác khi chuyển ngày tại múi giờ cửa hàng không? [Clarity, Spec §FR-010, §FR-011]
- [ ] CHK008 Yêu cầu lý do và ghi chú từ chối có định nghĩa rõ “không rỗng” sau khi bỏ khoảng trắng không? [Clarity, Spec §FR-002, §FR-007]
- [ ] CHK009 Quy tắc một tệp tối đa, loại tệp và dung lượng có được ghi thống nhất giữa spec và kế hoạch để người duyệt yêu cầu hiểu cùng một giới hạn không? [Consistency, Spec §FR-003, §Assumptions, Plan §Technical Context]
- [ ] CHK010 Quy tắc đơn trùng ngày có làm rõ cả đơn một ngày, khoảng ngày giao một phần và hai yêu cầu đồng thời không? [Clarity, Spec §FR-004, §Edge Cases]

## Authorization & Privacy Coverage

- [ ] CHK011 Phạm vi xem danh sách, xem chi tiết, xem tác động và tải tệp của nhân viên, quản lý và admin có được nêu cho từng loại dữ liệu không? [Coverage, Spec §FR-006, §FR-013, §FR-015]
- [ ] CHK012 Quyền của quản lý đối với đơn cũ sau khi nhân viên chuyển hoặc nghỉ ở cửa hàng có được xác định rõ không? [Clarity, Spec §Edge Cases]
- [ ] CHK013 Quy tắc cấm tự duyệt có áp dụng rõ cho cả quản lý và admin khi họ cũng là người gửi đơn không? [Clarity, Spec §FR-009, §Assumptions]
- [ ] CHK014 Danh tính người gửi và cửa hàng của đơn có được xác định từ tư cách đăng nhập thay vì tin thông tin tự khai trong yêu cầu không? [Security, Spec §FR-001, Plan §Phase 0]
- [ ] CHK015 Thời hạn lưu, quyền truy cập sau khi nhân viên nghỉ việc và cách xử lý tệp đính kèm hết hạn có được quy định đủ cho dữ liệu riêng tư không? [Gap, Spec §FR-015, §Edge Cases]

## Scenario & Recovery Coverage

- [ ] CHK016 Khi loại nghỉ bắt buộc có tệp nhưng tệp không hợp lệ hoặc lưu không thành công, yêu cầu có quy định rõ đơn có được tạo hay không không? [Coverage, Spec §FR-003, §Edge Cases]
- [ ] CHK017 Nếu trạng thái đơn đổi giữa lúc người xét duyệt đang xem và lúc ra quyết định, phản hồi mong đợi và quyền thử lại có được mô tả không? [Coverage, Spec §FR-008, §Edge Cases]
- [ ] CHK018 Có yêu cầu bảo toàn trạng thái đơn và lịch sử khi một phần thao tác duyệt/hủy thất bại không? [Gap, Spec §FR-008, §FR-016]
- [ ] CHK019 Đơn đã duyệt bị hủy trước ngày bắt đầu có quy định rõ tác động đối với ca đã bị đánh dấu “cần người thay” không? [Gap, Spec §FR-010, §FR-012, Scheduling Contract §4]
- [ ] CHK020 Trường hợp tệp của đơn cũ không còn truy cập được có yêu cầu về thông báo lỗi và khả năng tiếp tục xét duyệt không? [Gap, Spec §Edge Cases]

## Scheduling Integration & Consistency

- [ ] CHK021 Ràng buộc nghỉ đã duyệt có áp dụng cho mọi ca giao khoảng nghỉ, kể cả ca qua đêm bắt đầu từ hôm trước không? [Consistency, Spec §FR-012, Scheduling Contract §1]
- [ ] CHK022 Việc hiển thị tác động trước khi duyệt có nói rõ lịch nháp, lịch đã công bố và trường hợp chưa có lịch không? [Completeness, Spec §FR-013]
- [x] CHK023 Quyết định duyệt khi trùng ca đã công bố đã được chốt thành yêu cầu hay còn là giả định cần xác nhận trước tích hợp? [Spec FR-017, Contract §3]
- [ ] CHK024 Ranh giới trách nhiệm giữa spec nghỉ phép và spec lập lịch đối với đánh dấu ca, sửa lịch và gợi ý người thay có nhất quán không? [Consistency, Spec §User Story 4, §Assumptions]
- [ ] CHK025 Nếu quyết định duyệt và cập nhật ca liên quan không thể hoàn tất cùng nhau, tài liệu có quy định kết quả chấp nhận được cho người dùng không? [Coverage, Spec §FR-012, Scheduling Contract §3]

## Acceptance & Non-Functional Quality

- [ ] CHK026 Các tiêu chí thời gian gửi/xét duyệt có nêu rõ dữ liệu chuẩn bị sẵn, thiết bị và phạm vi tính thời gian để có thể đánh giá lại không? [Measurability, Spec §SC-001, §SC-002]
- [ ] CHK027 Bộ tình huống để đánh giá mục tiêu 100% phân quyền, chuyển trạng thái và không xếp ca ngày nghỉ có được xác định đủ các trạng thái và vai trò không? [Coverage, Spec §SC-003, §SC-004, §SC-005]
- [ ] CHK028 Yêu cầu giao diện điện thoại có đề cập nhãn trường, lỗi nhập liệu và khả năng sử dụng bàn phím/trình đọc màn hình không? [Gap, Spec §User Story 1, §SC-001]
- [ ] CHK029 Các yêu cầu về bảo mật tệp riêng tư và phản hồi khi kho tệp tạm không sẵn sàng có được nêu ở mức sản phẩm không? [Coverage, Spec §FR-015, §Edge Cases]

## Dependencies & Scope

- [ ] CHK030 Các giả định về tài khoản/cửa hàng từ spec nền tảng và phân công từ spec lập lịch có được ghi là điều kiện tích hợp có thể kiểm tra không? [Dependency, Spec §Assumptions]
- [ ] CHK031 Phạm vi loại trừ đổi ca, thông báo và nghỉ nhiều chi nhánh có được duy trì nhất quán trong stories, requirements và kế hoạch không? [Consistency, Spec §Assumptions, Plan §Summary]

## Notes

- CHK023 đã được giải quyết bằng FR-017 và contract lịch; các mục chưa đánh dấu tiếp tục được rà khi triển khai.
- Các mục có nhãn `[Gap]` chỉ ra điều cần cân nhắc bổ sung vào yêu cầu; không tự động có nghĩa tính năng phải mở rộng phạm vi.

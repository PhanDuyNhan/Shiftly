# Scheduling Requirements Checklist: Lập lịch ca làm tuần

**Purpose**: Rà độ đầy đủ, rõ ràng và nhất quán của yêu cầu về khả dụng, ràng buộc xếp ca, công bố/phiên bản lịch và quyền truy cập trước khi tạo tasks.
**Created**: 2026-10-28
**Feature**: [spec.md](../spec.md)
**Audience/Depth**: Người review tài liệu; mức tiêu chuẩn.

**Note**: Các câu hỏi dưới đây đánh giá chất lượng yêu cầu được viết trong spec/plan, không đánh giá mã nguồn hay kết quả chạy ứng dụng.

## Requirement Completeness

- [ ] CHK001 Các yêu cầu đã phân biệt rõ quy tắc bận lặp lại, ngoại lệ bận/rảnh và nguyện vọng ca trong đầu vào lập lịch chưa? [Completeness, Spec §FR-001–FR-003]
- [ ] CHK002 Yêu cầu đã nêu đầy đủ ý nghĩa của mức ưu tiên nguyện vọng và việc không bảo đảm được xếp đúng ca mong muốn chưa? [Completeness, Spec §FR-003, §Assumptions]
- [ ] CHK003 Yêu cầu đã nêu cách tính hạn đăng ký theo tuần và cách xử lý dữ liệu đã gửi khi hạn qua chưa? [Completeness, Spec §FR-004, Plan §Phase 0]
- [ ] CHK004 Yêu cầu đã xác định nhu cầu `min` và `ideal` khác nhau thế nào khi tạo lịch và khi báo thiếu người chưa? [Completeness, Spec §FR-005, §FR-009]
- [ ] CHK005 Yêu cầu đã bao phủ trạng thái lịch nháp, đã công bố và phiên bản lịch sau chỉnh sửa chưa? [Completeness, Spec §FR-010–FR-012]
- [ ] CHK006 Yêu cầu đã nêu thông tin tối thiểu của lý do slot chưa phủ và cảnh báo sau lần xếp lịch chưa? [Completeness, Spec §FR-009, §Key Entities]

## Requirement Clarity

- [ ] CHK007 “Đủ kỹ năng” đã được định nghĩa bằng mức kỹ năng tối thiểu hoặc quy tắc tương đương cho từng vị trí chưa? [Clarity, Spec §FR-007–FR-008]
- [ ] CHK008 “Giới hạn giờ/nghỉ đang áp dụng” đã chỉ rõ nguồn cấu hình, phạm vi ngày/tuần và ưu tiên khi nhiều giới hạn cùng có hiệu lực chưa? [Clarity, Spec §FR-008, §Assumptions]
- [ ] CHK009 “Ít nhất một ngày nghỉ liên tục” và nghỉ tối thiểu giữa ca đã có quy tắc tính qua ranh giới tuần/ngày chưa? [Ambiguity, Spec §FR-008, PRD §4.3]
- [ ] CHK010 Quy tắc ngoại lệ bận/rảnh ghi đè quy tắc lặp lại đã xác định phạm vi giờ và thứ tự ưu tiên khi nhiều ngoại lệ giao nhau chưa? [Clarity, Spec §FR-002, §Edge Cases]
- [ ] CHK011 Quy tắc ca khóa đã nói rõ trường hợp ca khóa trở nên không hợp lệ do nghỉ được duyệt hoặc dữ liệu mới chưa? [Clarity, Spec §FR-015, §US2]
- [ ] CHK012 “Lý do dễ hiểu” cho slot thiếu đã được giới hạn thành thông tin kiểm chứng được mà không lộ dữ liệu ngoài quyền chưa? [Clarity, Spec §FR-009, §FR-013]
- [ ] CHK013 Quy tắc đếm độ phủ đã xác định ca `needs_cover` và ca hủy có tính là nhân sự đang làm không? [Clarity, Spec §Assumptions, Contract §leave-integration]

## Requirement Consistency

- [ ] CHK014 Yêu cầu không xếp ca vào ngày nghỉ đã duyệt có thống nhất với quy tắc xử lý ca đã công bố trùng đơn mới duyệt chưa? [Consistency, Spec §FR-008, §Assumptions]
- [ ] CHK015 Quy tắc quản lý chỉ thấy cửa hàng mình có thống nhất với yêu cầu tính tổng giờ liên chi nhánh mà không lộ chi tiết cửa hàng khác chưa? [Consistency, Spec §FR-013, §Assumptions]
- [ ] CHK016 Quy tắc chỉnh lịch đã công bố có thống nhất giữa yêu cầu lưu lý do, lịch sử phiên bản và trường hợp thay đổi do duyệt nghỉ phép chưa? [Consistency, Spec §FR-012, Plan §Phase 0]
- [ ] CHK017 Quy tắc nguyện vọng là ưu tiên mềm có thống nhất với yêu cầu cứng không xếp vào giờ bận/nghỉ chưa? [Consistency, Spec §FR-003, §FR-008, §Assumptions]
- [ ] CHK018 Ranh giới “một cửa hàng trong MVP” có thống nhất với việc tính giờ tuần của nhân viên có nhiều membership chưa? [Consistency, Spec §Assumptions]

## Acceptance Criteria Quality

- [ ] CHK019 SC-001 đã định nghĩa điểm bắt đầu/kết thúc phép đo 5 phút và điều kiện dữ liệu đầu vào sẵn sàng chưa? [Measurability, Spec §SC-001]
- [ ] CHK020 SC-002 đã xác định tập ràng buộc cứng đang bật và cách tính mẫu số “100% phân công” chưa? [Measurability, Spec §SC-002]
- [ ] CHK021 SC-003 đã xác định mẫu số khi nhân viên không đăng ký ca hoặc đăng ký mức “ngại” chưa? [Measurability, Spec §SC-003]
- [ ] CHK022 SC-004 đã xác định công thức độ lệch, nhóm cùng loại hợp đồng và cách xử lý giờ mục tiêu bằng 0 chưa? [Measurability, Spec §SC-004]
- [ ] CHK023 SC-005 đã xác định khi nào một vị trí được coi là thiếu và tiêu chuẩn “lý do kiểm chứng được” chưa? [Measurability, Spec §SC-005]
- [ ] CHK024 SC-006/SC-007 đã xác định luồng nhập thông thường và các loại yêu cầu ngoài quyền cần tính vào mẫu số chưa? [Measurability, Spec §SC-006–SC-007]

## Scenario and Edge Case Coverage

- [ ] CHK025 Yêu cầu đã bao phủ tuần không có nhu cầu, vị trí không có ứng viên và nhu cầu tối thiểu bằng 0 chưa? [Coverage, Spec §Edge Cases]
- [ ] CHK026 Yêu cầu đã nêu cách tính ca qua đêm và khoảng bận/nghỉ ở hai ngày biên, kể cả đổi tuần chưa? [Coverage, Spec §FR-014, §Edge Cases]
- [ ] CHK027 Yêu cầu đã nêu điều kiện từ chối công bố khi ca pinned hoặc phân công tay trở nên vi phạm dữ liệu mới chưa? [Coverage, Spec §FR-010–FR-015]
- [ ] CHK028 Yêu cầu đã mô tả phản hồi khi hai quản lý cùng chỉnh/công bố một phiên bản lịch chưa? [Gap, Spec §US3]
- [ ] CHK029 Yêu cầu đã xác định cách khôi phục hoặc giữ nguyên lịch khi một lần sửa lịch đã công bố thất bại giữa chừng chưa? [Gap, Spec §FR-012]
- [ ] CHK030 Yêu cầu đã xác định nhân viên thấy phiên bản nào khi lịch vừa được công bố hoặc sửa trong lúc họ đang xem chưa? [Gap, Spec §FR-011–FR-012]

## Non-Functional Requirements and Dependencies

- [ ] CHK031 Yêu cầu về thời gian thao tác/solver đã có giới hạn dữ liệu và cách đo phù hợp quy mô 30 nhân viên chưa? [Measurability, Spec §SC-001, Plan §Technical Context]
- [ ] CHK032 Quyền đọc dữ liệu khả dụng, nguyện vọng, cảnh báo và lịch sử chỉnh sửa đã được mô tả theo từng vai trò/cửa hàng chưa? [Security, Spec §FR-013]
- [ ] CHK033 Phụ thuộc vào tài khoản/cấu hình từ spec `002` và nghỉ đã duyệt từ spec `003` đã có điều kiện tích hợp rõ ràng chưa? [Dependency, Spec §Assumptions]
- [ ] CHK034 Các mặc định giới hạn giờ/nghỉ dùng cho demo và quyết định cần chốt trước vận hành thật đã được tách rõ trong yêu cầu chưa? [Assumption, Spec §Assumptions]

## Notes

- Đánh dấu `[x]` sau khi đối chiếu tài liệu và ghi phát hiện ngay dưới mục tương ứng.
- Mục `[Gap]` là câu hỏi về yêu cầu có thể còn thiếu; không mặc định kết luận là lỗi triển khai.

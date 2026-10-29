# Feature Specification: Lập lịch ca làm tuần

**Feature Branch**: `001-shift-scheduling`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Đọc tính năng của Shiftly ở Docs/PRD + DB Hệ thống quản lý ca làm cho chuỗi quán.md."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nhân viên khai báo khả dụng và ca mong muốn (Priority: P1)

Nhân viên chọn tuần sắp tới, khai báo những khung giờ bận thường xuyên hoặc ngoại lệ theo ngày, rồi đăng ký các ca mong muốn trước hạn do cửa hàng đặt ra. Họ xem lại dữ liệu đã gửi để biết quản lý sẽ dùng thông tin nào khi lập lịch. Lịch làm việc đã công bố của họ thuộc User Story 3.

**Why this priority**: Đây là đầu vào trực tiếp của lịch tuần; nếu thiếu, quản lý không thể biết thời gian và nguyện vọng của nhân viên.

**Independent Test**: Một nhân viên khai báo lịch bận lặp lại, thêm một ngoại lệ cho ngày cụ thể, đăng ký ca mong muốn và xem lại dữ liệu đã lưu.

**Acceptance Scenarios**:

1. **Given** nhân viên đang trong thời hạn đăng ký của một tuần, **When** họ gửi lịch bận và ca mong muốn, **Then** hệ thống lưu các lựa chọn gắn với đúng tuần và hiển thị xác nhận để họ kiểm tra.
2. **Given** nhân viên đã có lịch bận lặp lại, **When** họ thêm ngoại lệ bận hoặc rảnh cho một ngày, **Then** ngoại lệ chỉ áp dụng cho ngày đó và được dùng khi lập lịch.
3. **Given** hạn đăng ký đã qua, **When** nhân viên sửa đăng ký ca cho tuần đó, **Then** hệ thống thông báo đã hết hạn và không âm thầm thay đổi dữ liệu quản lý dùng để lập lịch.
4. **Given** một nhân viên đăng nhập, **When** họ xem hoặc sửa khả dụng, **Then** họ chỉ truy cập được dữ liệu của chính mình.
5. **Given** nhân viên có một cửa hàng gốc, **When** họ đăng ký ca, **Then** hệ thống tự lấy ca của cửa hàng gốc mà không yêu cầu chọn cửa hàng.

### User Story 2 - Quản lý dùng nhu cầu đã cấu hình để tạo lịch tuần (Priority: P1)

Quản lý cửa hàng dùng ca mẫu, vị trí và nhu cầu nhân sự đã được cấu hình trong tính năng nền tảng. Với tuần cần lập, quản lý xem tổng hợp khả dụng và nguyện vọng, sau đó yêu cầu hệ thống tạo lịch nháp.

**Why this priority**: Dùng nhu cầu đã cấu hình để tạo lịch nháp biến thông tin rời rạc thành kế hoạch nhân sự cụ thể cho cửa hàng.

**Independent Test**: Với cửa hàng và nhu cầu nhân sự đã cấu hình sẵn, quản lý cung cấp dữ liệu nhân viên cho một tuần và tạo được lịch nháp với các vị trí cần phủ.

**Acceptance Scenarios**:

1. **Given** cửa hàng đã có ca mẫu và nhu cầu theo ngày, ca, vị trí, **When** quản lý chọn tuần cần lập lịch, **Then** hệ thống dùng đúng cấu hình đó để xác định các vị trí cần phủ.
2. **Given** nhân viên đã gửi thông tin cho tuần, **When** quản lý mở tổng hợp độ phủ, **Then** họ thấy số người khả dụng và đăng ký theo ngày, ca và vị trí.
3. **Given** cửa hàng có nhu cầu và danh sách nhân viên, **When** quản lý tạo lịch tự động cho tuần, **Then** hệ thống tạo bản nháp và báo số vị trí đã được phủ, còn thiếu cùng các cảnh báo liên quan.
4. **Given** quản lý thuộc một cửa hàng, **When** họ yêu cầu xem hoặc chỉnh dữ liệu cửa hàng khác, **Then** hệ thống từ chối thao tác.
5. **Given** quản lý đã khóa một số phân công trong lịch nháp, **When** họ chạy xếp lịch lại, **Then** các phân công đã khóa được giữ nguyên.

### User Story 3 - Quản lý kiểm tra, chỉnh sửa và công bố lịch (Priority: P1)

Quản lý xem lịch nháp, hiểu lý do ca còn thiếu hoặc phân công chưa đạt nguyện vọng, chỉnh phân công khi cần và công bố lịch cho nhân viên sau khi xử lý vi phạm.

**Why this priority**: Lịch nháp chỉ có giá trị khi quản lý có thể kiểm tra, hoàn thiện và đưa lịch chính thức đến nhân viên.

**Independent Test**: Tạo lịch nháp, thử một chỉnh sửa vi phạm và một chỉnh sửa hợp lệ, rồi công bố lịch hợp lệ để nhân viên xem.

**Acceptance Scenarios**:

1. **Given** lịch nháp có một ca chưa đủ người, **When** quản lý xem chi tiết ca, **Then** hệ thống nêu những lý do chính khiến ứng viên không thể được xếp và cho biết số người còn thiếu.
2. **Given** quản lý chỉnh lịch, **When** thao tác tạo ca trùng giờ, xếp sai vị trí hoặc vượt giới hạn giờ đã cấu hình, **Then** hệ thống chỉ rõ vấn đề và không chấp nhận lịch ở trạng thái vi phạm.
3. **Given** lịch nháp không còn vi phạm ràng buộc cứng, **When** quản lý công bố, **Then** lịch chuyển sang trạng thái đã công bố và nhân viên xem được lịch của mình.
4. **Given** lịch tuần đã công bố, **When** quản lý cần thay đổi phân công, **Then** hệ thống yêu cầu lý do và lưu lại người thực hiện cùng nội dung thay đổi.
5. **Given** nhân viên thuộc cửa hàng A, **When** quản lý B chỉnh lịch cửa hàng B, **Then** họ có thể xếp nhân viên đó vào ca B nếu hợp lệ mà không đổi cửa hàng gốc hay quản lý trực tiếp.

### Edge Cases

- Không có nhân viên đủ kỹ năng hoặc rảnh cho một vị trí: giữ vị trí chưa phủ và giải thích nguyên nhân; không gán người không phù hợp.
- Mọi nhân viên đều đã đạt giới hạn giờ hoặc cần nghỉ tối thiểu: không vi phạm giới hạn để lấp ca; báo rõ phần nhu cầu chưa đáp ứng.
- Ca qua đêm: ngày và giờ bắt đầu/kết thúc phải được hiểu đúng qua ranh giới ngày và múi giờ địa phương của cửa hàng.
- Nhân viên có nhiều khoảng bận, ngoại lệ và đăng ký ca trùng nhau: áp dụng ngoại lệ cho đúng ngày; không diễn giải đăng ký ca mong muốn thành quyền được xếp chắc chắn.
- Nhu cầu có số lượng tối thiểu bằng không: vẫn cho phép cấu hình ca/vị trí không bắt buộc phủ.
- Quản lý công bố khi lịch còn vi phạm ràng buộc cứng: từ chối công bố và liệt kê các vi phạm cần xử lý.
- Nhân viên có một cửa hàng gốc và một quản lý trực tiếp nhưng có thể nhận ca ở nhiều cửa hàng: tổng giờ tuần không vượt giới hạn đã đặt cho họ; quản lý chỉ thấy dữ liệu cần thiết để kiểm tra lịch cửa hàng mình.
- Nhân viên sửa quy tắc bận sau khi lịch đã công bố: dữ liệu mới được dùng cho lần xếp/chỉnh/kiểm tra tiếp theo; ca đã công bố không tự đổi trạng thái và quản lý xử lý xung đột khi sửa lịch.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cho phép nhân viên chọn tuần, xem lại dữ liệu khả dụng của chính mình và khai báo khoảng thời gian bận lặp lại theo ngày trong tuần; xem ca làm đã công bố thuộc FR-011.
- **FR-002**: Hệ thống MUST cho phép nhân viên khai báo ngoại lệ bận hoặc rảnh cho một ngày cụ thể.
- **FR-003**: Hệ thống MUST cho phép nhân viên đăng ký ca mong muốn theo tuần và gán mức ưu tiên cho từng lựa chọn. Cửa hàng được suy ra từ tư cách nhân viên đang hiệu lực; nhân viên không chọn hoặc gửi `store_id` khi đăng ký.
- **FR-004**: Hệ thống MUST áp dụng hạn đăng ký của cửa hàng cho việc gửi/sửa nguyện vọng ca của tuần; sau hạn, từ chối thao tác và giữ dữ liệu đã gửi. Quy tắc bận/ngoại lệ vẫn được sửa, nhưng thay đổi sau khi lịch đã công bố không tự sửa phân công hiện hành.
- **FR-005**: Hệ thống MUST dùng ca mẫu và nhu cầu tối thiểu/lý tưởng đã cấu hình tại cửa hàng để xác định các vị trí cần phủ trong tuần được chọn.
- **FR-006**: Hệ thống MUST tổng hợp khả dụng và nguyện vọng của nhân viên theo ngày, ca và vị trí cho tuần được chọn.
- **FR-007**: Hệ thống MUST tạo lịch nháp từ nhu cầu, nhân viên đủ kỹ năng, khả dụng, nghỉ đã duyệt, nguyện vọng, giới hạn giờ và thời gian nghỉ tối thiểu đã cấu hình.
- **FR-008**: Hệ thống MUST không phân công một nhân viên vào khoảng thời gian bận, nghỉ đã duyệt, ca trùng giờ, vị trí họ không đủ kỹ năng, hoặc vượt giới hạn giờ/nghỉ đang áp dụng. “Đủ kỹ năng” trong MVP là được gán vị trí đó với mức kỹ năng từ 1 đến 5; chưa có ngưỡng tối thiểu riêng cho từng vị trí. Tổng giờ tuần gộp mọi cửa hàng không vượt giới hạn giờ tuần của cửa hàng gốc; giờ/ngày dùng giới hạn nhỏ nhất và nghỉ giữa ca dùng yêu cầu dài nhất của các cửa hàng có ca liên quan.
- **FR-009**: Hệ thống MUST để trống nhu cầu không thể phủ hợp lệ và cung cấp lý do dễ hiểu thay vì tạo phân công vi phạm.
- **FR-010**: Hệ thống MUST cho phép quản lý chỉnh sửa lịch nháp và kiểm tra các ràng buộc áp dụng trước khi lưu hoặc công bố.
- **FR-011**: Hệ thống MUST cho phép quản lý công bố lịch đã qua kiểm tra; nhân viên MUST xem được lịch đã công bố của mình.
- **FR-012**: Hệ thống MUST yêu cầu lý do và lưu dấu vết người sửa, thời điểm và nội dung thay đổi khi lịch đã công bố được chỉnh sửa.
- **FR-013**: Hệ thống MUST giới hạn dữ liệu và thao tác theo vai trò và cửa hàng được gán; nhân viên chỉ xem hoặc sửa thông tin khả dụng của chính mình.
- **FR-014**: Hệ thống MUST hiển thị giờ theo múi giờ của cửa hàng và xử lý đúng ca qua đêm.
- **FR-015**: Hệ thống MUST tôn trọng các phân công đã được quản lý khóa khi tạo lại lịch nháp.
- **FR-016**: Quản lý MUST được phân công thủ công nhân viên có cửa hàng gốc khác vào ca của cửa hàng mình quản lý, sau khi kiểm tra kỹ năng, khả dụng, nghỉ phép và giới hạn trên toàn bộ ca của nhân viên. Phân công này không tạo thêm tư cách cửa hàng hay đổi quản lý trực tiếp.

### Key Entities *(include if feature involves data)*

- **Nhân viên và tư cách cửa hàng**: người dùng, vai trò tại cửa hàng, vị trí/kỹ năng, loại hợp đồng và giới hạn/giờ mục tiêu.
- **Khả dụng**: quy tắc bận lặp lại, ngoại lệ theo ngày và trạng thái nghỉ phép ảnh hưởng đến thời gian có thể làm.
- **Nguyện vọng ca**: lựa chọn ca theo ngày và mức ưu tiên của nhân viên trong một tuần.
- **Nhu cầu nhân sự**: số người tối thiểu và lý tưởng theo cửa hàng, thứ, ca và vị trí.
- **Lịch tuần**: lịch theo cửa hàng và tuần, có trạng thái bản nháp hoặc đã công bố, cùng phiên bản khi thay đổi.
- **Phân công ca**: liên kết nhân viên với vị trí/ca/ngày cụ thể, gồm trạng thái, nguồn tạo và trạng thái khóa.
- **Kết quả xếp lịch**: thông tin lần tạo lịch, cảnh báo, nhu cầu chưa phủ và số liệu công bằng liên quan.
- **Lịch sử thay đổi**: người thực hiện, lý do, thời điểm và nội dung trước/sau của thao tác quan trọng.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quản lý hoàn tất việc tạo và công bố lịch cho một cửa hàng, một tuần với tối đa 30 nhân viên trong dưới 5 phút sau khi dữ liệu đầu vào đã sẵn sàng.
- **SC-002**: 100% phân công được tạo hoặc công bố không vi phạm ràng buộc cứng đang bật.
- **SC-003**: Với bộ dữ liệu demo, ít nhất 70% phân công có đăng ký ca rơi vào ca nhân viên đánh dấu “rất muốn” hoặc “bình thường”.
- **SC-004**: Với bộ dữ liệu demo khả thi, độ lệch giờ làm tối đa so với giờ mục tiêu của nhân viên cùng loại hợp đồng không quá 15%; mọi trường hợp không đạt phải hiển thị số giờ mục tiêu, số giờ được xếp và lý do chính.
- **SC-005**: Khi nhu cầu không thể được đáp ứng hợp lệ, 100% vị trí thiếu được thể hiện là chưa phủ và có ít nhất một lý do kiểm chứng được.
- **SC-006**: Nhân viên hoàn thành khai báo khả dụng và nguyện vọng tuần trong dưới 2 phút với luồng nhập thông thường.
- **SC-007**: Trong kiểm thử phân quyền, 100% yêu cầu truy cập ngoài phạm vi nhân viên/cửa hàng được phép đều bị từ chối.

## Assumptions

- Cửa hàng, tài khoản, vị trí/kỹ năng, ca mẫu và nhu cầu nhân sự được thiết lập theo [spec nền tảng Shiftly](../002-shiftly-foundation/spec.md) trước khi chạy luồng lập lịch tuần; spec này không tạo hoặc sửa các cấu hình đó.
- Trạng thái và khoảng ngày nghỉ đã duyệt do [spec xin nghỉ phép](../003-leave-requests/spec.md) cung cấp; spec lập lịch dùng dữ liệu đó để loại nhân viên khỏi các ca giao với ngày nghỉ. Ca đã công bố chưa kết thúc trùng đơn mới duyệt chuyển sang `needs_cover`: giữ người ban đầu để truy vết nhưng không tính là phân công hiệu lực, độ phủ hoặc giờ dự kiến; ca đã kết thúc giữ nguyên.
- Phiên bản MVP lập từng lịch tuần theo cửa hàng; quản lý có thể mượn nhân viên từ cửa hàng khác vào lịch mình. Chức năng đổi/nhường ca, dự báo nhu cầu, AI hội thoại và thông báo đẩy/email nằm ngoài phạm vi nghiệm thu.
- Quản lý có thể được xếp ca nếu được gán vị trí và kỹ năng như nhân viên.
- Lịch bắt đầu vào Thứ 2; ngày nghiệp vụ theo múi giờ `Asia/Ho_Chi_Minh`.
- Ca mong muốn là tín hiệu ưu tiên, không phải cam kết nhân viên chắc chắn được xếp ca đó.
- Các giới hạn giờ làm và thời gian nghỉ là cấu hình theo cửa hàng/nhân viên; giá trị mẫu trong PRD chỉ dùng cho demo và cần được chủ sản phẩm xác nhận trước khi áp dụng thực tế.
- Khi nhân viên nhận ca tại nhiều chi nhánh, bộ kiểm tra giờ tuần tính cả phân công ở các chi nhánh khác; quản lý chỉ được sửa lịch cửa hàng mình quản lý.
- Lịch bận qua đêm được nhập bằng các khoảng giờ tách theo ngày địa phương cho tới khi sản phẩm định nghĩa một cách nhập khác.
- Thay đổi sau khi công bố phải có lý do và được lưu lịch sử; quy tắc tạo phiên bản mới được chốt trong giai đoạn lập kế hoạch.
- Duyệt nghỉ phép là thay đổi hệ thống lên lịch đã công bố: lý do revision được ghi tự động từ ID đơn nghỉ, không yêu cầu quản lý nhập thêm lý do.

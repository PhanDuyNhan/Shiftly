# Feature Specification: Xin nghỉ phép và duyệt đơn

**Feature Branch**: `003-leave-requests`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Tạo tính năng xin nghỉ phép cho Shiftly: nhân viên chọn loại nghỉ, khoảng ngày, nhập lý do và có thể đính kèm tệp; theo dõi trạng thái và hủy đơn khi còn được phép. Quản lý chỉ xem, duyệt hoặc từ chối đơn của nhân viên thuộc cửa hàng mình. Đơn đã duyệt phải được tính là thời gian không thể xếp ca trong tính năng lập lịch tuần. Bám theo PRD và schema DB hiện có; chưa làm đổi ca, thông báo hay nhiều chi nhánh."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nhân viên gửi và theo dõi đơn nghỉ (Priority: P1)

Nhân viên chọn loại nghỉ còn hiệu lực, ngày bắt đầu và kết thúc, nhập lý do và thêm một tệp nếu cần. Sau khi gửi, họ xem được đơn và trạng thái xử lý của mình.

**Why this priority**: Nhân viên cần một nơi chính thức để khai báo thời gian nghỉ thay cho tin nhắn rời rạc; đơn cũng là đầu vào cho việc xét duyệt và lập lịch.

**Independent Test**: Với tài khoản nhân viên và loại nghỉ đã có, gửi một đơn hợp lệ, một đơn thiếu tệp bắt buộc, rồi xem lại danh sách và chi tiết đơn của chính mình.

**Acceptance Scenarios**:

1. **Given** nhân viên đang làm tại cửa hàng và loại nghỉ còn hiệu lực, **When** họ gửi khoảng ngày hợp lệ, lý do và tệp nếu loại nghỉ yêu cầu, **Then** đơn được ghi nhận ở trạng thái chờ duyệt và hiển thị trong danh sách của họ.
2. **Given** loại nghỉ yêu cầu tệp, **When** nhân viên gửi đơn không có tệp, **Then** hệ thống không tạo đơn và chỉ rõ thông tin còn thiếu.
3. **Given** ngày kết thúc trước ngày bắt đầu hoặc lý do để trống, **When** nhân viên gửi đơn, **Then** hệ thống từ chối và nêu trường cần sửa.
4. **Given** nhân viên đã có đơn, **When** họ mở chi tiết, **Then** họ thấy loại nghỉ, khoảng ngày, lý do, tệp của mình, trạng thái và kết quả xét duyệt nếu đã có.
5. **Given** nhân viên A, **When** họ thử xem đơn của nhân viên B, **Then** hệ thống từ chối và không trả nội dung đơn hoặc tệp.
6. **Given** nhân viên đã có đơn chờ duyệt hoặc đã duyệt giao với khoảng ngày mới, **When** họ gửi đơn trùng ngày, **Then** hệ thống từ chối; đơn đã bị từ chối hoặc hủy không cản họ gửi lại.
7. **Given** nhân viên đính kèm nhiều hơn một tệp, **When** gửi đơn, **Then** hệ thống yêu cầu họ chỉ chọn một tệp.
8. **Given** nhân viên gửi đơn cho ngày đã qua hoặc khoảng nghỉ đang diễn ra, **When** dữ liệu khác hợp lệ, **Then** hệ thống vẫn nhận đơn chờ duyệt và thể hiện rõ phần ngày đã qua.

### User Story 2 - Quản lý xét duyệt trong cửa hàng (Priority: P2)

Quản lý xem các đơn của nhân viên trực thuộc mình tại cửa hàng gốc, lọc đơn chờ duyệt, xem thông tin và tác động lên lịch đã có, rồi duyệt hoặc từ chối. Nhân viên thấy kết quả và ghi chú xét duyệt trong chi tiết đơn.

**Why this priority**: Một quyết định rõ ràng và có dấu vết giúp nhân viên biết đơn đã được chấp nhận chưa, đồng thời cung cấp đầu vào đáng tin cậy cho lịch tuần.

**Independent Test**: Tạo đơn chờ duyệt ở hai cửa hàng; quản lý A duyệt đơn của A, thử duyệt đơn của B và thử ra quyết định lần thứ hai trên cùng đơn.

**Acceptance Scenarios**:

1. **Given** quản lý được gán tại cửa hàng A, **When** mở danh sách đơn, **Then** họ chỉ thấy đơn của nhân viên thuộc A và có thể lọc theo trạng thái/khoảng ngày.
2. **Given** đơn của A đang chờ duyệt, **When** quản lý xem chi tiết, **Then** họ thấy loại nghỉ, khoảng ngày, lý do, tệp được phép xem và những ca đã có sẽ bị ảnh hưởng nếu duyệt.
3. **Given** đơn đang chờ duyệt, **When** quản lý A duyệt, **Then** trạng thái thành đã duyệt và lưu người duyệt cùng thời điểm quyết định.
4. **Given** đơn đang chờ duyệt, **When** quản lý A từ chối với ghi chú lý do, **Then** trạng thái thành bị từ chối và nhân viên xem được lý do đó.
5. **Given** đơn đã được duyệt, từ chối hoặc hủy, **When** quản lý cố xét duyệt lần nữa, **Then** hệ thống từ chối và giữ quyết định hiện có.
6. **Given** quản lý A yêu cầu xem hoặc xử lý đơn của B, hoặc cố duyệt đơn do chính mình gửi, **When** yêu cầu được thực hiện, **Then** hệ thống từ chối.
7. **Given** đơn nghỉ có ngày đã qua, **When** quản lý duyệt, **Then** quyết định được lưu cho hồ sơ nghỉ nhưng không viết lại các ca đã kết thúc.

### User Story 3 - Nhân viên hủy đơn còn được phép (Priority: P3)

Nhân viên hủy đơn đang chờ duyệt; với đơn đã duyệt, họ chỉ được hủy trước ngày nghỉ đầu tiên. Lịch sử đơn và quyết định cũ vẫn xem được.

**Why this priority**: Nhân viên cần rút yêu cầu khi kế hoạch thay đổi, đồng thời cửa hàng phải biết chính xác khi nào thời gian nghỉ không còn hiệu lực.

**Independent Test**: Hủy một đơn chờ duyệt, một đơn đã duyệt trước ngày bắt đầu và thử hủy đơn đã duyệt từ ngày bắt đầu trở đi.

**Acceptance Scenarios**:

1. **Given** đơn của nhân viên đang chờ duyệt, **When** chính nhân viên hủy, **Then** trạng thái thành đã hủy và quản lý không thể xét duyệt đơn đó nữa.
2. **Given** đơn đã duyệt nhưng chưa đến ngày bắt đầu theo ngày địa phương của cửa hàng, **When** chính nhân viên hủy, **Then** trạng thái thành đã hủy và khoảng ngày đó không còn được tính là nghỉ đã duyệt cho lần lập lịch tiếp theo.
3. **Given** đơn đã duyệt và đã đến ngày bắt đầu, hoặc đơn đã bị từ chối/đã hủy, **When** nhân viên yêu cầu hủy, **Then** hệ thống từ chối và giải thích quy tắc áp dụng.
4. **Given** đơn đã hủy, **When** nhân viên hoặc quản lý có quyền xem lại, **Then** nội dung gốc và dấu vết hủy vẫn còn.

### User Story 4 - Nghỉ đã duyệt ảnh hưởng khả năng xếp ca (Priority: P4)

Khi lập hoặc kiểm tra lịch tuần, hệ thống coi toàn bộ các ngày trong đơn đã duyệt là thời gian nhân viên không thể được xếp ca. Đơn chờ duyệt, bị từ chối hoặc đã hủy không tạo ràng buộc nghỉ phép.

**Why this priority**: Quyết định nghỉ phép phải được phản ánh chính xác trong lịch để tránh xếp nhân viên làm vào ngày đã được nghỉ.

**Independent Test**: Tạo bốn đơn cùng khoảng ngày với bốn trạng thái khác nhau, sau đó dùng tính năng lập lịch tuần kiểm tra người có đơn đã duyệt bị loại khỏi ca trong khoảng nghỉ và các trạng thái khác không bị loại vì lý do nghỉ phép.

**Acceptance Scenarios**:

1. **Given** đơn đã duyệt từ Thứ 6 đến Chủ nhật, **When** lịch tuần được tạo hoặc kiểm tra, **Then** nhân viên không được xếp vào bất kỳ ca nào giao với ba ngày nghỉ đó.
2. **Given** đơn đang chờ duyệt, bị từ chối hoặc đã hủy, **When** lịch tuần được tạo hoặc kiểm tra, **Then** đơn đó không làm nhân viên bị coi là đang nghỉ phép.
3. **Given** quản lý chuẩn bị duyệt đơn trùng với phân công đã có, **When** xem tác động, **Then** quản lý thấy các ca bị ảnh hưởng trước khi quyết định; việc xử lý phân công thuộc tính năng lập lịch tuần.
4. **Given** đơn được duyệt trùng ca đã công bố chưa kết thúc, **When** quyết định hoàn tất, **Then** ca chuyển sang “cần người thay”; ca không còn tính là phân công đang làm hoặc giờ dự kiến của nhân viên nghỉ.

### User Story 5 - Admin quản lý loại nghỉ (Priority: P5)

Admin duy trì danh mục loại nghỉ dùng chung, gồm tên, trạng thái còn dùng, loại có trả lương hay không và yêu cầu tệp đính kèm. Nhân viên chỉ chọn loại đang hoạt động.

**Why this priority**: Danh mục rõ ràng giúp nhân viên gửi đúng loại đơn và giúp cửa hàng áp dụng quy tắc tệp nhất quán.

**Independent Test**: Admin tạo loại nghỉ yêu cầu tệp, cập nhật tên, ngừng sử dụng; nhân viên kiểm tra chỉ loại còn hoạt động xuất hiện khi gửi đơn mới.

**Acceptance Scenarios**:

1. **Given** admin, **When** tạo loại nghỉ với tên chưa dùng và quy tắc tệp, **Then** loại đó xuất hiện cho nhân viên khi gửi đơn.
2. **Given** tên loại nghỉ đã tồn tại, **When** admin tạo bản trùng, **Then** hệ thống từ chối và chỉ rõ tên bị trùng.
3. **Given** loại nghỉ đã được dùng trong đơn cũ, **When** admin ngừng sử dụng, **Then** đơn cũ vẫn hiện tên loại nghỉ còn loại đó không thể dùng cho đơn mới.
4. **Given** quản lý hoặc nhân viên, **When** họ thử sửa danh mục loại nghỉ, **Then** hệ thống từ chối.

### Edge Cases

- Khoảng nghỉ một ngày là hợp lệ; ngày bắt đầu và kết thúc đều thuộc thời gian nghỉ, tính theo ngày địa phương của cửa hàng.
- Đơn chồng ngày với một đơn khác của cùng nhân viên đang chờ hoặc đã duyệt: từ chối đơn mới để tránh hai quyết định cùng áp dụng trên một ngày; đơn bị từ chối/hủy không cản đơn mới.
- Tệp đính kèm không được tải lên hoặc không còn truy cập được: đơn cần tệp bắt buộc không được gửi; tệp của đơn cũ chỉ người có quyền xem đơn được truy cập.
- Tại thời điểm quản lý mở đơn, nhân viên nghỉ việc hoặc bị chuyển khỏi cửa hàng: quyền xem/xét duyệt được xác định theo cửa hàng của đơn và quyền hiện tại của người quản lý; đơn cũ vẫn lưu lịch sử.
- Hai quản lý cùng mở một đơn chờ: chỉ quyết định đầu tiên hoàn tất; người còn lại được báo trạng thái mới trước khi quyết định lại.
- Đơn được duyệt sau khi lịch đã công bố: ca chưa kết thúc giao ngày nghỉ chuyển sang “cần người thay”; ca đã kết thúc chỉ giữ làm lịch sử, không bị viết lại.
- Đơn có ngày đã qua vẫn được gửi và duyệt để lưu hồ sơ; chỉ các ca chưa kết thúc mới cần xử lý sau duyệt.
- Một đơn thuộc cửa hàng gốc duy nhất của nhân viên và do quản lý trực tiếp xét duyệt. Đơn đã duyệt chặn ca của nhân viên ở mọi cửa hàng và cập nhật các ca đã công bố bị ảnh hưởng.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Nhân viên MUST có thể chọn một loại nghỉ đang hoạt động, khoảng ngày bao gồm ngày bắt đầu/kết thúc, nhập lý do và gửi đơn cho cửa hàng mình đang làm, kể cả khi khoảng nghỉ có ngày đã qua.
- **FR-002**: Hệ thống MUST từ chối khoảng ngày có ngày kết thúc trước ngày bắt đầu, lý do trống, hoặc loại nghỉ đã ngừng sử dụng.
- **FR-003**: Hệ thống MUST cho phép tối đa một tệp cho mỗi đơn; tệp là tùy chọn trừ khi loại nghỉ yêu cầu tệp.
- **FR-004**: Hệ thống MUST từ chối đơn mới nếu cùng nhân viên và cửa hàng đã có đơn chờ duyệt hoặc đã duyệt giao với bất kỳ ngày nào của khoảng nghỉ mới.
- **FR-005**: Đơn mới MUST bắt đầu ở trạng thái chờ duyệt; nhân viên MUST xem được danh sách, chi tiết và trạng thái các đơn của chính mình.
- **FR-006**: Quản lý MUST chỉ xem và xử lý đơn của nhân viên trực thuộc mình tại cửa hàng gốc; admin MUST có thể xem và xử lý đơn của mọi cửa hàng; nhân viên MUST chỉ xem đơn của mình.
- **FR-007**: Quản lý và admin MUST chỉ duyệt hoặc từ chối đơn đang chờ; từ chối MUST có ghi chú lý do để nhân viên xem lại.
- **FR-008**: Hệ thống MUST lưu người xét duyệt, thời điểm, trạng thái và ghi chú quyết định; quyết định đã hoàn tất không thể bị một yêu cầu xét duyệt đồng thời ghi đè.
- **FR-009**: Người xét duyệt MUST không được duyệt hoặc từ chối đơn do chính mình gửi.
- **FR-010**: Nhân viên MUST hủy được đơn của mình khi đang chờ duyệt hoặc, nếu đã duyệt, trước ngày bắt đầu nghỉ theo ngày địa phương của cửa hàng.
- **FR-011**: Hệ thống MUST không cho nhân viên hủy đơn đã duyệt từ ngày bắt đầu trở đi, đơn bị từ chối hoặc đơn đã hủy; đơn hủy vẫn được giữ để xem lịch sử.
- **FR-012**: Chỉ đơn đã duyệt MUST được tính là thời gian không thể xếp ca mới cho nhân viên ở mọi cửa hàng trong toàn bộ ngày nghỉ, bao gồm hai ngày biên; đơn chờ, từ chối và hủy không có hiệu lực này; ca đã kết thúc trước lúc duyệt giữ nguyên lịch sử.
- **FR-013**: Trước khi xét duyệt, người có quyền MUST xem được danh sách ca đã phân công giao với khoảng nghỉ; nếu chưa có lịch, hệ thống MUST báo chưa có ca bị ảnh hưởng.
- **FR-014**: Chỉ admin MUST được tạo, xem, sửa và ngừng sử dụng loại nghỉ dùng chung; tên loại nghỉ MUST duy nhất và đơn cũ MUST giữ được loại đã chọn.
- **FR-015**: Chỉ người gửi, quản lý có quyền xét duyệt theo cửa hàng và admin MUST xem được lý do và tệp đính kèm của đơn.
- **FR-016**: Hệ thống MUST ghi nhận người thực hiện, thời điểm và thay đổi trạng thái khi gửi, hủy, duyệt hoặc từ chối đơn.
- **FR-017**: Khi duyệt đơn trùng ca đã công bố chưa kết thúc, hệ thống MUST không chặn duyệt; ca giao ngày nghỉ MUST chuyển sang “cần người thay”, giữ người được xếp ban đầu trong lịch sử nhưng không tính là ca đang giao, độ phủ hay giờ dự kiến của họ.

### Key Entities *(include if feature involves data)*

- **Loại nghỉ**: tên, trạng thái hoạt động, thông tin có trả lương và quy tắc yêu cầu tệp; dùng chung toàn hệ thống.
- **Đơn nghỉ**: người gửi, cửa hàng, loại nghỉ, ngày bắt đầu/kết thúc, lý do, một tệp tùy chọn, trạng thái, người và thời điểm xét duyệt, ghi chú quyết định.
- **Tư cách tại cửa hàng**: quan hệ của nhân viên/quản lý với cửa hàng để xác định quyền gửi, xem và duyệt đơn.
- **Phân công ca đã có**: dữ liệu được tham chiếu để xem tác động; ca “cần người thay” giữ lịch sử người ban đầu nhưng không còn là phân công đang làm, không tính độ phủ hoặc giờ dự kiến.
- **Lịch sử thao tác**: dấu vết gửi, hủy và xét duyệt đơn để kiểm tra quyết định.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ít nhất 90% nhân viên thử nghiệm gửi thành công một đơn nghỉ hợp lệ trong dưới 2 phút trên giao diện điện thoại mà không cần hướng dẫn ngoài giao diện.
- **SC-002**: Quản lý xem chi tiết và ra quyết định cho một đơn chờ duyệt trong dưới 1 phút khi thông tin cần thiết đã có.
- **SC-003**: 100% yêu cầu xem hoặc xử lý đơn ngoài phạm vi người gửi/cửa hàng được phép bị từ chối.
- **SC-004**: 100% lần tạo, sửa hoặc xác nhận ca sau khi đơn được duyệt không xếp nhân viên vào ngày nghỉ; 100% đơn ở trạng thái khác không tự tạo ràng buộc nghỉ phép; ca lịch sử đã kết thúc trước lúc duyệt không bị sửa.
- **SC-005**: 100% thao tác duyệt, từ chối và hủy tuân theo quy tắc trạng thái và thời điểm, kể cả hai người xét duyệt cùng lúc.
- **SC-006**: 100% đơn có loại nghỉ yêu cầu tệp bị từ chối trước khi gửi nếu thiếu tệp; 100% đơn cũ vẫn xem được loại nghỉ sau khi loại đó ngừng hoạt động.

## Assumptions

- Tài khoản, vai trò, cửa hàng và tư cách làm việc đã có theo [spec nền tảng](../002-shiftly-foundation/spec.md). Tính năng này chỉ áp dụng cho một cửa hàng trên mỗi đơn.
- Khả năng xếp ca và xử lý phân công thuộc [spec lập lịch tuần](../001-shift-scheduling/spec.md). Tính năng nghỉ phép cung cấp trạng thái nghỉ đã duyệt và khoảng ngày cho mọi cửa hàng nơi nhân viên nhận ca; màn hình sửa lịch, đổi ca và thông báo nằm ngoài phạm vi spec này.
- Theo quy tắc PRD được áp dụng cho feature này, duyệt đơn trùng ca đã công bố không bị chặn. Tính năng lập lịch đánh dấu ca chưa kết thúc là “cần người thay”; không tự gán người thay hoặc gửi thông báo trong phạm vi này.
- Quy tắc hủy của PRD được hiểu là: đơn chờ duyệt có thể hủy; đơn đã duyệt chỉ được hủy trước ngày bắt đầu. Không hỗ trợ hủy một phần khoảng nghỉ.
- Khoảng nghỉ được khai báo theo ngày trọn vẹn ở múi giờ của cửa hàng; xin nghỉ theo giờ chưa nằm trong schema hoặc phạm vi này.
- Lý do là trường bắt buộc ở giao diện dù dữ liệu nền cho phép trống; điều này đáp ứng yêu cầu nhân viên nhập lý do trước khi xét duyệt.
- Một đơn có tối đa một tệp theo dữ liệu hiện có. Định dạng và dung lượng tệp cụ thể sẽ được chốt trong kế hoạch triển khai, đồng thời người không có quyền xem đơn không được mở tệp.
- Admin có thể xét duyệt trên mọi cửa hàng theo quyền toàn hệ thống trong PRD, nhưng không tự duyệt đơn do mình gửi.
- Trong bản demo, tệp riêng tư được giữ cùng đơn và lịch sử, không tự hết hạn; sau khi nhân viên nghỉ việc, chỉ quản lý đúng cửa hàng và admin còn quyền xem. Cần chốt thời hạn lưu và quy trình xóa trước khi dùng với dữ liệu thật.

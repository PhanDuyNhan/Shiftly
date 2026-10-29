# Feature Specification: Nền tảng tài khoản và cấu hình cửa hàng Shiftly

**Feature Branch**: `002-shiftly-foundation`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Tạo tính năng nền tảng cho Shiftly gồm đăng nhập và phân quyền theo vai trò/cửa hàng; quản lý cửa hàng, nhân viên, vị trí và kỹ năng; cấu hình ca mẫu và nhu cầu nhân sự tối thiểu/lý tưởng. Chỉ làm các chức năng nền tảng này, không triển khai khai báo lịch bận, xếp ca tự động, chỉnh lịch hay công bố lịch vì chúng đã nằm trong spec lập lịch ca làm tuần. Bám theo PRD và schema DB hiện có; nêu rõ quyền của admin, quản lý và nhân viên."

## Clarifications

### Session 2026-10-28

- Q: Khi nhân viên thuộc nhiều cửa hàng nghỉ việc ở một cửa hàng, tài khoản của họ nên thế nào? → A: Quản lý một cửa hàng ghi nhận nghỉ việc thì tài khoản chuyển sang đã nghỉ việc trên toàn hệ thống.
- Q: Ai được khôi phục tài khoản đã ghi nhận nghỉ việc nếu nhân viên quay lại? → A: Quản lý đã ghi nhận nghỉ việc được khôi phục tài khoản toàn hệ thống.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Đăng nhập và sử dụng đúng quyền (Priority: P1)

Người dùng đăng nhập bằng email hoặc số điện thoại và mật khẩu. Sau khi vào hệ thống, họ chỉ thấy cửa hàng và thao tác được phép theo vai trò hiện tại. Người dùng nhận mật khẩu tạm phải đổi mật khẩu trước khi tiếp tục.

**Why this priority**: Mọi chức năng quản trị đều cần nhận diện người thực hiện và giới hạn quyền trước khi mở dữ liệu nhân sự.

**Independent Test**: Dùng tài khoản admin, quản lý cửa hàng A và nhân viên A để đăng nhập, đổi mật khẩu tạm và thử truy cập dữ liệu cửa hàng B.

**Acceptance Scenarios**:

1. **Given** tài khoản đang hoạt động và thông tin đăng nhập đúng, **When** người dùng đăng nhập bằng email hoặc số điện thoại, **Then** họ vào được phạm vi làm việc phù hợp với vai trò của mình.
2. **Given** tài khoản dùng mật khẩu tạm, **When** đăng nhập lần đầu hoặc sau khi đặt lại mật khẩu, **Then** người dùng phải đổi mật khẩu trước khi thực hiện thao tác quản trị hay xem dữ liệu nhạy cảm.
3. **Given** tài khoản bị khóa hoặc đã nghỉ việc, **When** đăng nhập hoặc tiếp tục sử dụng phiên còn mở, **Then** hệ thống từ chối truy cập.
4. **Given** quản lý chỉ được gán cho cửa hàng A, **When** họ yêu cầu xem hoặc sửa dữ liệu cửa hàng B, **Then** hệ thống từ chối và không trả dữ liệu của B.
5. **Given** nhân viên đang đăng nhập, **When** họ yêu cầu chức năng quản lý cửa hàng, nhân viên khác hoặc cấu hình nhân sự, **Then** hệ thống từ chối.
6. **Given** một định danh đăng nhập có 5 lần nhập sai trong 15 phút, **When** tiếp tục thử trong 15 phút kế tiếp, **Then** hệ thống tạm dừng đăng nhập và hiển thị thông báo không tiết lộ tài khoản có tồn tại hay không.

### User Story 2 - Admin thiết lập cửa hàng, quản lý và vị trí (Priority: P2)

Admin tạo và cập nhật cửa hàng, gán hoặc thu hồi quyền quản lý tại từng cửa hàng, đồng thời duy trì danh mục vị trí dùng chung trong chuỗi. Admin có thể thực hiện các chức năng nền tảng của quản lý ở mọi cửa hàng.

**Why this priority**: Cần có cửa hàng, người phụ trách và vị trí trước khi tạo nhân viên hoặc cấu hình nhu cầu nhân sự.

**Independent Test**: Admin tạo hai cửa hàng và hai vị trí, gán một quản lý cho A; xác nhận người này không có quyền với B, rồi thu hồi quyền ở A.

**Acceptance Scenarios**:

1. **Given** admin đang đăng nhập, **When** tạo cửa hàng với mã duy nhất, tên và thông tin liên hệ, **Then** cửa hàng xuất hiện trong danh sách quản trị và có trạng thái hoạt động.
2. **Given** mã cửa hàng đã tồn tại, **When** admin tạo cửa hàng trùng mã, **Then** hệ thống từ chối và chỉ rõ trường cần sửa.
3. **Given** một tài khoản đang hoạt động, **When** admin gán hoặc thu hồi vai trò quản lý tại A, **Then** quyền ở A thay đổi ngay ở lần yêu cầu kế tiếp và quyền ở cửa hàng khác giữ nguyên.
4. **Given** một vị trí chưa có trong danh mục, **When** admin tạo vị trí, **Then** vị trí sẵn sàng để gán kỹ năng và khai báo nhu cầu tại các cửa hàng.
5. **Given** cửa hàng hoặc vị trí đã được sử dụng, **When** admin ngừng sử dụng, **Then** mục đó không còn được chọn cho cấu hình mới và dữ liệu lịch sử vẫn được giữ.
6. **Given** tên vị trí đã tồn tại, **When** admin tạo vị trí trùng tên, **Then** hệ thống từ chối; admin vẫn có thể thực hiện các thao tác nền tảng của quản lý tại bất kỳ cửa hàng nào.

### User Story 3 - Quản lý nhân viên, hồ sơ và kỹ năng (Priority: P3)

Quản lý tạo tài khoản nhân viên cho cửa hàng mình, gán vị trí/kỹ năng, loại hợp đồng và giờ mục tiêu/giới hạn mỗi tuần. Quản lý có thể cập nhật hồ sơ, khóa/mở tài khoản, đặt lại mật khẩu và ghi nhận nghỉ việc. Nhân viên tự cập nhật các trường hồ sơ cá nhân được phép.

**Why this priority**: Thông tin nhân sự chính xác là điều kiện vận hành và là đầu vào cho tính năng lập lịch sau này.

**Independent Test**: Quản lý A tạo nhân viên, gán kỹ năng, cập nhật giờ mục tiêu và khóa tài khoản; nhân viên thử sửa hồ sơ, còn quản lý B thử sửa tài khoản đó.

**Acceptance Scenarios**:

1. **Given** quản lý được gán cho A, **When** tạo nhân viên với email hoặc số điện thoại chưa dùng và thông tin làm việc hợp lệ, **Then** hệ thống tạo tài khoản gắn với A và cấp mật khẩu tạm chỉ hiển thị một lần.
2. **Given** tài khoản mới hoặc vừa đặt lại mật khẩu, **When** nhân viên đăng nhập, **Then** họ phải đổi mật khẩu trước khi sử dụng tiếp.
3. **Given** nhân viên thuộc A, **When** quản lý A sửa thông tin làm việc, vị trí/kỹ năng hoặc hồ sơ, **Then** thay đổi được lưu; quản lý B không sửa được.
4. **Given** nhân viên đang hoạt động, **When** quản lý A khóa rồi mở tài khoản, **Then** nhân viên bị chặn rồi được đăng nhập lại theo trạng thái mới.
5. **Given** nhân viên thuộc một cửa hàng gốc nghỉ việc, **When** quản lý trực thuộc ghi nhận ngày nghỉ và trạng thái nghỉ việc, **Then** tài khoản bị vô hiệu hóa trên toàn hệ thống ngay từ yêu cầu kế tiếp; ca đã làm tại cửa hàng khác vẫn lưu lịch sử.
6. **Given** nhân viên tự sửa hồ sơ, **When** họ đổi tên hiển thị, số điện thoại, địa chỉ, ảnh đại diện, liên hệ khẩn cấp hoặc thông tin ngân hàng, **Then** chỉ trường của chính họ được cập nhật; họ không thể tự đổi vai trò, kỹ năng, cửa hàng hay giới hạn giờ.
7. **Given** hai quản lý cùng thuộc một cửa hàng, **When** quản lý không trực tiếp phụ trách nhân viên muốn xem hoặc sửa hồ sơ của người đó, **Then** hệ thống từ chối; admin có thể chuyển quản lý trực thuộc có ghi lịch sử.
8. **Given** quản lý đặt lại mật khẩu hoặc thay đổi trạng thái nhân viên, **When** thao tác hoàn tất, **Then** lịch sử ghi người thực hiện, thời điểm và nội dung thay đổi.
9. **Given** tài khoản đã nghỉ việc do quản lý A ghi nhận, **When** chính quản lý A vẫn có quyền tại cửa hàng gốc khôi phục tài khoản, **Then** tài khoản hoạt động lại toàn hệ thống, tư cách tại cửa hàng gốc được mở lại và lịch sử ghi người/thời điểm/giá trị trước sau; quản lý khác không được thực hiện thao tác này.

### User Story 4 - Cấu hình ca mẫu và nhu cầu nhân sự (Priority: P4)

Quản lý khai báo ca mẫu của cửa hàng, rồi đặt số nhân sự tối thiểu và lý tưởng theo thứ trong tuần, ca và vị trí. Admin có thể cấu hình tương tự cho mọi cửa hàng.

**Why this priority**: Nhu cầu theo ca và vị trí xác định cửa hàng cần bao nhiêu người cho tính năng lập lịch sau này.

**Independent Test**: Quản lý tạo ca sáng và ca tối qua đêm, khai báo nhu cầu Thứ 7 cho hai vị trí, sửa số lượng và thử thao tác ngoài quyền.

**Acceptance Scenarios**:

1. **Given** quản lý A, **When** tạo ca mẫu với tên duy nhất trong A và giờ bắt đầu/kết thúc, **Then** ca được lưu; giờ kết thúc sớm hơn hoặc bằng giờ bắt đầu được hiểu là ngày hôm sau.
2. **Given** vị trí còn hoạt động và ca mẫu thuộc A, **When** quản lý khai báo nhu cầu cho một thứ trong tuần, **Then** hệ thống lưu số tối thiểu và lý tưởng cho đúng tổ hợp ngày, ca, vị trí.
3. **Given** nhu cầu có số tối thiểu âm hoặc lý tưởng thấp hơn tối thiểu, **When** quản lý lưu, **Then** hệ thống từ chối và nêu giá trị hợp lệ.
4. **Given** tổ hợp thứ, ca và vị trí đã có nhu cầu, **When** quản lý tạo bản ghi trùng, **Then** hệ thống yêu cầu sửa bản hiện có.
5. **Given** ca mẫu đã dùng trong dữ liệu khác, **When** quản lý ngừng sử dụng, **Then** ca không còn được chọn cho cấu hình mới và thông tin cũ vẫn xem được theo quyền.
6. **Given** nhân viên hoặc quản lý cửa hàng B, **When** họ thử đổi cấu hình của A, **Then** hệ thống từ chối.
7. **Given** nhu cầu của một tổ hợp đã lưu, **When** quản lý sửa hoặc xóa nhu cầu đó, **Then** cấu hình hiện tại thay đổi và lịch sử ghi lại thao tác.

### Edge Cases

- Nhân viên có đúng một cửa hàng gốc và một quản lý trực thuộc đang hiệu lực. Ca làm ở cửa hàng khác không tạo thêm tư cách nhân viên ở đó; quyền quản lý vẫn theo cửa hàng được gán.
- Admin cũng có tư cách nhân viên/quản lý tại một cửa hàng: quyền admin vẫn áp dụng toàn hệ thống, còn thông tin làm việc gắn với từng cửa hàng.
- Email hoặc số điện thoại trùng tài khoản đã tồn tại, kể cả tài khoản bị khóa/nghỉ việc: không tạo tài khoản thứ hai trùng định danh.
- Chỉ có email hoặc chỉ có số điện thoại: vẫn tạo tài khoản và đăng nhập được bằng định danh đã lưu.
- Thu hồi quyền quản lý, khóa tài khoản hoặc cho nghỉ việc khi đang có phiên đăng nhập: quyền mới có hiệu lực từ yêu cầu tiếp theo.
- Quản lý trực thuộc ghi nhận nghỉ việc: trạng thái tài khoản chuyển thành đã nghỉ việc toàn hệ thống; tư cách cũ và ca tại các cửa hàng khác vẫn được giữ làm lịch sử.
- Khôi phục tài khoản đã nghỉ việc: trong nhóm quản lý, chỉ người đã ghi nhận quyết định nghỉ việc và còn quyền tại cửa hàng gốc được khôi phục; admin giữ quyền toàn hệ thống. Tư cách cửa hàng gốc mở lại, tư cách cửa hàng khác giữ nguyên trạng thái đã có trước đó.
- Cửa hàng hoặc vị trí ngừng hoạt động: giữ dữ liệu đã liên kết, không cho dùng khi tạo cấu hình mới.
- Nhân viên không có vị trí/kỹ năng: lưu được hồ sơ nhưng hiển thị cảnh báo chưa đủ dữ liệu cho lập lịch.
- Nhu cầu tối thiểu và lý tưởng cùng bằng 0: hợp lệ; ca qua đêm được hiển thị rõ theo múi giờ cửa hàng.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cho phép tài khoản đang hoạt động đăng nhập bằng email hoặc số điện thoại và mật khẩu, và đăng xuất khỏi phiên hiện tại.
- **FR-002**: Hệ thống MUST yêu cầu đổi mật khẩu tạm ở lần đăng nhập đầu tiên và sau khi đặt lại mật khẩu trước khi cho truy cập chức năng khác.
- **FR-003**: Admin, hoặc quản lý trong cửa hàng được gán, MUST có thể đặt lại mật khẩu, khóa/mở tài khoản nhân viên thuộc phạm vi quyền; các hành động này được ghi nhận.
- **FR-004**: Hệ thống MUST từ chối đăng nhập và phiên hiện có của tài khoản bị khóa hoặc đã nghỉ việc; thay đổi quyền có hiệu lực ở yêu cầu kế tiếp.
- **FR-005**: Hệ thống MUST tạm dừng đăng nhập 15 phút sau 5 lần nhập sai cho cùng định danh trong 15 phút và không tiết lộ một email/số điện thoại có tồn tại qua thông báo lỗi đăng nhập.
- **FR-006**: Hệ thống MUST xác định admin toàn hệ thống và vai trò quản lý/nhân viên theo từng cửa hàng; mọi thao tác xem/sửa phải kiểm tra cả vai trò lẫn cửa hàng.
- **FR-007**: Chỉ admin MUST được tạo, xem, cập nhật và ngừng sử dụng cửa hàng, gán/thu hồi quyền quản lý tại cửa hàng.
- **FR-008**: Chỉ admin MUST được tạo, xem, cập nhật và ngừng sử dụng vị trí toàn chuỗi; mã cửa hàng và tên vị trí không được trùng trong phạm vi tương ứng.
- **FR-009**: Admin MUST thực hiện được mọi chức năng nền tảng của quản lý ở mọi cửa hàng.
- **FR-010**: Quản lý MUST chỉ quản lý nhân viên, ca mẫu và nhu cầu tại cửa hàng được gán; không được tạo cửa hàng, sửa danh mục vị trí toàn chuỗi hoặc tự nâng quyền.
- **FR-011**: Quản lý MUST tạo được nhân viên cho cửa hàng mình với ít nhất một định danh đăng nhập duy nhất, mật khẩu tạm và hồ sơ bắt buộc.
- **FR-012**: Quản lý MUST xem/sửa hồ sơ nhân viên trong phạm vi cửa hàng, loại hợp đồng, giờ mục tiêu không âm, giới hạn giờ tuần dương và mức kỹ năng từ 1 đến 5 tại từng vị trí.
- **FR-013**: Quản lý trực thuộc MUST ghi nhận được nhân viên nghỉ việc tại cửa hàng gốc; thao tác này MUST đặt tài khoản thành đã nghỉ việc trên toàn hệ thống từ yêu cầu kế tiếp. Hồ sơ, tư cách cũ và ca ở cửa hàng khác MUST được giữ làm lịch sử.
- **FR-014**: Nhân viên MUST chỉ xem/sửa hồ sơ cá nhân của mình đối với tên hiển thị, số điện thoại, địa chỉ, ảnh đại diện, liên hệ khẩn cấp, thông tin ngân hàng; không được tự sửa vai trò, cửa hàng, kỹ năng, loại hợp đồng hoặc giờ làm.
- **FR-015**: Hệ thống MUST chỉ cho chính chủ, quản lý cửa hàng có nhân viên đó và admin xem thông tin cá nhân nhạy cảm.
- **FR-016**: Quản lý trực thuộc và admin MUST sửa được kỹ năng của nhân viên; quản lý khác, kể cả trong cùng cửa hàng, MUST không được sửa.
- **FR-017**: Quản lý và admin MUST tạo, xem, cập nhật và ngừng sử dụng được ca mẫu trong phạm vi quyền; tên ca không được trùng trong cùng cửa hàng.
- **FR-018**: Hệ thống MUST cho phép ca mẫu kết thúc vào ngày hôm sau và thể hiện rõ điều đó khi cấu hình.
- **FR-019**: Quản lý và admin MUST đặt, xem, sửa và xóa nhu cầu nhân sự theo thứ, ca mẫu, vị trí, gồm số tối thiểu và lý tưởng.
- **FR-020**: Hệ thống MUST chỉ chấp nhận số nguyên không âm, số lý tưởng không nhỏ hơn số tối thiểu và tối đa một cấu hình cho mỗi tổ hợp cửa hàng, thứ, ca, vị trí.
- **FR-021**: Hệ thống MUST không cho chọn cửa hàng, vị trí hay ca mẫu đã ngừng sử dụng khi tạo cấu hình mới, đồng thời giữ dữ liệu liên kết trước đó.
- **FR-022**: Hệ thống MUST ghi lại người thực hiện, thời điểm và thay đổi khi gán/thu hồi quản lý, tạo/khóa/cho nghỉ việc tài khoản và sửa ca mẫu/nhu cầu.
- **FR-023**: Trong nhóm quản lý, chỉ người đã ghi nhận nghỉ việc và vẫn còn quyền quản lý tại cửa hàng gốc MUST được khôi phục tài khoản đó từ trạng thái đã nghỉ việc sang hoạt động trên toàn hệ thống, đồng thời mở lại tư cách tại cửa hàng gốc; admin có quyền thực hiện theo FR-009. Hệ thống MUST giữ nguyên tư cách ở cửa hàng khác và ghi lịch sử người thực hiện, thời điểm, trạng thái trước/sau; quản lý khác không được khôi phục thay.
- **FR-024**: Mỗi nhân viên MUST có tối đa một tư cách nhân viên đang hiệu lực tại một cửa hàng gốc và đúng một quản lý trực thuộc; hệ thống MUST giữ tư cách cũ làm lịch sử khi hợp nhất dữ liệu.
- **FR-025**: Chỉ quản lý trực thuộc và admin MUST được xem/sửa hồ sơ, đặt lại mật khẩu, xử lý trạng thái và xét duyệt đơn nghỉ của nhân viên; admin MUST chuyển được quản lý trực thuộc và ghi audit.
- **FR-026**: Làm ca tại cửa hàng khác MUST không tự tạo tư cách nhân viên hoặc đổi quản lý trực thuộc.

### Quyền theo vai trò trong phạm vi tính năng

| Hành động | Admin | Quản lý cửa hàng | Nhân viên |
| --- | --- | --- | --- |
| Đăng nhập, đổi mật khẩu, sửa hồ sơ cá nhân được phép | Có | Có | Có |
| Tạo/ngừng sử dụng cửa hàng; gán/thu hồi quản lý | Mọi cửa hàng | Không | Không |
| Quản lý danh mục vị trí toàn chuỗi | Có | Chỉ xem để gán kỹ năng/nhu cầu | Không |
| Tạo/sửa/khóa/cho nghỉ việc tài khoản nhân viên | Mọi cửa hàng | Cửa hàng được gán | Không |
| Khôi phục tài khoản đã nghỉ việc | Mọi cửa hàng | Chỉ quản lý đã ghi nhận nghỉ việc và còn quyền tại cửa hàng gốc | Không |
| Sửa kỹ năng nhân viên ở một cửa hàng | Có | Có | Không |
| Sửa kỹ năng nhân viên do quản lý khác phụ trách | Có | Không | Không |
| Cấu hình ca mẫu và nhu cầu nhân sự | Mọi cửa hàng | Cửa hàng được gán | Không |
| Xem thông tin cá nhân nhạy cảm | Theo phạm vi quản trị | Nhân viên của cửa hàng được gán | Chỉ của mình |

### Key Entities *(include if feature involves data)*

- **Cửa hàng**: mã duy nhất, tên, liên hệ, múi giờ và trạng thái hoạt động.
- **Tài khoản**: email và/hoặc số điện thoại, trạng thái hoạt động/khóa/nghỉ việc, quyền admin toàn hệ thống và trạng thái cần đổi mật khẩu.
- **Hồ sơ nhân viên**: họ tên, tên hiển thị, liên hệ, ảnh và thông tin riêng tư; gắn với một tài khoản.
- **Tư cách tại cửa hàng**: liên kết người với cửa hàng, vai trò nhân viên/quản lý, loại hợp đồng, giờ mục tiêu/giới hạn và ngày bắt đầu/kết thúc.
- **Vị trí và kỹ năng**: danh mục vị trí dùng chung, mức kỹ năng của người ở từng vị trí.
- **Ca mẫu**: tên, giờ bắt đầu/kết thúc, dấu hiệu ca cao điểm/ca bất tiện và trạng thái tại một cửa hàng.
- **Nhu cầu nhân sự**: số tối thiểu/lý tưởng cho một thứ trong tuần, ca mẫu, vị trí và cửa hàng.
- **Lịch sử thay đổi**: người thực hiện, đối tượng, thời điểm và nội dung thay đổi quan trọng.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Trong bộ tình huống phân quyền gồm truy cập chéo cửa hàng và tài khoản bị thu hồi quyền, 100% thao tác ngoài phạm vi bị từ chối.
- **SC-002**: 100% tài khoản mới hoặc vừa đặt lại mật khẩu phải đổi mật khẩu tạm trước khi truy cập dữ liệu nhân sự.
- **SC-003**: Admin thiết lập một cửa hàng, gán một quản lý và tạo hai vị trí trong không quá 5 phút khi đã có dữ liệu cần nhập.
- **SC-004**: Quản lý tạo một nhân viên với hồ sơ, tư cách làm việc và ít nhất một kỹ năng trong không quá 3 phút khi đã có dữ liệu cần nhập.
- **SC-005**: Quản lý cấu hình ba ca mẫu và nhu cầu cho một ngày gồm hai vị trí trong không quá 5 phút.
- **SC-006**: 100% cấu hình nhu cầu có số âm, số lý tưởng thấp hơn tối thiểu hoặc trùng tổ hợp được phát hiện và thông báo trước khi lưu.
- **SC-007**: Ít nhất 90% người tham gia đánh giá hoàn thành đúng tác vụ thuộc vai trò của họ ngay lần đầu mà không cần hướng dẫn ngoài giao diện.
- **SC-008**: 100% bản ghi cửa hàng, vị trí và tài khoản đã ngừng sử dụng vẫn còn thông tin lịch sử cho người có quyền xem.

## Assumptions

- Spec này cung cấp dữ liệu và quyền cho [spec lập lịch ca làm tuần](../001-shift-scheduling/spec.md). Khai báo lịch bận, đăng ký ca, nghỉ phép, tạo/chỉnh/công bố lịch, solver, báo cáo lịch và AI nằm ngoài phạm vi tính năng nền tảng.
- Tài khoản admin đầu tiên được cấp khi khởi tạo hệ thống; không có đăng ký công khai hoặc chức năng tự nâng thành admin.
- Quyền admin là quyền toàn hệ thống; vai trò nhân viên/quản lý là tư cách riêng tại từng cửa hàng, phù hợp với PRD và schema hiện có.
- Mỗi nhân viên có một cửa hàng gốc và một quản lý trực thuộc. Ca làm tại cửa hàng khác là phân công của lịch, không phải một tư cách nhân viên thứ hai.
- Quyết định nghỉ việc của quản lý tại một cửa hàng có hiệu lực lên tài khoản toàn hệ thống theo FR-013; tư cách tại các cửa hàng khác được giữ làm lịch sử, không tiếp tục cấp quyền cho tài khoản đã nghỉ việc.
- Quản lý ghi nhận nghỉ việc được xác định từ lịch sử thao tác; chỉ người đó, khi vẫn giữ quyền ở cửa hàng gốc, được khôi phục theo FR-023. Admin có quyền khôi phục theo FR-009. Việc khôi phục không tự đổi tư cách ở các cửa hàng khác.
- Kỹ năng gắn với người trên toàn chuỗi; quản lý trực thuộc và admin được cập nhật. Loại hợp đồng và giờ mục tiêu/giới hạn thuộc tư cách ở cửa hàng gốc.
- Ngừng sử dụng cửa hàng, vị trí hoặc ca mẫu là đổi trạng thái để giữ tham chiếu lịch sử; chỉ dữ liệu chưa được sử dụng mới có thể bị xóa hẳn nếu giai đoạn triển khai cần.
- Tên hiển thị và liên hệ cá nhân do nhân viên tự sửa; họ tên pháp lý, vai trò và thông tin làm việc do người có quyền quản lý sửa.
- Ngưỡng giờ làm và quy tắc lập lịch được xác định trong spec lập lịch; phạm vi này chỉ lưu thông tin nhân sự và nhu cầu cần thiết cho chúng.
- Ngưỡng tạm dừng đăng nhập trong FR-005 là mặc định cho bản đầu; admin chưa cần màn hình chỉnh ngưỡng này.

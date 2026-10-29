# Shiftly — PRD + DB: Hệ thống quản lý ca làm & nhân sự cho chuỗi quán cà phê / trà sữa

**Phiên bản:** 0.1 (draft) · **Điểm nhấn:** Xếp ca tự động có ràng buộc · **Ngoài phạm vi:** chấm công, tính lương (các quán đã có máy chấm công)

---

## 1. Tổng quan

### 1.1 Vấn đề

Quản lý quán thường xếp ca bằng Zalo/Excel: nhân viên nhắn lịch bận rời rạc, quản lý phải tự đối chiếu, dễ xếp trùng, thiếu người giờ cao điểm, chia giờ không đều gây bất mãn, và không có dấu vết khi đổi ca/xin nghỉ.

### 1.2 Mục tiêu

1. Nhân viên tự khai báo lịch bận, ca mong muốn, xin nghỉ trên điện thoại.
2. Quản lý nhận **lịch tuần được gợi ý tự động**, chỉnh tay rồi công bố trong vài phút thay vì vài giờ.
3. Mọi thay đổi có luồng duyệt, thông báo và lịch sử.
4. Hỗ trợ chuỗi nhiều chi nhánh với phân quyền rõ ràng.

### 1.3 Chỉ số thành công (dùng để demo)

- Thời gian tạo lịch tuần: từ \~60 phút (thủ công) xuống < 5 phút.
- 100% ca được xếp không vi phạm ràng buộc cứng.
- Độ lệch giờ làm giữa các nhân viên cùng loại hợp đồng < 15%.
- Tỉ lệ ca được xếp đúng ca mong muốn ≥ 70% (dữ liệu demo).

### 1.4 Non-goals

Chấm công, tính lương, POS/bán hàng, tuyển dụng, hợp đồng lao động.

---

## 2. Vai trò & phân quyền

| Chức năng | Nhân viên | Quản lý cửa hàng | Admin |
| --- | :-: | :-: | :-: |
| Xem lịch làm của mình | ✅ | ✅ | ✅ |
| Xem lịch cả cửa hàng | ✅ (chỉ xem) | ✅ | ✅ |
| Khai báo lịch bận / ca mong muốn | ✅ | – | ✅ |
| Xin nghỉ phép | ✅ | – | ✅ |
| Đề nghị đổi ca / nhường ca | ✅ | – | ✅ |
| Sửa hồ sơ cá nhân (giới hạn trường) | ✅ | ✅ | ✅ |
| Duyệt nghỉ phép, duyệt đổi ca | – | ✅ (cửa hàng mình) | ✅ |
| Cấu hình ca mẫu, nhu cầu nhân sự | – | ✅ (cửa hàng mình) | ✅ |
| Chạy xếp ca tự động, chỉnh, công bố lịch | – | ✅ (cửa hàng mình) | ✅ |
| Tạo / khoá tài khoản nhân viên | – | ✅ (cửa hàng mình) | ✅ |
| Sửa hồ sơ nhân viên | – | ✅ (cửa hàng mình) | ✅ |
| Quản lý cửa hàng, quản lý, vị trí, loại nghỉ | – | – | ✅ |
| Điều động nhân viên giữa chi nhánh | – | – | ✅ |
| Xem audit log toàn hệ thống, báo cáo toàn chuỗi | – | – | ✅ |

**Nguyên tắc:** quyền kiểm tra ở tầng server theo (role, store\_id); quản lý chỉ thao tác trên cửa hàng được gán.

---

## 3. Yêu cầu chức năng

Ưu tiên: **P0** = bắt buộc cho MVP, **P1** = nên có, **P2** = mở rộng.

### 3.1 Xác thực & tài khoản

| ID | Yêu cầu | Ưu tiên |
| --- | --- | :-: |
| AUTH-1 | Đăng nhập email/SĐT + mật khẩu; JWT/session, refresh token | P0 |
| AUTH-2 | Quản lý tạo tài khoản nhân viên, sinh mật khẩu tạm; bắt đổi mật khẩu lần đầu | P0 |
| AUTH-3 | Khoá/mở tài khoản, đặt lại mật khẩu | P0 |
| AUTH-4 | Rate limit đăng nhập, hash argon2/bcrypt | P1 |

### 3.2 Nhân viên

| ID | Yêu cầu | Ưu tiên |
| --- | --- | :-: |
| EMP-1 | Xem lịch làm theo tuần/tháng, màu theo ca/vị trí | P0 |
| EMP-2 | Khai báo **lịch bận lặp lại** theo thứ (VD: T2–T6 bận 8h–16h vì đi học) | P0 |
| EMP-3 | Khai báo **ngoại lệ theo ngày** (bận / rảnh đột xuất) | P0 |
| EMP-4 | **Đăng ký ca** cho tuần kế tiếp: chọn ca muốn làm, mức ưu tiên (rất muốn / bình thường / ngại) | P0 |
| EMP-5 | Xin nghỉ phép: chọn loại, khoảng ngày, lý do, đính kèm file (tuỳ chọn); theo dõi trạng thái | P0 |
| EMP-6 | Cập nhật thông tin cá nhân: họ tên hiển thị, SĐT, địa chỉ, liên hệ khẩn cấp, ảnh đại diện, tài khoản ngân hàng | P0 |
| EMP-7 | Đề nghị đổi ca với đồng nghiệp cùng vị trí; đồng nghiệp đồng ý → quản lý duyệt | P1 |
| EMP-8 | Nhường ca lên “bảng ca trống”, người khác nhận ca | P1 |
| EMP-9 | Nhận thông báo (lịch mới công bố, duyệt/từ chối, đổi ca); xem tổng giờ dự kiến trong tuần | P1 |
| EMP-10 | Xuất lịch sang Google Calendar (ICS) | P2 |

**Quy tắc:** hạn chót đăng ký ca/lịch bận cho tuần N+1 do quản lý cấu hình (VD: 20h Chủ nhật tuần N−1); sau hạn, nhân viên chỉ gửi yêu cầu xin nghỉ/đổi ca.

### 3.3 Quản lý cửa hàng

| ID | Yêu cầu | Ưu tiên |
| --- | --- | :-: |
| MGR-1 | CRUD **ca mẫu** (Sáng 6–12, Chiều 12–18, Tối 18–23…) | P0 |
| MGR-2 | Khai báo **nhu cầu nhân sự**: theo thứ × ca × vị trí, có min và ideal (VD: T7 ca tối cần 2 pha chế, 1 thu ngân, 3 phục vụ) | P0 |
| MGR-3 | Xem tổng hợp lịch bận/đăng ký ca của cả cửa hàng (heatmap độ phủ nhân sự) | P0 |
| MGR-4 | **Chạy xếp ca tự động** cho tuần chọn → ra bản nháp + báo cáo (ca thiếu người, cảnh báo, điểm công bằng) | P0 |
| MGR-5 | Chỉnh tay bản nháp (kéo-thả); hệ thống kiểm tra ràng buộc realtime và cảnh báo vi phạm | P0 |
| MGR-6 | Khoá một số ca đã chốt (pinned) để lần chạy lại không thay đổi | P1 |
| MGR-7 | Công bố lịch → gửi thông báo; lịch đã công bố chỉ sửa qua “chỉnh sửa có ghi lý do” | P0 |
| MGR-8 | Duyệt / từ chối nghỉ phép (xem tác động: ca nào bị thiếu người nếu duyệt) | P0 |
| MGR-9 | Duyệt đổi ca; gợi ý người thay thế khi có người báo nghỉ gấp | P1 |
| MGR-10 | Tạo tài khoản nhân viên, gán vị trí/kỹ năng, loại hợp đồng, số giờ mục tiêu/tuần | P0 |
| MGR-11 | Sửa hồ sơ nhân viên, khoá tài khoản, cho nghỉ việc (giữ lịch sử) | P0 |
| MGR-12 | Cấu hình ràng buộc cửa hàng (giờ tối đa/ngày, nghỉ giữa ca…) | P1 |
| MGR-13 | Báo cáo: tổng giờ theo nhân viên, độ phủ ca, số ca thiếu, tỉ lệ nghỉ | P1 |
| MGR-14 | Sao chép lịch tuần trước làm mẫu | P1 |

### 3.4 Admin

| ID | Yêu cầu | Ưu tiên |
| --- | --- | :-: |
| ADM-1 | Toàn quyền mọi chức năng của Quản lý trên mọi cửa hàng | P0 |
| ADM-2 | CRUD cửa hàng, gán quản lý vào cửa hàng | P0 |
| ADM-3 | CRUD danh mục: vị trí, loại nghỉ phép, mặc định ràng buộc toàn chuỗi | P0 |
| ADM-4 | Điều động nhân viên sang chi nhánh khác (đa chi nhánh) | P1 |
| ADM-5 | Xem audit log, lọc theo người/đối tượng/thời gian | P1 |
| ADM-6 | Dashboard toàn chuỗi (độ phủ, giờ làm, nghỉ phép, chi nhánh thiếu người) | P1 |

---

## 4. Xếp ca tự động (tính năng cốt lõi)

### 4.1 Bài toán

Cho một cửa hàng và một tuần, gán nhân viên vào các **slot** (ngày × ca × vị trí × số lượng cần) sao cho thoả mọi ràng buộc cứng và tối ưu các ràng buộc mềm.

### 4.2 Đầu vào

- Slot cần phủ (từ nhu cầu nhân sự, sinh theo tuần).
- Danh sách nhân viên đang làm tại cửa hàng + vị trí/kỹ năng + loại hợp đồng + giờ mục tiêu.
- Lịch bận lặp lại, ngoại lệ theo ngày, nghỉ phép đã duyệt.
- Đăng ký ca mong muốn kèm mức ưu tiên.
- Ca đã khoá (pinned) và lịch tuần trước (để tính ca cuối tuần trước, tính ổn định).
- Cấu hình ràng buộc của cửa hàng.

### 4.3 Ràng buộc cứng (không được vi phạm)

| Mã | Ràng buộc | Mặc định |
| --- | --- | --- |
| H1 | Không xếp vào thời gian nhân viên báo bận hoặc nghỉ phép đã duyệt | – |
| H2 | Một người không làm hai ca trùng/chồng giờ | – |
| H3 | Chỉ xếp đúng vị trí nhân viên đủ kỹ năng | – |
| H4 | Tối đa giờ/ngày | 10h |
| H5 | Tối đa giờ/tuần theo hợp đồng | 48h (full-time), cấu hình theo từng người |
| H6 | Nghỉ tối thiểu giữa hai ca liên tiếp ở hai ngày | 10h |
| H7 | Mỗi tuần có ít nhất 1 ngày nghỉ liên tục 24h | bật |
| H8 | Không vượt số slot tối thiểu còn thiếu nếu không đủ người (cho phép để trống và báo cáo, không xếp sai) | – |
| H9 | Tôn trọng ca đã khoá (pinned) | – |

Các ngưỡng giờ/nghỉ là **cấu hình**, không hard-code, vì quy định lao động và chính sách mỗi chuỗi có thể khác. Nên đối chiếu với quy định hiện hành khi triển khai thật.

### 4.4 Ràng buộc mềm (tối ưu, có trọng số chỉnh được)

| Mã | Mục tiêu | Trọng số gợi ý |
| --- | --- | :-: |
| S1 | Phủ tới mức ideal (không chỉ min) | cao |
| S2 | Ưu tiên ca nhân viên “rất muốn”, tránh ca “ngại” | cao |
| S3 | Công bằng: giờ thực tế gần giờ mục tiêu, lệch thấp giữa người cùng loại hợp đồng | cao |
| S4 | Công bằng ca xấu (tối muộn, cuối tuần, lễ) luân phiên | trung bình |
| S5 | Tránh “đóng ca tối rồi mở ca sáng” | trung bình |
| S6 | Hạn chế ca lẻ (một ngày chỉ làm 1 ca ngắn) và ngày làm rời rạc | thấp |
| S7 | Ổn định so với lịch tuần trước (ít xáo trộn) | thấp |

### 4.5 Thuật toán

- **MVP (P0):** greedy có heuristic — sắp slot theo độ khan hiếm (ít ứng viên nhất xếp trước), chọn người có điểm cao nhất (ưu tiên mong muốn + còn thiếu giờ), kèm bước cải thiện cục bộ (swap).
- **Bản chính (P1):** mô hình hoá bằng **CP-SAT (Google OR-Tools)**: biến nhị phân `x[nv, slot]`, hàm mục tiêu = tổng trọng số mềm, ràng buộc cứng viết trực tiếp. Chạy trong service Python riêng, giới hạn thời gian 10–30s, trả nghiệm tốt nhất tìm được.
- **Giải thích được (explainability):** với mỗi slot để trống hoặc xếp kém, trả về lý do (VD: “thiếu pha chế rảnh T7 ca tối: A bận, B đủ 48h, C nghỉ phép”).
- **Chỉnh tay:** mọi thay đổi chạy lại bộ kiểm tra ràng buộc (cùng logic với solver) và hiện cảnh báo tại chỗ.

### 4.6 Đầu ra

Bản nháp lịch (`schedule` trạng thái draft) + `schedule_run` ghi lại tham số, điểm, thời gian chạy, danh sách cảnh báo và slot chưa phủ.

### 4.7 Luồng

1. Nhân viên khai báo lịch bận và đăng ký ca trước hạn.
2. Quản lý mở “Tạo lịch tuần” → hệ thống sinh slot từ nhu cầu nhân sự.
3. Quản lý bấm “Xếp tự động” → xem bản nháp, điểm, cảnh báo.
4. Chỉnh tay / khoá ca / chạy lại.
5. Công bố → thông báo cho nhân viên.
6. Sau công bố: nghỉ gấp / đổi ca đi qua luồng duyệt; hệ thống gợi ý người thay thế.

---

## 4A. AI hỗ trợ

AI đóng vai **trợ lý nhập liệu, truy vấn và giải thích**, còn việc xếp ca vẫn do solver (mục 4) quyết định để kết quả kiểm chứng được. LLM không tự sửa lịch: mọi thao tác ghi đều thành một đề xuất và chỉ có hiệu lực khi người dùng bấm xác nhận.

### 4A.1 Tính năng

| ID | Tính năng | Dùng cho | Ưu tiên |
| --- | --- | --- | :-: |
| AI-1 | **Nhập lịch bận bằng tiếng Việt tự nhiên**: “T2 đến T6 mình bận 8h–16h vì đi học, thứ 7 tuần sau nghỉ cả ngày” → tách thành `availability_rules` / `availability_exceptions`, hiện bản xem trước để xác nhận | Nhân viên | P0 |
| AI-2 | **Giải thích lịch**: biến cảnh báo của solver thành câu dễ hiểu (“Thiếu 1 pha chế T7 ca tối vì A bận, B đã đủ 48h, C nghỉ phép”) và trả lời “vì sao tôi bị xếp ca này?” | Quản lý, nhân viên | P0 |
| AI-3 | **Hỏi đáp về lịch và nhân sự** bằng lời: “tuần sau ai rảnh T7 tối?”, “ai đang thiếu giờ so với mục tiêu?”, “ca nào đang thiếu người?” | Quản lý | P1 |
| AI-4 | **Gợi ý người thay thế** khi có người báo nghỉ gấp: xếp hạng ứng viên theo luật (rảnh, đúng vị trí, không vượt giờ, công bằng) rồi soạn sẵn tin nhắn mời nhận ca | Quản lý | P1 |
| AI-5 | **Dự báo nhu cầu nhân sự** theo ngày và khung giờ từ lịch sử đơn hàng, đề xuất `staffing_requirements` cho tuần tới | Quản lý, admin | P1 |
| AI-6 | **Trợ lý duyệt nghỉ phép**: tóm tắt tác động (ca nào thiếu người, ai có thể thay) kèm gợi ý duyệt hoặc từ chối; quyết định vẫn là của quản lý | Quản lý | P2 |
| AI-7 | **Phát hiện bất thường**: ai liên tục xin nghỉ cùng ngày trong tuần, ca tối lệch nặng về một người, chi nhánh thiếu người kéo dài | Admin | P2 |

### 4A.2 Nguyên tắc thiết kế

1. **Việc cần chính xác thì để code làm, việc cần hiểu ngôn ngữ thì để LLM làm.** Kiểm tra ràng buộc, xếp ca, tính giờ chạy bằng solver và SQL. LLM chỉ hiểu câu hỏi, gọi công cụ và diễn đạt lại kết quả.
2. **LLM chỉ gọi công cụ (tool calling) qua API nội bộ bằng quyền của chính người đang chat.** Nhân viên không thể hỏi ra lịch bận hay dữ liệu cá nhân của người khác, quản lý không vượt khỏi cửa hàng mình.
3. **Đọc thì tự động, ghi thì phải xác nhận.** Mọi thao tác ghi tạo một `ai_action_proposals` ở trạng thái `pending`, hiện bản xem trước trước khi áp dụng và ghi vào `audit_logs`.
4. **Không đưa dữ liệu nhạy cảm vào prompt**: không gửi tài khoản ngân hàng, địa chỉ, liên hệ khẩn cấp; chỉ gửi trường tối thiểu cần để trả lời.
5. **Có phương án dự phòng**: LLM lỗi hoặc hết hạn mức thì các form thường vẫn dùng được; AI chỉ là lớp tiện lợi thêm vào.

### 4A.3 Công cụ trợ lý được phép gọi

| Công cụ | Loại | Ghi chú |
| --- | --- | --- |
| `get_my_schedule(week)` | đọc | Mọi role, chỉ dữ liệu của mình |
| `get_store_schedule(week)` | đọc | Quản lý/admin, theo cửa hàng được phép |
| `find_available_staff(date, shift, position)` | đọc | Dùng chung bộ lọc với AI-4 |
| `get_hours_summary(week)` | đọc | Giờ thực tế so với giờ mục tiêu |
| `explain_assignment(assignment_id)` | đọc | Lấy lý do từ `schedule_runs.warnings` |
| `propose_availability(items[])` | ghi (cần xác nhận) | Kết quả của AI-1 |
| `propose_cover(assignment_id, user_id)` | ghi (cần xác nhận) | Kết quả của AI-4 |
| `propose_auto_assign(week, options)` | ghi (cần xác nhận) | Chỉ gọi solver, không tự xếp |

### 4A.4 Dự báo nhu cầu (AI-5)

- **Dữ liệu vào:** số đơn (hoặc doanh thu) theo giờ, nhập bằng CSV xuất từ POS của quán; chưa tích hợp POS trực tiếp ở giai đoạn đầu.
- **Mô hình:** baseline là trung bình theo (thứ × giờ) có hiệu chỉnh xu hướng; sau đó thử mô hình chuỗi thời gian (Prophet hoặc gradient boosting) với đặc trưng ngày lễ, cuối tuần, thời tiết (tuỳ chọn).
- **Đầu ra:** dự báo kèm khoảng tin cậy, quy đổi thành số người cần theo vị trí bằng năng suất mỗi người (đơn/giờ, cấu hình theo cửa hàng), lưu thành `staffing_suggestions` để quản lý chấp nhận hoặc sửa.
- **Đo chất lượng:** MAPE theo khung giờ trên tập kiểm thử giữ lại 4 tuần cuối; phải tốt hơn baseline thì mới bật gợi ý.

### 4A.5 Đánh giá & vận hành

- **Bộ kiểm thử tiếng Việt cho AI-1:** tối thiểu 100 câu (viết tắt, thiếu dấu, “T2–T6”, “tuần sau”, “sau 5h chiều”, “nghỉ hẳn thứ 7”), đo tỉ lệ tách đúng; mục tiêu ≥ 90% đúng hoàn toàn, phần còn lại phải hỏi lại thay vì đoán.
- **An toàn:** chống prompt injection (nội dung ghi chú, lý do nghỉ do người dùng nhập được coi là dữ liệu, không phải chỉ thị); giới hạn tần suất; giới hạn số lần gọi công cụ mỗi lượt.
- **Chi phí và độ trễ:** lưu `tokens_in/out` mỗi tin nhắn; đặt trần theo cửa hàng/tháng; phản hồi chat dạng streaming.
- **Giai đoạn:** AI-1 và AI-2 làm cùng giai đoạn 4 (có solver), AI-3 và AI-4 ở giai đoạn 5, AI-5 là giai đoạn 7 sau khi đã có dữ liệu đơn hàng demo.

### 4A.6 API bổ sung

| Endpoint | Mô tả |
| --- | --- |
| `POST /ai/chat` | Gửi tin nhắn, trả về luồng phản hồi (SSE) và danh sách đề xuất chờ xác nhận |
| `POST /ai/proposals/:id/confirm` \| `/reject` | Xác nhận hoặc từ chối một đề xuất |
| `POST /stores/:id/demand/import` | Nhập CSV lịch sử đơn hàng |
| `POST /stores/:id/demand/forecast?week=` | Chạy dự báo, tạo `staffing_suggestions` |
| `PATCH /staffing-suggestions/:id` | Chấp nhận / sửa / từ chối gợi ý nhu cầu |

## 5. Luồng trạng thái

- **Lịch tuần:** `draft` → `published` → `archived` (chỉ quản lý/admin chuyển; công bố tạo phiên bản mới nếu sửa sau đó).
- **Nghỉ phép:** `pending` → `approved` | `rejected` | `cancelled` (nhân viên huỷ khi còn pending hoặc trước ngày nghỉ).
- **Đổi ca:** `pending_peer` → `pending_manager` → `approved` | `rejected` | `cancelled` (khi duyệt phải qua lại bộ kiểm tra ràng buộc cho cả hai người).
- **Nhường ca:** `open` → `claimed` → `approved` | `expired`.

**Khi nghỉ phép được duyệt** sau khi lịch đã công bố: các ca bị ảnh hưởng chuyển sang trạng thái “cần người thay” và quản lý nhận thông báo.

---

## 6. Yêu cầu phi chức năng

- **Mobile-first**: nhân viên chủ yếu dùng điện thoại; giao diện nhân viên tối ưu một tay.
- **Hiệu năng:** tải lịch tuần < 1s; chạy xếp ca 30 nhân viên × 7 ngày × 3 ca < 30s.
- **Bảo mật:** RBAC kiểm tra ở server, mật khẩu hash, rate limit, không lộ dữ liệu chéo cửa hàng; dữ liệu cá nhân (ngân hàng, liên hệ) chỉ người có quyền xem.
- **Toàn vẹn:** ràng buộc quan trọng đặt ở DB (khoá ngoại, CHECK, EXCLUDE chống trùng ca).
- **Truy vết:** audit log cho thao tác xếp/sửa lịch, duyệt, tạo/khoá tài khoản.
- **Múi giờ:** lưu UTC, hiển thị Asia/Ho\_Chi\_Minh; `work_date` lưu theo ngày địa phương.
- **Test:** unit test bộ kiểm tra ràng buộc và solver (có bộ dữ liệu mẫu và kịch bản biên: thiếu người, mọi người cùng bận, ca qua đêm).

---

## 7. Kiến trúc & công nghệ gợi ý

| Lớp | Lựa chọn |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind, thư viện lịch kéo-thả (FullCalendar/dnd-kit) |
| Backend | Next.js route handlers hoặc NestJS; Zod validate |
| DB | PostgreSQL + Prisma/Drizzle, extension `btree_gist` |
| Solver | Service Python (FastAPI + OR-Tools), backend gọi qua HTTP; chạy job bất đồng bộ |
| Realtime/Thông báo | SSE/WebSocket hoặc polling + bảng `notifications`; email/push (P2) |
| Deploy | Docker Compose; DB managed; CI chạy test |

### 7A. Hạ tầng và chi phí (mục tiêu 0đ/tháng cho bản demo)

Bản demo chạy hoàn toàn trên gói miễn phí; chỉ phát sinh tiền khi cho quán thật dùng hoặc khi lượng gọi LLM tăng.

| Thành phần | Lựa chọn | Chi phí | Giới hạn cần biết |
| --- | --- | --- | --- |
| Frontend + API | Next.js trên Vercel Hobby (dùng thương mại thì chuyển Cloudflare Pages) | $0 | Hobby chỉ dành cho dự án cá nhân, phi thương mại |
| Database | Neon Postgres Free (thay thế: Supabase) | $0 | 100 CU-hours/tháng và khoảng 1 GB mỗi project; compute tự tắt sau 5 phút không dùng nên request đầu chậm; cần thử `CREATE EXTENSION btree_gist` trước khi chốt |
| Solver MVP | Greedy viết bằng TypeScript trong backend | $0 | Không cần dịch vụ riêng |
| Solver CP-SAT | FastAPI + OR-Tools trên Render free web service | $0 | Tắt sau 15 phút không có truy cập, khởi động lại mất 30–60 giây; tài nguyên nhỏ nên đặt time limit 10–30 giây |
| Auth | Auth.js tự host | $0 | Tự quản lý hash mật khẩu và session |
| LLM (mục 4A) | Model nhỏ, rẻ qua API | Theo mức dùng | Đặt trần gọi mỗi ngày; ưu tiên AI-1 và AI-2 |
| CI/CD | Git + GitHub Actions | $0 | Chạy test cho bộ kiểm tra ràng buộc và solver |
| Domain | Tên miền miễn phí qua GitHub Student Developer Pack | $0 | Thời hạn theo ưu đãi của gói |
| Thông báo | Trong ứng dụng + SSE; email để P2 | $0 |  |

**Quy tắc giữ chi phí về 0**

1. Không dùng Postgres miễn phí của Render vì nó bị xoá sau 30 ngày.
2. Đặt ngân sách LLM: trần số lượt gọi mỗi ngày cho mỗi người dùng, theo dõi qua `ai_messages.tokens_in/out`, cache câu trả lời lặp lại (ví dụ giải thích lịch cùng một phiên bản).
3. Dữ liệu nhu cầu nhập bằng CSV, chưa tích hợp POS có phí.
4. Seed dữ liệu demo nhỏ để DB nằm trong giới hạn dung lượng miễn phí.
5. README ghi rõ hiện tượng khởi động chậm lần đầu (cold start) để người xem demo không tưởng là lỗi.
6. Khi cho quán thật dùng: chuyển frontend sang gói cho phép thương mại, DB sang gói tính theo mức dùng, solver sang gói luôn bật.

**Tận dụng GitHub Student Developer Pack:** GitHub Pro, Copilot cho sinh viên, credit cloud (Azure, DigitalOcean; giá trị thay đổi theo thời điểm) và tên miền. Điều kiện là sinh viên từ 13 tuổi trở lên đang học chương trình cấp bằng hoặc chứng chỉ.

**Nguồn tham khảo (tháng 10/2026):** [Neon pricing](https://neon.com/pricing) · [GitHub Education](https://education.github.com/students/experts). Điều kiện các gói miễn phí của Vercel và Render thay đổi thường xuyên, cần đối chiếu trang giá chính thức trước khi deploy.

---

## 8. Thiết kế cơ sở dữ liệu (PostgreSQL)

### 8.1 Các nhóm bảng

- **Tổ chức:** `stores`, `positions`
- **Người dùng:** `users`, `employee_profiles`, `store_memberships`, `user_positions`
- **Cấu hình ca:** `shift_templates`, `staffing_requirements`, `store_settings`
- **Khả dụng:** `availability_rules`, `availability_exceptions`, `shift_preferences`
- **Lịch:** `schedules`, `shift_slots`, `shift_assignments`, `schedule_runs`
- **Yêu cầu:** `leave_types`, `leave_requests`, `shift_swap_requests`
- **Hệ thống:** `notifications`, `audit_logs`

### 8.2 Quan hệ chính

- `users` 1–1 `employee_profiles`; `users` n–n `stores` qua `store_memberships` (một nhân viên có thể làm nhiều chi nhánh).
- `store_memberships.role_in_store` xác định nhân viên hay quản lý của cửa hàng đó; `users.system_role = 'admin'` là toàn quyền.
- `schedules` 1–n `shift_slots` 1–n `shift_assignments`.
- `shift_slots` thuộc (`shift_template`, `position`, ngày); `shift_assignments` gán `user` vào slot.

### 8.3 DDL

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========== TỔ CHỨC ==========
CREATE TABLE stores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  address       text,
  phone         text,
  timezone      text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE positions (            -- pha chế, thu ngân, phục vụ, giữ xe...
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  color         text,
  is_active     boolean NOT NULL DEFAULT true
);

-- ========== NGƯỜI DÙNG ==========
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text UNIQUE,
  phone          text UNIQUE,
  password_hash  text NOT NULL,
  system_role    text NOT NULL DEFAULT 'user' CHECK (system_role IN ('user','admin')),
  must_change_password boolean NOT NULL DEFAULT true,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','locked','left')),
  last_login_at  timestamptz,
  created_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE employee_profiles (
  user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name      text NOT NULL,
  display_name   text,
  date_of_birth  date,
  gender         text,
  address        text,
  avatar_url     text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  bank_name      text,
  bank_account   text,           -- cân nhắc mã hoá ở tầng ứng dụng
  note           text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE store_memberships (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role_in_store  text NOT NULL CHECK (role_in_store IN ('employee','manager')),
  employment_type text NOT NULL DEFAULT 'part_time' CHECK (employment_type IN ('full_time','part_time')),
  target_hours_week numeric(5,1),          -- giờ mục tiêu/tuần
  max_hours_week    numeric(5,1) NOT NULL DEFAULT 48,
  is_primary     boolean NOT NULL DEFAULT false,
  joined_at      date NOT NULL DEFAULT current_date,
  left_at        date,
  UNIQUE (user_id, store_id)
);
CREATE INDEX ON store_memberships (store_id, role_in_store);

CREATE TABLE user_positions (
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position_id    uuid NOT NULL REFERENCES positions(id),
  skill_level    smallint NOT NULL DEFAULT 1 CHECK (skill_level BETWEEN 1 AND 5),
  PRIMARY KEY (user_id, position_id)
);

-- ========== CẤU HÌNH CA ==========
CREATE TABLE shift_templates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name           text NOT NULL,            -- Sáng / Chiều / Tối
  start_time     time NOT NULL,
  end_time       time NOT NULL,            -- end <= start nghĩa là qua đêm
  is_peak        boolean NOT NULL DEFAULT false,
  is_unsocial    boolean NOT NULL DEFAULT false,  -- ca “xấu” để luân phiên
  is_active      boolean NOT NULL DEFAULT true,
  UNIQUE (store_id, name)
);

CREATE TABLE staffing_requirements (       -- nhu cầu: thứ × ca × vị trí
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  weekday        smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),  -- 1=Thứ 2
  shift_template_id uuid NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
  position_id    uuid NOT NULL REFERENCES positions(id),
  min_count      smallint NOT NULL CHECK (min_count >= 0),
  ideal_count    smallint NOT NULL,
  CHECK (ideal_count >= min_count),
  UNIQUE (store_id, weekday, shift_template_id, position_id)
);

CREATE TABLE store_settings (
  store_id       uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  max_hours_day  numeric(4,1) NOT NULL DEFAULT 10,
  min_rest_hours numeric(4,1) NOT NULL DEFAULT 10,
  require_weekly_day_off boolean NOT NULL DEFAULT true,
  registration_deadline_weekday smallint NOT NULL DEFAULT 7,
  registration_deadline_time time NOT NULL DEFAULT '20:00',
  solver_weights jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ========== KHẢ DỤNG ==========
CREATE TABLE availability_rules (          -- lịch bận/rảnh lặp lại theo thứ
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday        smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time     time NOT NULL,
  end_time       time NOT NULL,
  kind           text NOT NULL DEFAULT 'busy' CHECK (kind IN ('busy','available')),
  valid_from     date NOT NULL DEFAULT current_date,
  valid_to       date,
  reason         text,
  CHECK (end_time > start_time)
);
CREATE INDEX ON availability_rules (user_id, weekday);

CREATE TABLE availability_exceptions (     -- ngoại lệ theo ngày cụ thể
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  on_date        date NOT NULL,
  start_time     time,                     -- null = cả ngày
  end_time       time,
  kind           text NOT NULL CHECK (kind IN ('busy','available')),
  reason         text,
  CHECK ((start_time IS NULL) = (end_time IS NULL))
);
CREATE INDEX ON availability_exceptions (user_id, on_date);

CREATE TABLE shift_preferences (           -- đăng ký ca mong muốn cho tuần
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  work_date      date NOT NULL,
  shift_template_id uuid NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
  preference     smallint NOT NULL CHECK (preference IN (-1, 1, 2)),  -- -1 ngại, 1 ok, 2 rất muốn
  submitted_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, work_date, shift_template_id)
);
CREATE INDEX ON shift_preferences (store_id, work_date);

-- ========== LỊCH ==========
CREATE TABLE schedules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  week_start     date NOT NULL,            -- luôn là Thứ 2
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  version        integer NOT NULL DEFAULT 1,
  published_at   timestamptz,
  published_by   uuid REFERENCES users(id),
  created_by     uuid NOT NULL REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, week_start, version)
);

CREATE TABLE shift_slots (                 -- chỗ cần người
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id    uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  work_date      date NOT NULL,
  shift_template_id uuid NOT NULL REFERENCES shift_templates(id),
  position_id    uuid NOT NULL REFERENCES positions(id),
  start_at       timestamptz NOT NULL,
  end_at         timestamptz NOT NULL,
  min_count      smallint NOT NULL,
  ideal_count    smallint NOT NULL,
  CHECK (end_at > start_at),
  UNIQUE (schedule_id, work_date, shift_template_id, position_id)
);

CREATE TABLE shift_assignments (           -- ai làm slot nào
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id        uuid NOT NULL REFERENCES shift_slots(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES users(id),
  start_at       timestamptz NOT NULL,     -- denormalize từ slot để chống trùng ca
  end_at         timestamptz NOT NULL,
  source         text NOT NULL DEFAULT 'manual' CHECK (source IN ('auto','manual','swap','claimed')),
  is_pinned      boolean NOT NULL DEFAULT false,
  status         text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','needs_cover','cancelled')),
  note           text,
  created_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slot_id, user_id),
  -- một người không thể có hai ca chồng giờ (bỏ qua ca đã huỷ)
  EXCLUDE USING gist (
    user_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (status <> 'cancelled')
);
CREATE INDEX ON shift_assignments (user_id, start_at);

CREATE TABLE schedule_runs (               -- mỗi lần chạy solver
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id    uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  algorithm      text NOT NULL CHECK (algorithm IN ('greedy','cp_sat')),
  params         jsonb NOT NULL DEFAULT '{}'::jsonb,   -- trọng số, time limit
  status         text NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed')),
  score          numeric,
  runtime_ms     integer,
  unfilled_slots integer,
  warnings       jsonb NOT NULL DEFAULT '[]'::jsonb,   -- cảnh báo + giải thích
  fairness       jsonb,                                -- giờ từng người, độ lệch
  triggered_by   uuid NOT NULL REFERENCES users(id),
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz
);

-- ========== YÊU CẦU ==========
CREATE TABLE leave_types (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL UNIQUE,     -- Nghỉ phép năm, Ốm, Việc riêng...
  is_paid        boolean NOT NULL DEFAULT false,
  requires_attachment boolean NOT NULL DEFAULT false,
  is_active      boolean NOT NULL DEFAULT true
);

CREATE TABLE leave_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id       uuid NOT NULL REFERENCES stores(id),
  leave_type_id  uuid NOT NULL REFERENCES leave_types(id),
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  reason         text,
  attachment_url text,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by    uuid REFERENCES users(id),
  reviewed_at    timestamptz,
  review_note    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);
CREATE INDEX ON leave_requests (store_id, status, start_date);
CREATE INDEX ON leave_requests (user_id, start_date);

CREATE TABLE shift_swap_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id),
  kind           text NOT NULL CHECK (kind IN ('swap','give_away')),
  from_assignment_id uuid NOT NULL REFERENCES shift_assignments(id),
  to_user_id     uuid REFERENCES users(id),            -- null nếu nhường lên bảng ca trống
  to_assignment_id uuid REFERENCES shift_assignments(id), -- ca đổi lại (khi kind = swap)
  status         text NOT NULL DEFAULT 'pending_peer'
                 CHECK (status IN ('pending_peer','pending_manager','approved','rejected','cancelled','expired')),
  reason         text,
  reviewed_by    uuid REFERENCES users(id),
  reviewed_at    timestamptz,
  created_by     uuid NOT NULL REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ========== HỆ THỐNG ==========
CREATE TABLE notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type           text NOT NULL,            -- schedule_published, leave_approved, ...
  title          text NOT NULL,
  body           text,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON notifications (user_id, read_at, created_at DESC);

CREATE TABLE audit_logs (
  id             bigserial PRIMARY KEY,
  actor_id       uuid REFERENCES users(id),
  store_id       uuid REFERENCES stores(id),
  action         text NOT NULL,            -- schedule.publish, assignment.update, user.create...
  entity_type    text NOT NULL,
  entity_id      uuid,
  before_data    jsonb,
  after_data     jsonb,
  ip_address     inet,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_logs (entity_type, entity_id);
CREATE INDEX ON audit_logs (store_id, created_at DESC);
```

### 8.3A DDL bổ sung cho AI (mục 4A)

```sql
-- Lịch sử nhu cầu (nhập CSV từ POS), theo khung 1 giờ
CREATE TABLE demand_history (
  id            bigserial PRIMARY KEY,
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  bucket_start  timestamptz NOT NULL,
  orders        integer NOT NULL CHECK (orders >= 0),
  revenue       numeric(14,0),
  source        text NOT NULL DEFAULT 'csv_import' CHECK (source IN ('csv_import','manual','api')),
  UNIQUE (store_id, bucket_start)
);

CREATE TABLE demand_forecasts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  model_version    text NOT NULL,
  bucket_start     timestamptz NOT NULL,
  predicted_orders numeric(8,1) NOT NULL,
  lower_bound      numeric(8,1),
  upper_bound      numeric(8,1),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, model_version, bucket_start)
);

-- Gợi ý nhu cầu nhân sự sinh từ dự báo, chờ quản lý duyệt
CREATE TABLE staffing_suggestions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  week_start       date NOT NULL,
  model_version    text NOT NULL,
  suggested        jsonb NOT NULL,   -- [{weekday, shift_template_id, position_id, min_count, ideal_count}]
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','accepted','partially_accepted','rejected')),
  reviewed_by      uuid REFERENCES users(id),
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, week_start, model_version)
);

-- Trợ lý chat
CREATE TABLE ai_conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id      uuid REFERENCES stores(id) ON DELETE SET NULL,
  title         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON ai_conversations (user_id, updated_at DESC);

CREATE TABLE ai_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role             text NOT NULL CHECK (role IN ('user','assistant','tool')),
  content          text,
  tool_name        text,
  tool_args        jsonb,
  tool_result      jsonb,
  tokens_in        integer,
  tokens_out       integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON ai_messages (conversation_id, created_at);

-- Đề xuất ghi dữ liệu từ AI, chỉ áp dụng sau khi người dùng xác nhận
CREATE TABLE ai_action_proposals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES users(id),
  store_id         uuid REFERENCES stores(id),
  action_type      text NOT NULL CHECK (action_type IN
                   ('set_availability','assign_cover','run_auto_assign','create_leave_request')),
  payload          jsonb NOT NULL,
  preview          text,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','rejected','expired','failed')),
  expires_at       timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  confirmed_at     timestamptz,
  result           jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON ai_action_proposals (user_id, status, expires_at);
```

Ghi chú: `ai_messages` có thể chứa nội dung người dùng nhập, nên áp cùng quyền truy cập với `ai_conversations` và đặt thời hạn lưu (ví dụ 90 ngày). Khi xác nhận một đề xuất, hệ thống ghi thêm một dòng vào `audit_logs` với `action = 'ai.proposal.confirm'`.

### 8.4 Ghi chú thiết kế

- **Chống trùng ca ở tầng DB** bằng `EXCLUDE ... tstzrange`; ràng buộc nghiệp vụ phức tạp hơn (giờ/tuần, nghỉ giữa ca) kiểm tra ở service dùng chung với solver.
- **Ca qua đêm:** `shift_slots.start_at/end_at` lưu timestamp đầy đủ, nên ca 22h–02h không gây lỗi so sánh `time`.
- **Slot tách khỏi assignment** cho phép biết chính xác slot nào thiếu người (số assignment < `min_count`).
- **Nghỉ việc:** đặt `users.status = 'left'` và `store_memberships.left_at`, không xoá để giữ lịch sử.
- **Đa chi nhánh:** một người có nhiều `store_memberships`; ràng buộc giờ/tuần phải tính **gộp mọi chi nhánh**.
- **Phân quyền:** `system_role = 'admin'` hoặc `store_memberships.role_in_store = 'manager'` cho đúng `store_id`; mọi query lọc theo store được phép.
- **Dữ liệu nhạy cảm** (tài khoản ngân hàng, liên hệ khẩn cấp): chỉ trả cho chính chủ/quản lý/admin; cân nhắc mã hoá cột.

---

## 9. API (rút gọn)

| Nhóm | Endpoint |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/change-password` |
| Users | `POST /stores/:id/employees`, `PATCH /employees/:id`, `POST /employees/:id/lock` |
| Me | `GET/PATCH /me/profile`, `GET /me/schedule?week=` |
| Availability | `GET/PUT /me/availability-rules`, `POST /me/availability-exceptions`, `PUT /me/shift-preferences?week=` |
| Config | `CRUD /stores/:id/shift-templates`, `PUT /stores/:id/staffing-requirements`, `PATCH /stores/:id/settings` |
| Schedule | `POST /stores/:id/schedules` (tạo + sinh slot), `POST /schedules/:id/auto-assign`, `PATCH /assignments/:id`, `POST /schedules/:id/validate`, `POST /schedules/:id/publish` |
| Leave | `POST /leave-requests`, `PATCH /leave-requests/:id/review` |
| Swap | `POST /swap-requests`, `PATCH /swap-requests/:id/respond`, `PATCH /swap-requests/:id/review` |
| Reports | `GET /stores/:id/reports/hours`, `GET /stores/:id/reports/coverage` |
| Admin | `CRUD /stores`, `CRUD /positions`, `CRUD /leave-types`, `GET /audit-logs` |

---

## 10. Lộ trình

| Giai đoạn | Nội dung | Kết quả |
| --- | --- | --- |
| 1 (1–2 tuần) | DB, auth, RBAC, CRUD cửa hàng/nhân viên/ca mẫu/nhu cầu | Khung hệ thống chạy được |
| 2 (1–2 tuần) | Lịch bận, đăng ký ca, nghỉ phép + duyệt, xem lịch | Luồng nhân viên hoàn chỉnh |
| 3 (2 tuần) | Sinh slot, bộ kiểm tra ràng buộc, xếp ca greedy, UI lịch kéo-thả, công bố | **MVP demo được** |
| 4 (1–2 tuần) | Solver CP-SAT, giải thích, báo cáo công bằng/độ phủ, khoá ca | Điểm nhấn kỹ thuật |
| 5 (1 tuần) | Đổi/nhường ca, thông báo, audit log, dashboard | Hoàn thiện |
| 6 (vài ngày) | Seed dữ liệu demo, test, deploy, README + sơ đồ ERD | Sẵn sàng đưa vào portfolio |

## 11. Rủi ro & câu hỏi mở

- Solver không ra nghiệm khi ràng buộc quá chặt → luôn cho phép slot trống kèm lý do thay vì báo lỗi.
- Ngưỡng giờ làm/nghỉ cần đối chiếu quy định lao động hiện hành khi triển khai thật.
- Quản lý có thể kiêm làm ca như nhân viên không? (đề xuất: có, qua `store_memberships` role manager vẫn được gán ca).
- Có cần giới hạn số lần đổi ca/tháng? (đề xuất: cấu hình, mặc định không giới hạn).
- Ngày lễ/Tết: có cần lịch lễ riêng và hệ số ca xấu? (đề xuất: P2, thêm bảng `holidays`).

---

## 12. Phạm vi demo MVP và tiêu chí nghiệm thu

Phần này chốt một lát cắt sản phẩm có thể demo trọn vẹn. Các hạng mục P1/P2 khác trong PRD không phải điều kiện để nghiệm thu lát cắt này.

### 12.1 Phạm vi demo

Demo MVP tập trung vào một cửa hàng và một tuần làm việc, với hai vai trò nhân viên và quản lý:

1. Quản lý tạo nhân viên, gán vị trí/kỹ năng, đặt giờ mục tiêu và cấu hình ca mẫu cùng nhu cầu nhân sự.
2. Nhân viên khai báo lịch bận, ngoại lệ theo ngày và ca mong muốn cho tuần được chọn.
3. Quản lý xem tổng hợp độ phủ, tạo lịch nháp và chạy xếp ca tự động.
4. Hệ thống xếp nhân viên vào ca phù hợp, để trống slot không thể phủ và nêu lý do; quản lý chỉnh lịch và xem cảnh báo ràng buộc.
5. Quản lý công bố lịch; nhân viên xem được lịch đã công bố.

Để giữ phạm vi demo gọn, đổi/nhường ca, dự báo nhu cầu từ dữ liệu POS, thông báo đẩy/email, nhiều chi nhánh và hội thoại AI không phải điều kiện nghiệm thu. Có thể trình bày chúng như hướng phát triển tiếp theo.

### 12.2 Tiêu chí nghiệm thu demo

| Mã | Tiêu chí | Cách xác nhận |
| --- | --- | --- |
| ACC-1 | Nhân viên chỉ xem và khai báo dữ liệu thuộc tài khoản của mình; quản lý chỉ thao tác trên cửa hàng được gán. | Thử gọi hoặc truy cập dữ liệu của tài khoản/cửa hàng khác; server từ chối. |
| ACC-2 | Lịch bận lặp lại, ngoại lệ theo ngày, nghỉ phép đã duyệt và ca mong muốn được tính vào đầu vào xếp lịch. | Dùng bộ dữ liệu demo có từng loại đầu vào; kiểm tra kết quả không xếp vào thời gian bận/nghỉ và có xét mức ưu tiên ca. |
| ACC-3 | Lịch tự động không vi phạm các ràng buộc cứng H1–H9 đang bật trong cấu hình demo. | Chạy kiểm tra lịch bằng cùng bộ kiểm tra ràng buộc dùng cho chỉnh tay; kết quả không có vi phạm cứng. |
| ACC-4 | Khi không đủ người hợp lệ, hệ thống để slot thiếu thay vì xếp sai người và trả về lý do có thể hiểu được. | Tạo tình huống mọi ứng viên đều bận, sai kỹ năng hoặc chạm giới hạn giờ; xác nhận slot thiếu có nguyên nhân. |
| ACC-5 | Chỉnh tay lịch chạy kiểm tra ràng buộc và chỉ ra lỗi ngay tại thao tác lưu/xác nhận. | Thử tạo ca chồng giờ và vượt giới hạn giờ; hệ thống chặn hoặc yêu cầu sửa trước khi công bố. |
| ACC-6 | Chỉ lịch hợp lệ mới được công bố; nhân viên xem đúng phiên bản đã công bố. | Thử công bố lịch có lỗi, sau đó công bố lịch hợp lệ và đăng nhập bằng tài khoản nhân viên để đối chiếu. |
| ACC-7 | Báo cáo lần chạy thể hiện trạng thái, thời gian chạy, điểm (nếu thuật toán có điểm), số slot thiếu và cảnh báo. | Đối chiếu trang kết quả với bản ghi `schedule_runs`. |

Các chỉ số mục tiêu tại mục 1.3 là mục tiêu đánh giá trên bộ dữ liệu demo, không thay thế các tiêu chí hợp lệ ở trên. “Độ lệch giờ dưới 15%” được tính trên nhóm nhân viên cùng loại hợp đồng có `target_hours_week > 0`: `max(abs(actual_hours - target_hours) / target_hours) * 100`. Báo cáo cần hiển thị cả số giờ thực tế và mục tiêu để người xem kiểm chứng. Tỉ lệ ca đúng mong muốn tính trên các phân công có lựa chọn ca tương ứng: số phân công vào ca được đánh dấu “rất muốn” hoặc “bình thường” chia cho tổng số phân công có đăng ký ca; ca “ngại” không tính là phù hợp.

## 13. Kịch bản demo xuyên suốt

### 13.1 Dữ liệu chuẩn bị

- Một cửa hàng, ba ca mẫu (sáng, chiều, tối), các vị trí pha chế và thu ngân.
- Sáu nhân viên có kỹ năng và giờ mục tiêu khác nhau; ít nhất một người có lịch bận lặp lại, một người có ngoại lệ theo ngày và một người đăng ký ca “rất muốn”.
- Nhu cầu có đủ người vào phần lớn các ca, nhưng ca tối Thứ 7 chỉ có một ứng viên pha chế hợp lệ.
- Một nhân viên đủ điều kiện nhưng đã chạm giới hạn giờ tuần, để minh hoạ lý do không được chọn.

### 13.2 Các bước và kết quả mong đợi

1. Nhân viên đăng ký ca mong muốn và khai báo thời gian bận cho tuần kế tiếp.
2. Quản lý mở màn hình tổng hợp; hệ thống thể hiện độ phủ theo ngày, ca và vị trí, đồng thời nhận ra ca tối Thứ 7 đang thiếu ứng viên.
3. Quản lý chạy xếp lịch. Hệ thống tạo bản nháp, ưu tiên người phù hợp và cân bằng giờ; slot không thể phủ được để trống kèm lý do.
4. Quản lý thử xếp một nhân viên vào thời gian họ bận hoặc vào ca chồng giờ. Hệ thống báo vi phạm và không cho lưu thay đổi không hợp lệ.
5. Quản lý sửa bản nháp hợp lệ, xem tổng giờ và cảnh báo còn lại, rồi công bố lịch.
6. Nhân viên đăng nhập, xem được lịch tuần đã công bố của mình.

Kịch bản được xem là đạt khi người xem phân biệt được dữ liệu đầu vào, quy tắc hệ thống áp dụng, lý do slot thiếu (nếu có), và trạng thái lịch trước/sau khi công bố.

## 14. Quyết định nghiệp vụ cần chốt trước khi triển khai tương ứng

Các đề xuất dưới đây dùng làm mặc định cho MVP nếu nhóm chưa có quyết định khác. Khi chốt khác đi, cập nhật cả quy tắc, schema/API liên quan và tiêu chí nghiệm thu.

| Chủ đề | Mặc định đề xuất | Tác động cần phản ánh |
| --- | --- | --- |
| Quản lý có được xếp ca không? | Có, nếu có membership tại cửa hàng và được gán vị trí/kỹ năng như nhân viên. | Solver và truy vấn danh sách ứng viên không loại quản lý chỉ vì role. |
| Người nhận đổi ca cần cùng vị trí không? | Phải có kỹ năng của vị trí trong ca; đổi ca hai chiều phải kiểm tra cả hai phân công. | Kiểm tra ràng buộc khi gửi yêu cầu và khi quản lý duyệt. |
| Nghỉ phép được duyệt sau khi lịch đã công bố | Giữ lịch sử phân công, chuyển ca bị ảnh hưởng sang `needs_cover`, báo quản lý và giữ lịch sử quyết định. | Cần xác định thao tác huỷ/thay phân công và quy tắc công bố phiên bản lịch cập nhật. |
| Nhiều membership/chi nhánh trong MVP | MVP chỉ xếp lịch trong một cửa hàng; giới hạn giờ tuần vẫn phải tính gộp các phân công đã có ở chi nhánh khác nếu nhân viên làm nhiều nơi. | Bộ kiểm tra phải nhận các ca liên chi nhánh làm dữ liệu đầu vào, kể cả khi chưa có màn hình điều động. |
| Ngày bắt đầu tuần và múi giờ | Tuần bắt đầu Thứ 2; ngày nghiệp vụ theo `Asia/Ho_Chi_Minh`, timestamp lưu UTC. | API, sinh slot, hạn đăng ký và hiển thị phải dùng chung quy ước. |
| Lịch đã công bố bị sửa | Không sửa âm thầm; tạo phiên bản lịch mới, lưu người sửa và lý do, thông báo lại cho nhân viên bị ảnh hưởng. | Làm rõ quy tắc version của `schedules`, audit log và thời điểm phiên bản cũ được archive. |

### 14.1 Ghi chú nhất quán schema/API cần xử lý khi triển khai

- `system_role` hiện chỉ có `user` và `admin`; quyền `manager`/`employee` được xác định qua `store_memberships.role_in_store`. Tài liệu và API nên dùng thống nhất cách gọi này.
- PRD nêu thay đổi lịch đã công bố phải có lý do và tạo phiên bản mới, nhưng `shift_assignments` hiện chưa có trường lý do chỉnh sửa hoặc liên kết phiên bản trước. Cần lưu lý do trong audit log và xác định cách tạo phiên bản mới trước khi triển khai chỉnh lịch đã công bố.
- Ràng buộc tối đa giờ/tuần áp dụng gộp nhiều cửa hàng theo ghi chú thiết kế, trong khi yêu cầu quản lý thao tác bị giới hạn theo cửa hàng. Bộ kiểm tra giờ tuần vì thế cần đọc các phân công liên quan ở mọi membership của nhân viên mà không làm lộ dữ liệu cửa hàng đó cho người gọi.
- `availability_rules` hiện chỉ cho phép khoảng giờ trong cùng ngày (`end_time > start_time`), còn ca làm có thể qua đêm. Cần chốt lịch bận qua đêm được nhập thành hai khoảng theo ngày hay hỗ trợ biểu diễn riêng; không được âm thầm diễn giải sai thời gian.
- API `POST /leave-requests` và `POST /swap-requests` cần suy ra người gửi từ phiên đăng nhập; không tin `user_id` do client tự gửi. Tương tự, mọi endpoint theo store phải kiểm tra membership/role ở server.

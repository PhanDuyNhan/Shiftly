# Shiftly

Ứng dụng Next.js quản lý tài khoản/cửa hàng (spec 002), đơn nghỉ (spec 003) và lịch ca tuần (spec 001).

## Chạy cục bộ

Yêu cầu Node.js 22+, PostgreSQL 16+ và một thư mục riêng tư có thể ghi. Có thể dùng `docker compose up -d postgres` để tạo PostgreSQL; Compose cũng có dịch vụ `app` và volume riêng cho tệp đính kèm. PostgreSQL của Compose mở ở cổng host 5433 mặc định để không xung đột với PostgreSQL cài trên máy; ứng dụng chạy ở `http://localhost:3000`.

```sh
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:seed:leave
npm run dev
```

Sửa `DATABASE_URL`, `SESSION_SECRET` (ít nhất 32 ký tự), `APP_ORIGIN` và `PRIVATE_ATTACHMENT_DIR` trong `.env.local` trước khi chạy. Thư mục tệp phải nằm ngoài `public/`, chỉ ứng dụng server được quyền đọc/ghi. Trong Compose, app dùng volume `/attachments`; khi chạy trên host, dùng đường dẫn riêng như `./data/private-attachments`. Bản triển khai nhiều instance cần thay adapter file bằng kho object riêng tư dùng chung, giữ nguyên kiểm tra quyền ở endpoint tải.

## Chạy bằng Docker

Tạo file `.env` chỉ dùng trên máy với `POSTGRES_PASSWORD` và `SESSION_SECRET` mạnh (file đã được Git bỏ qua), sau đó chạy:

```sh
docker compose up -d
docker compose exec -T app npm run db:migrate
docker compose exec -T app npm run db:seed:leave
```

Ứng dụng ở `http://localhost:3000`; PostgreSQL của Compose ở cổng host 5433. Đặt `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD` khi chạy `db:seed:admin`, hoặc `DEMO_PASSWORD` khi chạy `db:seed:scheduling-demo` để nạp tài khoản và lịch mẫu. Mật khẩu tạm cần đổi ở lần đăng nhập đầu tiên. Dữ liệu Docker nằm trong volume và giữ nguyên khi dừng/chạy lại container.

Tạo admin đầu tiên bằng biến môi trường `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` (mật khẩu từ 12 ký tự), rồi chạy `npm run db:seed:admin`. Mật khẩu này chỉ dùng một lần; tài khoản phải đổi mật khẩu trước khi xem dữ liệu. Không có đăng ký admin công khai. Sau khi đăng nhập, admin tạo cửa hàng/vị trí và gán quản lý; quản lý tạo nhân viên và cấu hình ca mẫu/nhu cầu.

Lệnh `npm run db:migrate` áp các SQL trong `src/db/migrations/` theo thứ tự `0000_foundation`, `0001_leave`, `0002_scheduling`, `0003_single_employee_manager`, có khóa và bảng lịch sử migration. `npm run db:generate` chỉ dành cho migration mới cần được xem lại; không áp trực tiếp SQL sinh tự động lên các bảng đã có. `npm run db:seed:leave` tạo hai loại nghỉ mẫu lặp lại an toàn. Để tạo fixture lịch tuần 2026-11-02, đặt `DEMO_PASSWORD` rồi chạy `npm run db:seed:scheduling-demo`; xem [quickstart lịch tuần](specs/001-shift-scheduling/quickstart.md).

Khi log báo tệp đính kèm mồ côi sau lỗi giao dịch, chạy `npm run attachments:cleanup`. Lệnh chỉ xóa khóa tệp không còn được đơn tham chiếu và cũ hơn một giờ.

## Kiểm tra

```sh
npm run typecheck
npm run build
```

Các script `scripts/smoke-foundation.mjs`, `scripts/smoke-security.mjs`, `scripts/smoke-leave.mjs`, `scripts/smoke-scheduling.mjs` chạy qua API trên database phát triển. Tạo admin thử nghiệm riêng, đặt `SMOKE_EMAIL` và `SMOKE_PASSWORD` là thông tin admin đó, rồi chạy từng script. Mỗi script đổi mật khẩu tạm và tạo fixture riêng; không chạy trên dữ liệu thật. Sau khi seed demo, đặt `DEMO_PASSWORD` và chạy `node scripts/smoke-demo.mjs`. Xem [nghiệm thu nền tảng](specs/002-shiftly-foundation/acceptance-results.md), [nghỉ phép](specs/003-leave-requests/acceptance-results.md) và [lịch tuần](specs/001-shift-scheduling/acceptance-results.md) để biết số liệu cùng các mục còn cần người dùng thử.

## Quyền và dữ liệu

Phiên dùng cookie `HttpOnly`, `SameSite=Lax`; route ghi kiểm tra `Origin` và `x-csrf-token`. Quyền admin toàn hệ thống, quản lý theo membership còn hiệu lực tại đúng cửa hàng, nhân viên chỉ dữ liệu cá nhân. Mỗi nhân viên có một cửa hàng gốc và một quản lý trực tiếp; đăng ký ca tự lấy cửa hàng gốc. Quản lý có thể xếp nhân viên từ cửa hàng khác vào lịch cửa hàng mình phụ trách mà không đổi quan hệ quản lý. Trạng thái tài khoản và quyền được đọc lại từ DB mỗi yêu cầu. Đơn nghỉ dùng ngày địa phương của cửa hàng; chỉ `approved` chặn xếp ca. Tệp đính kèm lưu bằng khóa ngẫu nhiên, tải qua endpoint đã kiểm tra quyền và không xuất URL công khai.

Tài liệu vận hành: [nền tảng](docs/foundation-operations.md), [nghỉ phép](docs/leave-operations.md), [lịch ca](docs/scheduling-operations.md).

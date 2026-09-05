# LS79win Account + Admin

Hệ thống đăng ký/đăng nhập thật bằng Supabase, ví VNC riêng cho từng người chơi, lịch sử giao dịch và Admin Dashboard để cộng/trừ VNC hoặc khóa tài khoản.

## Cài đặt nhanh
1. Tạo project tại Supabase.
2. Mở SQL Editor và chạy toàn bộ `supabase.sql`.
3. Vào Project Settings > API, lấy Project URL và anon/publishable key.
4. Mở `app.js`, thay `PASTE_YOUR_SUPABASE_URL_HERE` và `PASTE_YOUR_SUPABASE_ANON_KEY_HERE`.
5. Upload `index.html`, `styles.css`, `app.js` lên GitHub Pages.
6. Đăng ký tài khoản của bạn. Sau đó chạy câu lệnh ADMIN ở cuối `supabase.sql`.

**Không bao giờ** đưa `service_role` key vào frontend hoặc GitHub.

VNC là coin ảo, không có giá trị tiền mặt, không nạp/rút và không quy đổi thành tài sản thật.


## LS79win Multi-page v1
Các mục chính đã được tách thành URL riêng:
- index.html — Trang chủ
- games.html — Game
- vnc-request.html — Yêu cầu VNC ảo
- vnc-withdraw.html — Rút VNC ảo
- history.html — Lịch sử VNC
- leaderboard.html — Bảng xếp hạng
- account.html — Tài khoản
- admin.html — Admin
- baccarat-online.html — Baccarat Online

Tất cả dùng chung Supabase/Auth/database hiện tại. Không cần chạy SQL mới.

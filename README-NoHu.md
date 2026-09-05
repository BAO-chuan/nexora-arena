# LS79win Nổ Hũ 777 v1

Game slot VNC ảo 5×3, 5 đường thắng, jackpot dùng backend Supabase.

## Cài đặt
1. Chạy toàn bộ `no-hu.sql` trong Supabase SQL Editor một lần.
2. Upload/ghi đè các file trong ZIP lên repo GitHub Pages.
3. Mở `games.html` hoặc Trang chủ và chọn **Nổ Hũ 777**.

## Lưu ý
- VNC chỉ là điểm ảo, không có giá trị tiền mặt.
- Kết quả quay và cập nhật số dư được xử lý atomically trong RPC `slot_spin`.
- PostgreSQL `random()` phù hợp cho game giải trí điểm ảo này nhưng không phải RNG mật mã/casino-grade.

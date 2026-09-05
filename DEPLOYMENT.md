# 🚀 RUIN OF ODIN — Hướng Dẫn Triển Khai (Deployment Guide)

Mã nguồn dự án đã được đẩy lên GitHub chính thức tại:
🔗 **Repository**: [https://github.com/Dathazayuki/RuinOfOdin](https://github.com/Dathazayuki/RuinOfOdin)

Dự án hỗ trợ kiến trúc **Unified Full-Stack**: Node.js Backend phục vụ luôn toàn bộ Frontend React tĩnh trên cùng một domain và cổng kết nối, giúp việc triển khai 24/7 chỉ cần **1 Service duy nhất**, không gặp lỗi CORS hay lệch WebSocket.

---

## 🌟 PHƯƠNG ÁN 1: Triển Khai 24/7 Lên Render.com (Miễn Phí & Dễ Nhất - Khuyên Dùng)

Render.com cho phép chạy Web Service từ Docker hoàn toàn miễn phí, hỗ trợ WebSocket liên tục và cấp sẵn domain HTTPS (`.onrender.com`).

### Các bước thực hiện:
1. Truy cập [Render.com](https://render.com/) và đăng nhập bằng tài khoản GitHub của bạn (`Dathazayuki`).
2. Bấm nút **"New +"** ở góc trên bên phải -> Chọn **"Web Service"**.
3. Chọn **"Build and deploy from a Git repository"** -> Nhấn **Next**.
4. Chọn repository **`Dathazayuki/RuinOfOdin`** từ danh sách (nếu chưa thấy, bấm *"Configure GitHub App"* để cấp quyền đọc repo).
5. Điền thông tin cấu hình:
   - **Name**: `ruin-of-odin` (hoặc tên tùy thích).
   - **Region**: Singapore (hoặc bất kỳ khu vực nào gần bạn để ping thấp).
   - **Language / Runtime**: Chọn **`Docker`**.
   - **Instance Type**: Chọn **`Free`** ($0/tháng).
6. Bấm **"Deploy Web Service"**.
7. Đợi khoảng 2 - 3 phút để Render build Dockerfile và khởi chạy.
8. Sau khi hoàn tất, Render sẽ cấp cho bạn một đường link HTTPS (ví dụ: `https://ruin-of-odin.onrender.com`).
   - Bạn có thể mở link này trên điện thoại hoặc máy tính.
   - Gửi link này cho bạn bè: một người bấm **"Create a room"**, người kia nhập mã phòng và bấm **"Join"** để chiến đấu thời gian thực!

---

## ⚡ PHƯƠNG ÁN 2: Triển Khai 24/7 Lên Railway.app

1. Truy cập [Railway.app](https://railway.app/) và đăng nhập bằng GitHub.
2. Chọn **"New Project"** -> **"Deploy from GitHub repo"** -> Chọn **`Dathazayuki/RuinOfOdin`**.
3. Railway sẽ tự động nhận diện file [`Dockerfile`](file:///d:/du%20an/RuneOfOdin/Dockerfile) và build toàn bộ dự án.
4. Vào tab **Settings** của service -> Mục **Networking** -> Bấm **"Generate Domain"** (Ví dụ: `ruin-of-odin.up.railway.app`).
5. Truy cập domain được cấp để chơi trực tiếp.

---

## 🔗 PHƯƠNG ÁN 3: Tạo Live Public Link Ngay Lập Tức Từ Máy Local (Instant Tunnel)

Nếu bạn đang chạy game trên máy tính và muốn gửi link ngay cho bạn bè chơi cùng lúc này mà không cần chờ deploy lên Cloud:

1. Mở PowerShell trong thư mục dự án và khởi động server production:
   ```powershell
   npm run build
   npm run start
   ```
2. Mở thêm 1 cửa sổ PowerShell thứ 2 và chạy Cloudflare Tunnel:
   ```powershell
   .\cloudflared.exe tunnel --url http://127.0.0.1:3001
   ```
3. Cloudflare sẽ tạo ra một đường link công khai dạng:
   `https://xxxx-xxxx-xxxx.trycloudflare.com`
4. Copy link đó gửi cho bạn bè để vào chơi Multiplayer ngay lập tức!

---

## 🧪 Cách Kiểm Tra Tính Năng Multiplayer

1. Mở link Web trên 2 thiết bị khác nhau (hoặc 1 tab thường + 1 tab ẩn danh).
2. **Người chơi 1 (Host)**: 
   - Nhìn sang panel bên phải mục **Multiplayer**.
   - Bấm **"Create a room"**.
   - Hệ thống sẽ cấp một mã phòng gồm 6 ký tự (Ví dụ: `8F2A1C`).
3. **Người chơi 2 (Rival)**:
   - Nhập mã phòng `8F2A1C` vào ô input.
   - Bấm **"Join"**.
4. Hệ thống sẽ tự động đồng bộ hóa thời gian thực qua WebSocket, tung xúc xắc chọn người đi trước và đưa cả 2 vào trận đấu!

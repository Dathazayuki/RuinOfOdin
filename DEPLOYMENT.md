# 🚀 CORE BATTLE — Hướng Dẫn Triển Khai (Deployment Guide)

Tài liệu này hướng dẫn chi tiết các bước triển khai dự án **CORE BATTLE** lên môi trường Production trên Cloud theo đúng kiến trúc của Phase 9 trong `Readme.md`:
* **Frontend**: Triển khai trên **Vercel**
* **Backend (WebSocket & Game Engine)**: Triển khai trên **Railway** (hoặc bất kỳ nền tảng Docker Container nào)

---

## 🏗️ Kiến Trúc Production

```text
       Trình duyệt người dùng (Web Browser)
                │                 │
                │ (HTTPS)         │ (WSS WebSocket)
                ▼                 ▼
          Vercel (Frontend)    Railway (Backend)
          React 19 + Vite      Node 22 + Socket.IO Authoritative Engine
```

---

## BƯỚC 1: Triển Khai Backend Lên Railway

### 1.1 Tạo Project trên Railway
1. Truy cập [Railway.app](https://railway.app/) và đăng nhập (bằng tài khoản GitHub).
2. Chọn **"New Project"** -> **"Deploy from GitHub repo"**.
3. Chọn repository chứa mã nguồn dự án **RuneOfOdin**.
4. Railway sẽ tự động phát hiện file [`railway.toml`](file:///d:/du%20an/RuneOfOdin/railway.toml) và [`Dockerfile`](file:///d:/du%20an/RuneOfOdin/Dockerfile) ở thư mục gốc.

### 1.2 Thiết lập Biến Môi Trường (Variables) trên Railway
Trong mục **Variables** của service trên Railway, thêm các biến:
* `PORT`: `3001` (hoặc để Railway tự gán biến `$PORT`)
* `NODE_ENV`: `production`
* `CLIENT_URL`: `https://your-frontend.vercel.app` *(Sau khi tạo Vercel ở Bước 2, hãy quay lại đây cập nhật đúng domain của Vercel; trong lúc test ban đầu có thể tạm để `*` hoặc localhost)*

### 1.3 Cấp Public Domain cho Backend
1. Vào tab **Settings** của service trên Railway.
2. Tại mục **Networking**, click **"Generate Domain"** (Ví dụ sẽ được: `core-battle-production.up.railway.app`).
3. Kiểm tra kiểm tra sức khỏe hệ thống:
   Truy cập: `https://core-battle-production.up.railway.app/health`
   Kết quả trả về JSON: `{"status":"ok","service":"core-battle"}` là backend đã hoạt động thành công!

---

## BƯỚC 2: Triển Khai Frontend Lên Vercel

### 2.1 Tạo Project trên Vercel
1. Truy cập [Vercel.com](https://vercel.com/) và đăng nhập.
2. Chọn **"Add New..."** -> **"Project"** -> Import repository GitHub của bạn.

### 2.2 Cấu hình Project trên Vercel
Dự án đã có sẵn file [`vercel.json`](file:///d:/du%20an/RuneOfOdin/vercel.json) ở thư mục gốc và [`apps/client/vercel.json`](file:///d:/du%20an/RuneOfOdin/apps/client/vercel.json) hỗ trợ SPA Routing.
* **Framework Preset**: `Vite`
* **Root Directory**: Giữ nguyên `./` (root) hoặc chọn `apps/client`
  * Nếu giữ `./` (Khuyên dùng): File `vercel.json` gốc sẽ tự động chạy:
    * **Build Command**: `npm run build -w @core-battle/client`
    * **Output Directory**: `apps/client/dist`
* **Environment Variables**:
  * Thêm biến: `VITE_SERVER_URL`
  * Giá trị: `https://core-battle-production.up.railway.app` *(Domain Railway bạn vừa lấy ở Bước 1.3)*

3. Bấm **"Deploy"**. Quá trình build sẽ mất khoảng 30-45 giây.

---

## BƯỚC 3: Kết Nối Hai Bên & Hoàn Tất

1. Sau khi Vercel deploy xong, bạn sẽ có URL Frontend (Ví dụ: `https://core-battle.vercel.app`).
2. Quay lại tab **Variables** trên **Railway**, cập nhật biến `CLIENT_URL` thành URL chính thức của Vercel (ví dụ `https://core-battle.vercel.app`).
3. Railway sẽ tự động re-deploy trong vài giây để áp dụng CORS policy mới.

---

## 🧪 Kiểm Thử Hệ Thống (Verification)

1. Mở trang Vercel trên trình duyệt.
2. **Kiểm tra Single-player**: Bấm **"Play against bot"**, chọn độ khó Easy hoặc Normal. Đánh thử vài round để kiểm tra render bàn cờ, rút bài, animation và âm thanh Web Audio.
3. **Kiểm tra Multiplayer**:
   * Mở 2 cửa sổ trình duyệt (hoặc 1 cửa sổ thường + 1 cửa sổ ẩn danh).
   * Cửa sổ 1: Bấm **"Create a room"** -> Nhận mã phòng 6 ký tự (ví dụ: `AB12CD`).
   * Cửa sổ 2: Nhập mã phòng và bấm **"Join"**.
   * Cả 2 người chơi sẽ được đưa vào bàn cờ thời gian thực qua WebSocket!
   * Thử ngắt mạng một bên để kiểm tra màn hình đếm ngược 30 giây reconnect (`RESUME_ROOM`).

---

## 🛠️ Lệnh Hỗ Trợ Local (Local Production Test)

Nếu muốn chạy thử nghiệm mô phỏng production ngay trên máy tính của bạn:

```bash
# 1. Build toàn bộ dự án
npm run build

# 2. Chạy server production ở cổng 3001
$env:PORT="3001"; $env:CLIENT_URL="http://localhost:4173"; $env:NODE_ENV="production"; node apps/server/dist/index.js

# 3. Chạy client ở chế độ preview
npm run preview -w @core-battle/client
```

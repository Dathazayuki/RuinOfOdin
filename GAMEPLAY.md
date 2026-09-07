# Gameplay hiện tại — Mana 5 & Deck Builder

Tài liệu này mô tả luật đang chạy sau bản cập nhật ngày 07/09/2026. Các quy tắc bên dưới thay thế phần mana tăng dần, triệu hồi phải chờ và deck cố định trong thiết kế ban đầu ở `Readme.md`.

## Lượt và mana

- `GameState.round` là **số lượt toàn trận**, không phải cặp lượt: người đi trước có lượt 1, người còn lại có lượt 2, rồi lần lượt 3, 4… Giao diện hiển thị **TURN**.
- Cả hai người luôn có `maxMana = 5`. Người đi trước bắt đầu với 5 mana; người thứ hai có 0 mana trước lượt đầu của mình.
- Khi bắt đầu lượt, chỉ người đang đến lượt được hồi mana về 5. Mana không tích lũy và không tăng theo số lượt.
- Mỗi bên nhận 4 lá ban đầu rồi rút 1 lá khi bắt đầu lượt của mình, kể cả lượt đầu tiên. Giới hạn trên tay vẫn là 7; rút thêm khi đầy sẽ bỏ lá mới rút.
- Không có Tactic Token trong chế độ lượt xen kẽ hiện tại.

## Giao chiến khi kết thúc lượt (Cơ chế Rush)

- **Lượt 1:** toàn bộ quân của người đi trước không được tấn công khi kết thúc lượt.
- **Từ lượt 2 (Cơ chế Rush):**
  - Quân **vừa triệu hồi trong lượt**: nếu đối diện có Unit của đối thủ, quân này **tấn công ngay** để tiêu diệt quái địch và tranh quyền kiểm soát lane. Nếu đối diện là **lane trống**, quân này **CHƯA được đánh vào Core** ở lượt này (phải đứng canh gác).
  - Quân **đã sống sót từ các lượt trước**: luôn được quyền tấn công cả Unit đối thủ lẫn Core (nếu lane trống).
- Chỉ quân của người đang kết thúc lượt chủ động tấn công. Quân đối phương trong cùng lane phản đòn; sát thương trao đổi đồng thời. Quân bên phòng thủ không tự đánh Core ở lane trống.
- Mage vẫn gây 2 sát thương Battlecry ngay khi triệu hồi. Từ lượt 2, nếu đối diện có Unit, Mage có thể đánh tiếp; nếu lane trống, Mage chưa đánh Core lượt này.
- Poison được xử lý trước tấn công. Quân chết vì Poison không được tham gia giao chiến. Freeze ngăn chủ động tấn công nhưng vẫn cho phép phản đòn, và hết hạn sau combat của chủ sở hữu.
- Sudden Death hiện có được giữ nguyên: từ lượt 21, hai Core chịu 2 sát thương khi bắt đầu combat.

## Tạo bộ bài

Mở **Edit Deck** tại lobby để chỉnh bộ bài dùng cho Solo hoặc Multiplayer.

- Chính xác **30 lá**, tối đa **3 bản mỗi loại**.
- Có 11 loại: Goblin, Assassin, Archer, Knight, Guardian, Mage, Fireball, Freeze, Lightning, Heal, Poison.
- Deck mặc định giữ nguyên: 15 Unit + 15 Spell. Deck tùy chỉnh không bắt buộc tỷ lệ này.
- Modal hiển thị số lượng lá, Unit/Spell, mana trung bình và bộ đếm từng loại.
- **Reset to Starter Deck** chỉ đổi bản nháp. **Save & Ready** chỉ khả dụng khi deck hợp lệ; đóng modal hoặc nhấn Escape sẽ bỏ các chỉnh sửa chưa lưu.
- Deck đã lưu nằm tại `localStorage`, khóa `core-battle-custom-deck`. Reload vẫn giữ lựa chọn. Nếu browser chặn storage, deck dùng được trong phiên hiện tại và ứng dụng báo không thể lưu lâu dài.
- Dữ liệu storage không đọc được hoặc có loại bài không tồn tại sẽ được thay bằng starter deck. Deck nhận dạng được nhưng thiếu/thừa lá vẫn mở được để sửa; thử bắt đầu trận bằng deck sai sẽ tự mở Deck Builder.

## Engine và Multiplayer

`validateDeck()` là validator dùng chung. `createGame(seed, [deck0, deck1])` xác thực deck, sao chép/shuffle có seed và không thay đổi danh sách đầu vào; bỏ tham số deck sẽ dùng starter cho cả hai.

Trong Solo, người dùng chơi deck tùy chỉnh và bot chơi starter. Trong PvP, `CREATE_ROOM` và `JOIN_ROOM` nhận `deck` tùy chọn; server kiểm tra trước khi cấp chỗ và sử dụng riêng deck của từng người. Client cũ không gửi deck vẫn dùng starter.

Deck đã chọn không xuất hiện trong snapshot của đối thủ. Server chỉ gửi bài trên tay cho chủ sở hữu và số lượng bài cho đối thủ. Khi mất kết nối, deck được giữ trong thời gian chờ reconnect 30 giây để có thể tiếp tục đúng trận; danh sách deck của phòng được dọn khi rời phòng, kết thúc trận hoặc phòng hết hạn.

## Chạy và kiểm tra

```sh
npm test
npm run build
node apps/server/dist/index.js
```

Mở `http://localhost:3001` để chơi bản production được server phục vụ trực tiếp. Để phát triển, dùng `npm run dev` và mở `http://localhost:5173`.

Kiểm thử engine/server bao gồm mana cố định tới lượt 10+, bảo vệ lượt 1, tấn công ngay lượt 2+, phản đòn, Freeze/Poison, thắng bằng quân mới triệu hồi, deck sai và deck riêng của hai client, reconnect, quyền riêng tư và lưu trữ trình duyệt.

Kiểm thử trình duyệt production:

```sh
npx playwright install chromium
npm run test:e2e
```

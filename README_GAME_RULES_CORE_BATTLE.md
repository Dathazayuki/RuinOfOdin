# 🎴 CORE BATTLE — GAME RULES

> **Gameplay Rules Reference**
>
> Đây là tài liệu chỉ mô tả **luật chơi** của CORE BATTLE.
> Kiến trúc, code, multiplayer implementation, deployment, testing, roadmap và các yêu cầu kỹ thuật không thuộc tài liệu này.
>
> Các luật dưới đây áp dụng cho **kiến trúc/game engine hiện tại**.

---

## 1. Tổng quan trận đấu

CORE BATTLE là game card battle theo lượt với **3 lane**.

Mỗi trận có đúng **2 người chơi**. Mục tiêu là phá **Magic Crystal Core** của đối thủ.

- Mỗi Core bắt đầu với **30 HP**.
- Mỗi người chơi sử dụng bộ bài **15 lá**.
- Bàn đấu có đúng **3 lane**.
- Mỗi người chơi chỉ được có tối đa **1 Unit trên mỗi lane**.
- Mỗi người chơi tối đa **3 Unit** trên bàn.
- Toàn bộ bàn đấu tối đa **6 Unit**.
- Unit chỉ giao chiến với Unit đối phương ở **cùng lane**.

---

## 2. Bàn đấu

```text
                    ENEMY CORE
                      30 HP

             ┌────────┬────────┬────────┐
             │ Lane 1 │ Lane 2 │ Lane 3 │
             │ Enemy  │ Enemy  │ Enemy  │
             └────────┴────────┴────────┘

                   BATTLEFIELD

             ┌────────┬────────┬────────┐
             │ Lane 1 │ Lane 2 │ Lane 3 │
             │ Player │ Player │ Player │
             └────────┴────────┴────────┘

                     YOUR CORE
                       30 HP
```

### Quy tắc lane

- Unit ở Lane 1 chỉ tương tác với Unit đối phương ở Lane 1.
- Unit ở Lane 2 chỉ tương tác với Unit đối phương ở Lane 2.
- Unit ở Lane 3 chỉ tương tác với Unit đối phương ở Lane 3.
- Không có việc tự do chuyển mục tiêu sang lane khác trong Auto Combat.
- Nếu lane đối phương trống, Unit có thể gây sát thương trực tiếp lên Core.

---

# 3. Core

## 3.1 HP

Mỗi người chơi bắt đầu với:

```text
30 HP
```

Khi Core xuống **0 HP hoặc thấp hơn**, người chơi đó thua.

HP hiển thị không thấp hơn 0.

---

## 3.2 Điều kiện thắng

### Thắng

```text
Enemy Core <= 0
→ YOU WIN
```

### Thua

```text
Your Core <= 0
→ YOU LOSE
```

### Hòa

Nếu cả hai Core cùng xuống 0 trong **cùng một resolution cycle**:

```text
DRAW
```

Việc kiểm tra thắng/thua/hòa được thực hiện sau khi toàn bộ sát thương của resolution hiện tại đã được áp dụng.

---

# 4. Deck và Hand

## 4.1 Deck

MVP sử dụng một bộ bài cố định:

```text
15 Cards
├── 10 Units
└── 5 Spells
```

Duplicate card được phép.

Không có deck building trong bộ luật hiện tại.

---

## 4.2 Starting Hand

Mỗi người chơi bắt đầu với:

```text
4 Cards
```

---

## 4.3 Maximum Hand

Hand tối đa:

```text
7 Cards
```

Nếu người chơi đang có 7 lá và phải draw thêm:

```text
Draw Card
→ Card bị discard ngay lập tức
```

Lá bị discard không quay trở lại Deck trong trận đấu hiện tại.

---

# 5. Turn System

Trận đấu sử dụng **Sequential Turn System**.

Hai người chơi lần lượt thực hiện lượt của mình.

```text
TURN 1
Player A
   ↓
Start Turn
   ↓
Main Phase
   ↓
End Phase
   ↓
Auto Combat
   ↓
Check Win
   ↓
TURN 2
Player B
   ↓
...
```

Turn tiếp tục luân phiên cho tới khi trận đấu kết thúc.

---

# 6. First Player Rule

Người chơi đi trước có một hạn chế đặc biệt trong Turn 1.

## First Player — Turn 1

Có thể:

```text
Play Unit      ✅
Cast Spell     ✅
Use Mana       ✅
Attack         ❌
```

Khi First Player kết thúc Turn 1:

- Auto Combat **vẫn diễn ra**.
- Unit của First Player **không được tấn công**.

## Từ các lượt sau

```text
First Player:
Turn 1 → Không attack
Turn 3+ → Có thể attack

Second Player:
Turn 2+ → Có thể attack
```

Không có Mana bonus hoặc Tactic Token bổ sung cho Second Player.

---

# 7. Start Turn

Đầu mỗi turn:

```text
1. Tăng Max Mana nếu cần
2. Refill Mana
3. Draw 1 Card
4. Bắt đầu Main Phase
```

## Mana progression

| Turn | Max Mana |
|---:|---:|
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 4 |
| 5 | 5 |
| 6 | 6 |
| 7 | 7 |
| 8 | 8 |
| 9 | 9 |
| 10+ | 10 |

Mana tối đa:

```text
10
```

Mana được refill về Max Mana ở đầu lượt của người chơi đang active.

---

# 8. Main Phase

Trong Main Phase, Active Player có thể thực hiện bao nhiêu action hợp lệ tùy ý, miễn còn đủ Mana.

Các action hiện tại:

```text
Play Unit
Cast Spell
End Phase
```

Không có giới hạn số Unit hoặc Spell được chơi trong một Main Phase ngoài các giới hạn về Mana và luật board.

Ví dụ:

```text
Mana = 5

Play Goblin   Cost 1
Play Knight   Cost 3
```

Sau đó còn:

```text
1 Mana
```

Nếu tổng Cost vượt quá Mana hiện tại, action không hợp lệ.

---

# 9. Unit Summoning

Unit chỉ có thể được summon trong Main Phase của chủ sở hữu.

Quy trình gameplay:

```text
Select Unit Card
      ↓
Select Lane
      ↓
Kiểm tra Mana
      ↓
Kiểm tra Lane
      ↓
Trừ Mana
      ↓
Unit xuất hiện trên Lane
```

---

## 9.1 Empty Lane

Nếu lane của người chơi đang trống:

```text
Summon → Allowed
```

---

## 9.2 Occupied Lane

Nếu lane đã có Unit:

```text
Summon → Rejected
Mana → Không bị trừ
Card → Vẫn ở Hand
```

Không được tự động thay thế hoặc sacrifice Unit đang đứng trên lane.

---

# 10. Summoning Sickness

Unit vừa được summon trong turn hiện tại **không thể attack trong Auto Combat của chính turn đó**.

Ví dụ:

```text
Turn 2

Summon Knight → Lane 1

End Phase
↓
Auto Combat

Knight → Cannot Attack
```

Ở turn sau:

```text
Knight → Có thể Attack
```

Summoning Sickness **chỉ ngăn việc tấn công**.

Unit vừa summon vẫn có thể:

- Nhận damage.
- Được heal.
- Nhận status effect.
- Bị Spell tác động.
- Bị phá hủy.

---

# 11. Auto Combat

Sau mỗi End Phase, nếu game chưa kết thúc, Auto Combat diễn ra.

**Active Player là Attacker.**

Chỉ Unit của Active Player được chủ động attack.

Unit của người phòng thủ:

- Không tự attack.
- Có thể gây **counter damage** nếu bị Unit đối phương tấn công trong cùng lane.

```text
Player A Main Phase
       ↓
Player A End Phase
       ↓
Player A Auto Combat
       ↓
Next Player Turn
```

---

# 12. Attack Eligibility

Một Unit chỉ được attack nếu **tất cả** điều kiện sau đúng:

```text
1. Unit thuộc Active Player
2. Unit còn sống
3. Unit không được summon trong turn hiện tại
4. Unit không bị Frozen
```

Nếu một điều kiện không đúng:

```text
Unit → Không Attack
```

Đặc biệt:

```text
First Player Turn 1
→ Không có Unit nào được attack
```

---

# 13. Lane Combat

Mỗi lane được xét độc lập, nhưng **combat damage của toàn bộ lane phải được xem là xảy ra đồng thời**.

Có 3 trường hợp.

---

## 13.1 Cả hai bên đều có Unit

```text
Active Unit
    VS
Enemy Unit
```

Active Unit attack Enemy Unit.

Hai Unit gây damage cho nhau **đồng thời**.

Ví dụ:

```text
Knight
4 ATK / 5 HP

VS

Goblin
2 ATK / 2 HP
```

Kết quả:

```text
Knight: 5 → 3 HP
Goblin: 2 → 0 HP → Dead
```

Defending Unit vẫn gây counter damage dù không phải Active Player.

---

## 13.2 Active Unit gặp Empty Lane

Nếu lane đối phương trống:

```text
Active Unit
     ↓
Enemy Core
```

Enemy Core nhận damage bằng **ATK hiện tại của Unit**.

Ví dụ:

```text
Archer = 4 ATK
Enemy Lane = Empty
Enemy Core = 30

→ Enemy Core = 26 HP
```

---

## 13.3 Active Lane trống

Nếu Active Player không có Unit ở lane đó:

```text
Nothing happens
```

---

# 14. Simultaneous Combat

Combat của các lane không được xử lý theo kiểu:

```text
Lane 1 → damage → death
Lane 2 → damage → death
Lane 3 → damage → death
```

Thay vào đó:

```text
Read combat state của tất cả lane
        ↓
Tính toàn bộ combat damage
        ↓
Apply damage cùng nhau
        ↓
Remove tất cả Unit chết
```

Ví dụ:

```text
Lane 1:
Unit A = 5 ATK / 1 HP
Unit B = 5 ATK / 1 HP

Lane 2:
Unit C = 4 ATK / 3 HP
Unit D = 2 ATK / 4 HP
```

Lane 1:

```text
A chết
B chết
```

Lane 2:

```text
C nhận 2 damage → 1 HP
D nhận 4 damage → chết
```

Tất cả kết quả được xác định từ cùng một trạng thái trước damage.

---

# 15. Exact Auto Combat Resolution

Auto Combat được xử lý theo thứ tự:

```text
1. Combat Start

2. Resolve Start-of-Combat Status
   └─ Poison

3. Remove Units chết bởi Status

4. Determine Attackers
   ├─ Alive
   ├─ Not Summoned This Turn
   ├─ Not Frozen
   └─ First Player Turn 1 = No Attackers

5. Resolve Unit-vs-Unit Combat

6. Resolve Direct Core Damage
   └─ Unopposed Active Units

7. Apply Combat Damage

8. Remove Units có HP <= 0

9. Resolve Death

10. Update Status Duration

11. Check Win / Lose / Draw

12. Combat End
```

**Không resolve hoàn toàn từng lane trước khi chuyển sang lane tiếp theo.**

---

# 16. Unit Death

Unit chết khi:

```text
HP <= 0
```

Unit đã chết:

```text
Cannot Attack
Cannot Counterattack
Cannot Be Healed
Cannot Receive New Status
```

Unit bị kill bởi Status trước Auto Combat sẽ được loại khỏi combat trước khi xác định attacker.

---

# 17. Core Damage

Trong Auto Combat thông thường, chỉ **Active Player's attacking Unit** mới có thể gây direct damage lên Enemy Core.

Điều kiện:

```text
Active Unit
+
Enemy Lane Empty
=
Core Damage
```

Defending Unit không gây direct Core damage trong lượt của đối thủ.

---

# 18. Card List

## 18.1 Unit Cards

| Card | Qty | Cost | ATK | HP | Role |
|---|---:|---:|---:|---:|---|
| Goblin | 3 | 1 | 2 | 2 | Early pressure |
| Archer | 2 | 3 | 4 | 3 | High offense |
| Knight | 2 | 3 | 4 | 5 | Balanced |
| Guardian | 2 | 4 | 2 | 8 | Tank / blocker |
| Mage | 1 | 5 | 5 | 4 | Value / Battlecry |

Tổng:

```text
10 Units
```

---

## 18.2 Spell Cards

| Card | Qty | Cost | Effect |
|---|---:|---:|---|
| Fireball | 1 | 3 | Deal 4 damage to target enemy Unit |
| Freeze | 1 | 2 | Freeze target enemy Unit |
| Lightning | 1 | 4 | Deal 3 damage to all enemy Units |
| Heal | 1 | 2 | Restore 4 HP to friendly Unit |
| Poison | 1 | 2 | Apply Poison |

Tổng:

```text
5 Spells
```

---

# 19. Unit Definitions

## Goblin

```text
Cost: 1
ATK: 2
HP: 2
```

Không có special ability.

---

## Archer

```text
Cost: 3
ATK: 4
HP: 3
```

Không có special ability.

---

## Knight

```text
Cost: 3
ATK: 4
HP: 5
```

Không có special ability.

---

## Guardian

```text
Cost: 4
ATK: 2
HP: 8
```

Vai trò:

```text
Tank / Lane Blocker
```

Không có special ability.

---

## Mage

```text
Cost: 5
ATK: 5
HP: 4
```

### Battlecry

Ngay khi Mage được summon thành công:

```text
Deal 2 damage
to the enemy Unit
in the same lane.
```

Nếu lane đối phương trống:

```text
No Core Damage
```

Battlecry xảy ra ngay trong Main Phase.

Mage vẫn chịu Summoning Sickness và không thể attack trong Auto Combat của turn vừa summon.

---

# 20. Spell Rules

Spell được cast trong Main Phase và resolve **ngay lập tức**.

Không có Spell Stack.

Ví dụ:

```text
Cast Fireball
↓
Fireball resolves
↓
Damage applied
↓
Continue Main Phase
```

Không có người chơi khác interrupt Spell.

---

# 21. Fireball

```text
Cost: 3
```

Effect:

```text
Deal 4 damage
to target enemy Unit.
```

Không thể target Core.

Target phải là Enemy Unit đang tồn tại.

---

# 22. Freeze

```text
Cost: 2
```

Effect:

```text
Target enemy Unit becomes Frozen.
```

Duration:

```text
1 enemy Auto Combat
```

Frozen Unit:

```text
Cannot initiate attack
Can receive damage
Can deal counter damage
Can be healed
Can receive Poison
```

Freeze không loại bỏ các status effect khác.

### Freeze timing

Freeze được tiêu thụ bởi **Auto Combat tiếp theo của người chơi đang sở hữu Unit bị Freeze**.

Ví dụ:

```text
Player A
  ↓
Freeze Unit B
  ↓
Player B's next Auto Combat
  ↓
Unit B cannot attack
  ↓
Freeze expires
```

Nếu Unit B bị attack trong lúc Frozen, Unit B vẫn counterattack bình thường.

---

# 23. Lightning

```text
Cost: 4
```

Effect:

```text
Deal 3 damage
to every enemy Unit.
```

Lightning tác động lên tất cả Unit đối phương ở cả 3 lane.

Ví dụ:

```text
Lane 1 → 3 damage
Lane 2 → 3 damage
Lane 3 → 3 damage
```

Damage được áp dụng trước khi các Unit chết được remove.

---

# 24. Heal

```text
Cost: 2
```

Effect:

```text
Restore 4 HP
to target friendly Unit.
```

HP không thể vượt quá Max HP.

Ví dụ:

```text
Guardian
Max HP = 8
Current HP = 5

Heal 4
→ 8 HP
```

Heal không thể target Core.

---

# 25. Poison

```text
Cost: 2
```

Effect:

```text
Target enemy Unit becomes Poisoned.
```

Duration:

```text
2 enemy Auto Combats
```

Mỗi Auto Combat bị ảnh hưởng:

```text
Start of Auto Combat
→ Poison deals 2 damage
```

Nếu Poison làm Unit xuống 0 HP:

```text
Unit dies
↓
Unit is removed before normal attacks
```

Unit chết bởi Poison không thể:

```text
Attack
Counterattack
```

---

# 26. Status Effect Timing

MVP hiện có:

```text
Freeze
Poison
```

## Poison

Poison xảy ra ở đầu Auto Combat của người chơi sở hữu Unit bị Poison:

```text
Combat Start
↓
Poison Damage
↓
Remove Poison-killed Units
↓
Determine Attackers
↓
Normal Combat
```

## Freeze

Freeze ngăn Unit initiate attack trong Auto Combat bị ảnh hưởng.

Freeze **không ngăn counter damage**.

---

# 27. Card Target Validation

Target của Spell phải hợp lệ tại thời điểm Spell được xử lý.

| Spell | Target |
|---|---|
| Fireball | Enemy Unit |
| Freeze | Enemy Unit |
| Heal | Friendly Unit |
| Poison | Enemy Unit |
| Lightning | Không cần target cụ thể |

Nếu target không còn hợp lệ:

```text
Spell Action → Rejected
Mana → Không bị trừ
Card → Vẫn ở Hand
```

---

# 28. Sudden Death

Để tránh trận đấu kéo dài vô hạn:

```text
Turn 21
```

Nếu vẫn chưa có người thắng, Sudden Death bắt đầu.

Từ thời điểm đó, ở đầu mỗi Auto Combat:

```text
Both Cores
→ Take 2 unavoidable damage
```

Sudden Death damage:

- Không bị Unit chặn.
- Không bị Freeze ảnh hưởng.
- Không bị Poison ảnh hưởng.
- Không phụ thuộc vào lane.
- Không phải combat damage thông thường.

Ví dụ:

```text
Core A = 8
Core B = 6

Sudden Death
↓
A = 6
B = 4
```

Nếu cả hai Core cùng xuống 0 trong cùng resolution:

```text
DRAW
```

---

# 29. Complete Turn Flow

Luồng gameplay hoàn chỉnh:

```text
┌────────────────────────────┐
│         TURN START         │
├────────────────────────────┤
│ Increase Max Mana          │
│ Refill Mana                │
│ Draw 1 Card                │
└──────────────┬─────────────┘
               ↓
┌────────────────────────────┐
│         MAIN PHASE         │
├────────────────────────────┤
│ Play Units                 │
│ Cast Spells                │
│ Manage 3 Lanes             │
│ Repeat legal actions       │
└──────────────┬─────────────┘
               ↓
           END PHASE
               ↓
┌────────────────────────────┐
│        AUTO COMBAT         │
├────────────────────────────┤
│ Sudden Death (if active)   │
│ Poison                     │
│ Remove dead Units          │
│ Determine Attackers        │
│ Lane Combat                │
│ Direct Core Damage         │
│ Apply Combat Damage        │
│ Remove dead Units          │
│ Update Status              │
│ Check Win/Lose/Draw        │
└──────────────┬─────────────┘
               ↓
        NEXT PLAYER TURN
```

---

# 30. Definitive Gameplay Rules

Các luật cốt lõi của phiên bản hiện tại:

```text
1. 2 Players
2. 30 HP Core mỗi người
3. 3 Lanes
4. Tối đa 1 Unit / Lane / Player
5. Tối đa 3 Units / Player
6. Deck 15 Cards
7. Starting Hand 4
8. Maximum Hand 7
9. Draw vượt Hand limit → Discard
10. Sequential Turns
11. Mana 1 → 10
12. First Player không attack Turn 1
13. Main Phase cho phép nhiều action
14. Unit mới summon không attack trong turn đó
15. Auto Combat sau mỗi End Phase
16. Chỉ Active Player initiate attack
17. Defender có Counter Damage
18. Unit-vs-Unit damage là simultaneous
19. Empty enemy lane → Direct Core Damage
20. Poison xử lý trước normal combat
21. Freeze chặn attack nhưng không chặn counterattack
22. Spell resolve ngay lập tức
23. Mage Battlecry xảy ra khi summon
24. Unit chết khi HP <= 0
25. Core <= 0 → Lose
26. Cả hai Core cùng <= 0 → Draw
27. Turn 21+ → Sudden Death
```

---

# 31. Final Game Objective

Người chơi phải sử dụng:

```text
Mana
+
Units
+
3-Lane Positioning
+
Spells
+
Status Effects
```

để tạo ra lợi thế trên 3 lane và đưa **Enemy Core từ 30 HP xuống 0 HP** trước đối thủ.

Trọng tâm chiến thuật của game là:

```text
Lane Control
      +
Mana Management
      +
Unit Trading
      +
Timing của Spells / Status
      +
Direct Core Pressure
```

---

**END — CORE BATTLE GAME RULES**

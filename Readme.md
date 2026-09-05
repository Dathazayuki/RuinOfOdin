# 🎴 CORE BATTLE — Web Card Game

A turn-based 3-lane card battle game for the Web.

Two players control Units and Spells to destroy the opponent's **Magic Crystal Core**.

The game supports:

* 🤖 Single-player vs Bot
* ⚔️ Player vs Player
* 🔗 Room Code multiplayer
* 🚫 No account required
* 🌐 Browser deployment
* 🖥️ Desktop-first UI
* ⚡ Real-time PvP using WebSocket
* 🧪 Deterministic and testable game engine

---

# 1. Game Design Goals

Core Battle should feel:

* Easy to learn
* Fast to play
* Strategically meaningful
* Deterministic
* Suitable for Web
* Easy to expand with new Cards later

A normal match should target:

```text
5–10 minutes
```

The MVP should prioritize:

```text
Gameplay > Balance > Responsiveness > Visual Polish
```

---

# 2. Match Overview

Each player has:

```text
Core HP:       30
Deck:          15 Cards
Starting Hand: 4 Cards
```

The battlefield contains:

```text
3 Lanes
```

Each player can control a maximum of:

```text
3 Units
```

One Unit per Lane.

---

# 3. Battlefield

The board is divided into three lanes.

```text
                ENEMY CORE
                 💎 30 HP

        ┌───────┬───────┬───────┐
        │ LANE 1│ LANE 2│ LANE 3│
        │ Enemy │ Enemy │ Enemy │
        └───────┴───────┴───────┘

========================================
             BATTLEFIELD
========================================

        ┌───────┬───────┬───────┐
        │ LANE 1│ LANE 2│ LANE 3│
        │ Player│ Player│ Player│
        └───────┴───────┴───────┘

                 💎 30 HP
                YOUR CORE
```

Each lane forms an independent combat pair.

---

# 4. Core Rules

## 4.1 Core HP

Both players begin with:

```text
30 HP
```

When Core HP reaches:

```text
0
```

that player loses.

---

## 4.2 Deck

Each player uses a predefined:

```text
15-card deck
```

MVP does not require deck building.

The deck contains:

```text
10 Units
5 Spells
```

Duplicate cards are allowed.

The initial recommended deck is defined in Section 12.

---

## 4.3 Hand

Starting hand:

```text
4 Cards
```

Maximum hand:

```text
7 Cards
```

If a player attempts to draw while the hand is full:

```text
Card is not added to Hand
Card is discarded
```

This prevents an infinite resource advantage.

---

# 5. Round System

The game uses a **Round-based system**, not combat immediately after one player presses End Turn.

Each Round contains:

```text
PLAYER PHASE A
      ↓
PLAYER PHASE B
      ↓
COMBAT PHASE
      ↓
END OF ROUND
      ↓
NEXT ROUND
```

Player A and Player B each receive one Action Phase.

---

# 6. First Player

The first player is selected randomly.

Example:

```text
Player A = First Player
Player B = Second Player
```

To reduce first-player advantage:

### First Player

Starts with:

```text
1 Mana
4 Cards
```

### Second Player

Starts with:

```text
1 Mana
4 Cards
```

The Second Player receives a special temporary resource:

```text
+1 Tactic Token
```

The Tactic Token can be spent once during the entire match to gain:

```text
+1 Mana for the current Action Phase
```

After being used, it is removed permanently.

This gives the second player a small compensating advantage without making the first player weaker.

---

# 7. Round Flow

Example:

```text
ROUND 1
────────────────────────

Player A Action Phase
        ↓
Player B Action Phase
        ↓
Combat Phase
        ↓
Round End

ROUND 2
────────────────────────

Player A Action Phase
        ↓
Player B Action Phase
        ↓
Combat Phase
        ↓
Round End
```

The same player always acts first during a Round.

The starting player should NOT alternate every round in the MVP.

---

# 8. Mana System

Mana is refreshed at the beginning of each Round.

The maximum Mana increases by one every Round.

```text
Round 1 → 1 Mana
Round 2 → 2 Mana
Round 3 → 3 Mana
Round 4 → 4 Mana
Round 5 → 5 Mana
...
Round 10+ → 10 Mana
```

Maximum:

```text
10 Mana
```

At the beginning of every Round:

```text
maxMana += 1
mana = maxMana
```

However, both players share the same round-based Mana progression.

Therefore:

```text
Round 5

Player A = 5 Mana
Player B = 5 Mana
```

This avoids resource advantage caused purely by turn order.

---

# 9. Action Phase

Each player gets one Action Phase per Round.

During their Action Phase they may perform any number of legal actions until they choose:

```text
END PHASE
```

Possible actions:

```text
Play Unit
Cast Spell
Use Tactic Token
```

The player may combine actions:

```text
Play Goblin
↓
Play Archer
↓
Cast Fireball
↓
End Phase
```

provided enough Mana remains.

---

# 10. Unit Summoning Rules

A Unit can be played only during the controlling player's Action Phase.

Example:

```text
Player A Action Phase

Mana = 5

Play Knight
Cost = 3

Mana becomes 2
```

---

## 10.1 Summon Into Empty Lane

If the lane is empty:

```text
Unit enters the lane.
```

The Unit is considered:

```text
SUMMONED
```

---

## 10.2 Summon Into Occupied Lane

A Unit may NOT be summoned into an occupied friendly lane.

Example:

```text
Lane 1:

Knight
```

Trying to summon:

```text
Goblin
```

to Lane 1 is illegal.

The Card remains in Hand.

Mana is not spent.

---

# 11. Summoning Sickness

A newly summoned Unit cannot attack during the current Combat Phase.

This prevents a player from:

```text
Generate Unit
↓
Immediately deal damage
```

However, the Unit may defend normally.

Example:

```text
ROUND 2

Player A summons Knight

        ↓

COMBAT PHASE

Knight cannot attack.
```

On the next Combat Phase:

```text
Knight CAN attack.
```

Therefore:

```text
newly summoned Unit
= cannot attack this Combat Phase

existing Unit
= can attack this Combat Phase
```

---

# 12. Initial 15-Card Deck

The MVP uses a single predefined deck.

The deck is designed around:

```text
Midrange / Lane Control
```

The strategy is:

```text
Cheap Units
+
Strong mid-game Units
+
Direct removal
+
Status effects
```

---

## Deck List

### Units

| Card     | Quantity | Cost | ATK | HP | Role             |
| -------- | -------: | ---: | --: | -: | ---------------- |
| Goblin   |        3 |    1 |   2 |  2 | Early pressure   |
| Archer   |        2 |    3 |   4 |  3 | Lane damage      |
| Knight   |        2 |    3 |   4 |  5 | Balanced fighter |
| Guardian |        2 |    4 |   2 |  8 | Tank             |
| Mage     |        1 |    5 |   5 |  4 | Finisher         |

Total:

```text
10 Unit Cards
```

---

### Spells

| Card      | Quantity | Cost | Purpose               |
| --------- | -------: | ---: | --------------------- |
| Fireball  |        1 |    3 | Single-target removal |
| Freeze    |        1 |    2 | Temporary control     |
| Lightning |        1 |    4 | Board-wide damage     |
| Heal      |        1 |    2 | Sustain               |
| Poison    |        1 |    2 | Damage over time      |

Total:

```text
5 Spell Cards
```

Total Deck:

```text
15 Cards
```

---

# 13. Card Definitions

## 13.1 Goblin

```text
Type: Unit
Cost: 1
ATK: 2
HP: 2
```

Purpose:

```text
Early pressure
```

No special ability in MVP.

---

## 13.2 Archer

```text
Type: Unit
Cost: 3
ATK: 4
HP: 3
```

Purpose:

```text
High offensive pressure
```

No special ability in MVP.

---

## 13.3 Knight

```text
Type: Unit
Cost: 3
ATK: 4
HP: 5
```

Purpose:

```text
General-purpose Unit
```

---

## 13.4 Guardian

```text
Type: Unit
Cost: 4
ATK: 2
HP: 8
```

Purpose:

```text
Defensive tank
```

---

## 13.5 Mage

```text
Type: Unit
Cost: 5
ATK: 5
HP: 4
```

MVP ability:

```text
Battlecry:
Deal 2 damage to the
enemy Unit in this lane.
```

If there is no enemy Unit:

```text
No Battlecry damage is dealt to Core.
```

The Mage enters play after Battlecry resolves.

---

# 14. Spell Definitions

## 14.1 Fireball

```text
Cost: 3
```

Effect:

```text
Deal 4 damage
to target Unit.
```

Restrictions:

```text
Cannot target Core.
```

---

# 14.2 Freeze

```text
Cost: 2
```

Effect:

```text
Target enemy Unit
becomes Frozen.
```

Duration:

```text
1 Combat Phase
```

Frozen Unit:

```text
Cannot attack.
```

The Unit can still:

```text
Receive damage
Deal defensive damage
Be healed
Receive Poison
```

Freeze does not remove other effects.

---

# 14.3 Lightning

```text
Cost: 4
```

Effect:

```text
Deal 3 damage
to every enemy Unit.
```

All damage is applied simultaneously.

If multiple Units die:

```text
All deaths occur after
Lightning damage is applied.
```

---

# 14.4 Heal

```text
Cost: 2
```

Effect:

```text
Restore 4 HP
to a friendly Unit.
```

Healing cannot exceed:

```text
Max HP
```

Example:

```text
Guardian

Max HP = 8
Current HP = 6

Heal +4

Result = 8 HP
```

Heal cannot target Core in MVP.

---

# 14.5 Poison

```text
Cost: 2
```

Effect:

```text
Target enemy Unit
becomes Poisoned.
```

Poison lasts:

```text
2 Combat Phases
```

At the beginning of each Combat Phase:

```text
Poisoned Unit takes 2 damage.
```

---

# 15. Status Effect System

MVP has:

```text
Freeze
Poison
```

Status effects should have explicit duration.

Example:

```typescript
interface StatusEffect {
    type: "FREEZE" | "POISON";
    remainingCombatPhases: number;
}
```

---

# 16. Exact Combat Timing

Combat timing MUST be deterministic.

Every Combat Phase uses the following order:

```text
STEP 1
Resolve Start-of-Combat Effects
        ↓
STEP 2
Check Unit Attack Eligibility
        ↓
STEP 3
Resolve Unit-vs-Unit Combat
        ↓
STEP 4
Resolve Direct Core Damage
        ↓
STEP 5
Remove Dead Units
        ↓
STEP 6
Resolve Death-related state changes
        ↓
STEP 7
Check Win Condition
        ↓
STEP 8
Expire Status Effects
```

---

# 17. Poison Timing

Poison occurs in:

```text
STEP 1
Start-of-Combat Effects
```

Example:

```text
Enemy Goblin
HP = 2

Poison = 2
```

At Combat Start:

```text
Goblin HP:
2 → 0
```

Goblin is marked dead.

It cannot participate in normal combat.

Then:

```text
Dead Units are removed
```

This means Poison can kill a Unit **before combat attacks occur**.

---

# 18. Freeze Timing

Freeze is checked in:

```text
STEP 2
Check Unit Attack Eligibility
```

If:

```text
Unit has Freeze
```

then:

```text
Unit cannot attack.
```

However, if the enemy Unit attacks it:

```text
Frozen Unit still deals
normal defensive damage.
```

Example:

```text
Player A Knight attacks
Player B Frozen Archer
```

The Archer does:

```text
NOT initiate an attack
```

but still receives damage normally.

If the combat system uses simultaneous exchange:

```text
Knight attacks Archer
Archer counter-damages Knight
```

provided Archer survives and is not removed before combat.

---

# 19. Unit-vs-Unit Combat

If both Units occupy the same Lane:

```text
Player Unit
    VS
Enemy Unit
```

Both deal damage simultaneously.

Example:

```text
Knight
ATK 4
HP 5

VS

Goblin
ATK 2
HP 2
```

After combat:

```text
Knight HP = 3
Goblin HP = -2
```

Goblin dies.

---

# 20. Direct Core Damage

If a Unit has no opposing Unit in the same Lane:

```text
Unit attacks Enemy Core
```

Example:

```text
Archer
ATK 4

Enemy Lane = Empty

→ Enemy Core -4 HP
```

Direct damage is resolved during:

```text
STEP 4
```

---

# 21. Newly Summoned Units During Combat

A Unit summoned during either Action Phase:

```text
Cannot attack
during the immediate Combat Phase.
```

It becomes attack-ready at:

```text
the next Combat Phase.
```

This state should be represented explicitly:

```typescript
canAttack: boolean
```

or:

```typescript
summonedRound: number
```

Recommended:

```typescript
summonedRound: number
```

A Unit can attack when:

```text
summonedRound < currentRound
```

This is safer than trusting a UI flag.

---

# 22. Combat Example

## Round 2

Player A:

```text
Knight
ATK 4
HP 5
```

Player B:

```text
Goblin
ATK 2
HP 2
```

Both existed before Round 2.

Combat:

```text
Knight → Goblin: 4 damage
Goblin → Knight: 2 damage
```

Result:

```text
Knight = 3 HP

Goblin = Dead
```

---

# 23. Combat Example — Newly Summoned Unit

Round 2:

```text
Player A Action Phase

Summon Archer
```

Enemy lane is empty.

Combat starts.

Archer:

```text
CANNOT ATTACK
```

Round 3:

```text
Archer can attack.
```

This creates counterplay against large Units.

---

# 24. Mage Battlecry Timing

Mage:

```text
Cost = 5
ATK = 5
HP = 4
```

When Mage is summoned:

```text
Battlecry triggers immediately.
```

Order:

```text
Pay 5 Mana
      ↓
Place Mage
      ↓
Battlecry
      ↓
Deal 2 damage to
enemy Unit in lane
      ↓
Continue Action Phase
```

Mage still cannot attack during the current Combat Phase because of Summoning Sickness.

---

# 25. Death Rules

A Unit is considered dead when:

```text
HP <= 0
```

It is marked:

```text
dead = true
```

Dead Units:

```text
Cannot attack
Cannot be targeted by new actions
Cannot receive healing
```

After the appropriate resolution step:

```text
Remove from Board
```

---

# 26. Simultaneous Damage

Combat damage is simultaneous.

Do not resolve:

```text
A attacks B
↓
B dies
↓
B cannot attack A
```

Instead:

```text
Calculate all combat damage
        ↓
Apply all combat damage
        ↓
Remove dead Units
```

This is critical for deterministic gameplay.

---

# 27. Win Conditions

A player loses when:

```text
Core HP <= 0
```

The opposing player wins.

---

## Simultaneous Core Destruction

If both Cores reach:

```text
HP <= 0
```

during the same resolution:

```text
DRAW
```

---

# 28. Anti-Infinite Game Rule

For MVP, an additional anti-stall rule should exist.

If the match reaches:

```text
Round 20
```

without a winner:

```text
SUDDEN DEATH
```

At the beginning of each Combat Phase during Sudden Death:

```text
Both Cores take +2 unavoidable damage.
```

Example:

```text
Player A Core = 8
Player B Core = 7

Combat begins

A Core → 6
B Core → 5
```

This guarantees the match eventually ends.

---

# 29. Bot Mode

Bot must use the SAME Game Engine as human players.

Bot code should only select:

```text
Actions
```

The Game Engine handles:

```text
Validation
Mana
Damage
Combat
Status
Win Condition
```

---

## Easy Bot

Priority:

```text
1. Play a random legal Unit.
2. Prefer empty lanes.
3. Cast a legal Spell if useful.
4. End Action Phase.
```

---

## Normal Bot

Priority order:

```text
1. Can win this Round?
2. Can kill an enemy Unit?
3. Can prevent lethal damage?
4. Can create an empty-lane attack?
5. Play the highest-value Unit.
6. Use remaining Mana efficiently.
7. End Action Phase.
```

---

# 30. Multiplayer Architecture

Recommended stack:

```text
Frontend:
React
TypeScript
Vite
Tailwind CSS
Zustand
Framer Motion
Socket.IO Client
```

Backend:

```text
Node.js
TypeScript
Express
Socket.IO
```

Testing:

```text
Vitest
```

Optional later:

```text
Zod
Redis
Turborepo
```

---

# 31. Project Structure

Recommended monorepo:

```text
core-battle/
│
├── apps/
│   │
│   ├── client/
│   │   └── src/
│   │       ├── components/
│   │       ├── pages/
│   │       ├── game/
│   │       ├── store/
│   │       ├── socket/
│   │       └── assets/
│   │
│   └── server/
│       └── src/
│           ├── rooms/
│           ├── socket/
│           ├── bot/
│           └── game/
│
├── packages/
│   └── shared/
│       └── src/
│           ├── cards/
│           ├── engine/
│           ├── types/
│           └── constants/
│
├── README.md
├── package.json
└── turbo.json
```

---

# 32. Game Engine Architecture

The Game Engine MUST be independent from:

```text
React
DOM
Socket.IO
Browser APIs
```

Recommended modules:

```text
GameEngine
├── GameState
├── TurnManager
├── ManaManager
├── DeckManager
├── CardResolver
├── CombatResolver
├── StatusResolver
├── CoreResolver
└── WinResolver
```

---

# 33. Game Actions

All player actions should use explicit commands.

Example:

```typescript
type GameAction =
    | {
        type: "PLAY_UNIT";
        cardInstanceId: string;
        lane: 0 | 1 | 2;
    }
    | {
        type: "CAST_SPELL";
        cardInstanceId: string;
        targetId?: string;
        targetLane?: 0 | 1 | 2;
    }
    | {
        type: "END_PHASE";
    }
    | {
        type: "USE_TACTIC_TOKEN";
    };
```

The engine receives:

```text
GameState
+
GameAction
```

and returns:

```text
New GameState
+
Game Events
```

---

# 34. Game Events

The engine should produce events for the UI.

Example:

```typescript
type GameEvent =
    | "CARD_DRAWN"
    | "CARD_PLAYED"
    | "UNIT_SUMMONED"
    | "SPELL_CAST"
    | "DAMAGE_DEALT"
    | "UNIT_DIED"
    | "CORE_DAMAGED"
    | "STATUS_APPLIED"
    | "STATUS_EXPIRED"
    | "COMBAT_STARTED"
    | "COMBAT_ENDED"
    | "GAME_WON"
    | "GAME_DRAW";
```

This allows the UI to animate the result without implementing game logic itself.

---

# 35. Multiplayer Server Authority

The server is the source of truth.

Client sends:

```text
PLAY_UNIT
```

Server validates:

```text
Is game active?
Is player allowed to act?
Is it this player's Action Phase?
Does player own this Card?
Is enough Mana available?
Is target/Lane valid?
```

Only after validation:

```text
GameEngine.applyAction()
```

Then:

```text
Updated GameState
+
Events
```

are sent to clients.

---

# 36. Client Must NOT Be Trusted

The client must never send authoritative values such as:

```text
Damage
Mana
Core HP
Unit HP
Card ownership
```

For example, this is invalid:

```json
{
  "damage": 999
}
```

The server calculates damage.

---

# 37. Hidden Information

A player must not receive the opponent's actual Hand contents.

Player own view:

```text
Hand:
Knight
Mage
Fireball
...
```

Opponent view:

```text
Hand:
🎴 🎴 🎴 🎴
```

Only:

```text
handSize
```

should be exposed.

The same principle applies to:

```text
Deck contents
```

The client must not know the remaining order of the opponent's deck.

---

# 38. Room System

Room states:

```text
WAITING
PLAYING
FINISHED
CLOSED
```

Create:

```text
CREATE_ROOM
```

returns:

```text
AB12CD
```

Join:

```text
JOIN_ROOM
AB12CD
```

Room capacity:

```text
2 Players
```

Third player:

```text
Rejected
```

---

# 39. Disconnect Rules

If a player disconnects:

```text
Room status = DISCONNECTED
```

MVP behavior:

```text
Opponent waits 30 seconds.
```

If disconnected player reconnects:

```text
Rejoin existing match
```

If they fail to reconnect:

```text
Opponent wins by Forfeit
```

Do not implement complex reconnect architecture before the basic multiplayer system works.

---

# 40. Asset Integration

Existing Unit Art:

```text
Knight
Guardian
Archer
Goblin
Mage
Assassin
```

Existing Spell Icons:

```text
Fireball
Freeze
Lightning
Heal
Poison
```

Existing Core Assets:

```text
core_idle.png
core_damaged.png
core_low_hp.png
core_destroyed.png
```

---

## Asset Usage

Core states:

```text
HP > 50%
→ core_idle.png

20% < HP <= 50%
→ core_damaged.png

0 < HP <= 20%
→ core_low_hp.png

HP <= 0
→ core_destroyed.png
```

---

# 41. Assassin

The existing Assassin art is reserved for the initial pool.

It is NOT required to be in the first 15-card deck.

Possible future design:

```text
Assassin

Cost: 4
ATK: 6
HP: 2
```

Future ability:

```text
Deals +2 damage when
attacking an undefended lane.
```

Do not implement this ability in MVP unless balance testing requires another offensive card.

---

# 42. Balance Philosophy

The initial cards should follow these guidelines.

Cheap Units:

```text
Low cost
Low durability
Create early pressure
```

Midrange Units:

```text
3–4 Mana
Strong board presence
```

Large Units:

```text
5+ Mana
Powerful but slow
```

Spells:

```text
Strong tactical effect
but consume Mana immediately
```

---

# 43. Strategic Archetypes in the Initial Deck

Although the deck contains only 15 Cards, it should support several strategies.

## Early Pressure

```text
Goblin
+
Archer
```

Goal:

```text
Establish multiple lanes
before opponent stabilizes.
```

---

## Defensive Play

```text
Guardian
+
Heal
+
Freeze
```

Goal:

```text
Protect Core
until stronger Units appear.
```

---

## Removal

```text
Fireball
+
Poison
+
Lightning
```

Goal:

```text
Remove enemy board presence.
```

---

## Late Game

```text
Knight
+
Guardian
+
Mage
```

Goal:

```text
Win through strong lane presence.
```

---

# 44. Test Cases

All game rules should have automated unit tests.

Framework:

```text
Vitest
```

---

## Initialization

### TC-001

Create match.

Expected:

```text
Core A = 30
Core B = 30
Hand A = 4
Hand B = 4
Round = 1
```

---

## First Player

### TC-002

Generate match twice.

Expected:

```text
First player is randomly selected.
```

The game must never assign both players as first player.

---

# Mana Tests

### TC-010

Round 1:

```text
Mana = 1
Max Mana = 1
```

### TC-011

Round 2:

```text
Mana = 2
Max Mana = 2
```

### TC-012

Round 10:

```text
Mana = 10
```

### TC-013

Round 11:

```text
Mana = 10
Max Mana = 10
```

---

# Hand Tests

### TC-020

Starting hand:

```text
4 Cards
```

### TC-021

Hand has 7 Cards.

Draw one.

Expected:

```text
Hand remains 7.
Drawn Card is discarded.
```

---

# Unit Placement

### TC-030

Empty lane.

Play Goblin.

Expected:

```text
Goblin appears.
Mana -1.
Card leaves Hand.
```

### TC-031

Occupied lane.

Play Goblin.

Expected:

```text
Action rejected.
Mana unchanged.
Card remains in Hand.
```

---

# Summoning Sickness

### TC-040

Summon Archer during Round 2.

During Round 2 Combat:

```text
Archer cannot attack.
```

During Round 3 Combat:

```text
Archer can attack.
```

---

# Combat

### TC-050

Knight:

```text
4 ATK / 5 HP
```

Goblin:

```text
2 ATK / 2 HP
```

Expected:

```text
Knight = 3 HP
Goblin = Dead
```

---

# Direct Damage

### TC-051

Knight:

```text
ATK = 4
```

Enemy lane empty.

Expected:

```text
Enemy Core -4
```

---

# Poison

### TC-060

Poison target:

```text
HP = 5
```

Combat 1:

```text
HP = 3
```

Combat 2:

```text
HP = 1
```

Poison expires.

---

# Poison Lethal

### TC-061

Target:

```text
HP = 2
```

Poison:

```text
2 damage
```

At Combat Start:

```text
Target dies
```

The target must NOT attack during that Combat Phase.

---

# Freeze

### TC-070

Frozen Unit exists.

Combat:

```text
Frozen Unit cannot initiate attack.
```

It may still:

```text
Receive damage
```

---

# Heal

### TC-080

Unit:

```text
Max HP = 8
Current HP = 5
```

Heal:

```text
+4
```

Expected:

```text
HP = 8
```

---

# Lightning

### TC-090

Enemy Board:

```text
Lane 1 = 3 HP
Lane 2 = 5 HP
Lane 3 = 2 HP
```

Lightning:

```text
3 damage to all
```

Expected:

```text
Lane 1 = Dead
Lane 2 = 2 HP
Lane 3 = Dead
```

All damage must resolve before removing the dead Units.

---

# Mage

### TC-100

Mage enters lane with enemy Goblin.

Expected:

```text
Mage Battlecry
→ Goblin -2 HP
```

Mage cannot attack this Combat Phase.

---

# Core

### TC-110

Core:

```text
30 HP
```

Unit deals:

```text
4 damage
```

Expected:

```text
26 HP
```

---

# Core Visual State

### TC-111

HP:

```text
20
```

Expected:

```text
core_damaged.png
```

### TC-112

HP:

```text
6
```

Expected:

```text
core_low_hp.png
```

### TC-113

HP:

```text
0
```

Expected:

```text
core_destroyed.png
```

---

# Simultaneous Combat

### TC-120

Unit A:

```text
5 ATK / 5 HP
```

Unit B:

```text
5 ATK / 5 HP
```

Expected:

```text
Both die.
```

---

# Round Flow

### TC-130

Round 1:

```text
Player A Action
→ Player B Action
→ Combat
→ Round 2
```

Expected order must be deterministic.

---

# Turn Restriction

### TC-140

During:

```text
Player A Action Phase
```

Player B sends:

```text
PLAY_UNIT
```

Expected:

```text
Rejected
```

---

# Finished Game

### TC-150

Core reaches:

```text
0 HP
```

Expected:

```text
Game Status = FINISHED
```

Any later Action:

```text
Rejected
```

---

# Sudden Death

### TC-160

Round:

```text
20
```

No winner.

Expected:

```text
Sudden Death begins.
```

At next Combat:

```text
Both Cores take +2 unavoidable damage.
```

---

# Multiplayer

### TC-170

Create Room.

Expected:

```text
Room created.
Status = WAITING
```

---

### TC-171

Second Player joins.

Expected:

```text
Status = PLAYING
```

---

### TC-172

Third Player joins.

Expected:

```text
Rejected.
```

---

### TC-173

Player A plays a Unit.

Expected:

```text
Server validates action.
Both players receive
updated visible state.
```

---

# Multiplayer Security

### TC-180

Client attempts:

```text
Damage = 999
```

Expected:

```text
Server ignores client damage.
```

---

### TC-181

Client attempts:

```text
Mana = 999
```

Expected:

```text
Server ignores client Mana.
```

---

### TC-182

Client attempts to play a Card not in Hand.

Expected:

```text
Action rejected.
```

---

### TC-183

Client requests opponent's Hand.

Expected:

```text
Only opponent hand size is returned.
```

---

# Bot Tests

### TC-190

Bot starts with valid GameState.

Expected:

```text
Bot chooses only legal actions.
```

---

### TC-191

Bot has insufficient Mana.

Expected:

```text
Bot cannot play expensive Card.
```

---

### TC-192

Bot has lethal attack.

Expected:

```text
Bot chooses winning action.
```

---

# 45. Development Roadmap

## Phase 1 — Project Setup

```text
[ ] Initialize Git repository
[ ] Setup Monorepo
[ ] Setup React + Vite
[ ] Setup TypeScript strict mode
[ ] Setup Tailwind CSS
[ ] Setup Express
[ ] Setup Socket.IO
[ ] Setup Shared Package
[ ] Setup ESLint
[ ] Setup Prettier
[ ] Setup Vitest
```

---

# Phase 2 — Pure Game Engine

Implement:

```text
[ ] GameState
[ ] PlayerState
[ ] Card definitions
[ ] Deck
[ ] Shuffle
[ ] Draw
[ ] Round system
[ ] Action phases
[ ] Mana
[ ] Unit placement
[ ] Summoning sickness
[ ] Spell system
[ ] Status effects
[ ] Combat
[ ] Core damage
[ ] Win condition
[ ] Sudden death
```

No React yet.

No Socket.IO dependency.

Every feature must have unit tests.

---

# Phase 3 — Prototype UI

Implement:

```text
[ ] Game board
[ ] 3 lanes
[ ] Core
[ ] Hand
[ ] Deck
[ ] Mana
[ ] Card UI
[ ] Turn/Round indicator
[ ] End Phase button
[ ] Combat log
```

Use temporary CSS placeholders first.

---

# Phase 4 — Assets

Integrate:

```text
Knight
Guardian
Archer
Goblin
Mage
Assassin
```

and:

```text
Fireball
Freeze
Lightning
Heal
Poison
```

and:

```text
core_idle.png
core_damaged.png
core_low_hp.png
core_destroyed.png
```

---

# Phase 5 — Bot

Implement:

```text
[ ] Easy Bot
[ ] Normal Bot
[ ] Target Selection
[ ] Lane Evaluation
[ ] Lethal Detection
```

Bot must call the same:

```text
GameEngine.applyAction()
```

as human players.

---

# Phase 6 — Multiplayer

Implement:

```text
[ ] Create Room
[ ] Join Room
[ ] Room Code
[ ] Socket Connection
[ ] Server State
[ ] Action Validation
[ ] State Broadcast
[ ] Hidden Information
[ ] Disconnect
[ ] Reconnect
[ ] Forfeit
```

---

# Phase 7 — Animation

Recommended:

```text
Framer Motion
```

Animations:

```text
[ ] Draw Card
[ ] Card Hover
[ ] Card Play
[ ] Unit Summon
[ ] Attack
[ ] Damage Number
[ ] Hit
[ ] Unit Death
[ ] Spell Cast
[ ] Core Damage
[ ] Core Destroy
```

Animation must never change GameState.

Animations only visualize already-resolved GameEvents.

---

# Phase 8 — Sound

Add:

```text
[ ] Card Draw
[ ] Card Play
[ ] Attack
[ ] Hit
[ ] Spell
[ ] Status
[ ] Unit Death
[ ] Core Damage
[ ] Victory
[ ] Defeat
```

---

# Phase 9 — Deployment

Recommended initial setup:

```text
Frontend → Vercel
Backend → Railway
```

Production:

```text
Browser
   ↓
Vercel
   ↓
Socket.IO
   ↓
Backend
```

---

# 46. Deployment Environment

Frontend:

```text
VITE_SERVER_URL=
```

Backend:

```text
PORT=
CLIENT_URL=
NODE_ENV=production
```

The backend must allow WebSocket connections from the deployed frontend origin.

---

# 47. Future Expansion

These are NOT part of MVP.

Potential future systems:

```text
[ ] Multiple Decks
[ ] Deck Builder
[ ] Multiple Core Types
[ ] Card Collection
[ ] Card Rarity
[ ] Card Upgrade
[ ] Ranked Mode
[ ] Matchmaking
[ ] Leaderboard
[ ] Spectator Mode
[ ] Replay
[ ] Daily Missions
[ ] Cosmetics
```

---

# 48. Future Core Types

Potential future examples:

```text
Fire Core
Ice Core
Nature Core
Shadow Core
```

Each Core may have:

```text
Passive
+
Active Ability
```

Do not implement this system until the base 3-lane game is balanced.

---

# 49. Critical Implementation Rules

Codex MUST follow these principles:

## Rule 1

Game logic belongs in:

```text
packages/shared/engine
```

not React components.

---

## Rule 2

Server is authoritative in PvP.

---

## Rule 3

Client cannot determine:

```text
Damage
Mana
HP
Card ownership
Win/Loss
```

---

## Rule 4

Bot uses the same Engine.

---

## Rule 5

Combat must be deterministic.

---

## Rule 6

Simultaneous combat damage must be calculated before removing dead Units.

---

## Rule 7

Status effect timing must follow the documented Combat Phase order exactly.

---

## Rule 8

New Units cannot attack during the Combat Phase in which they were summoned.

---

## Rule 9

Opponent hidden information must never be sent to the client.

---

## Rule 10

UI animation must never modify authoritative GameState.

---

# 50. MVP Completion Criteria

The MVP is considered complete when all of the following work:

```text
✓ 15-card predefined deck
✓ 3-lane battlefield
✓ 30 HP Core
✓ Round-based turns
✓ Action phases
✓ Mana progression
✓ Unit summoning
✓ Summoning sickness
✓ Unit combat
✓ Direct Core damage
✓ Fireball
✓ Freeze
✓ Lightning
✓ Heal
✓ Poison
✓ Mage Battlecry
✓ Core visual states
✓ Victory
✓ Defeat
✓ Draw
✓ Sudden Death
✓ Easy Bot
✓ Normal Bot
✓ Create Room
✓ Join Room
✓ Room Code
✓ WebSocket synchronization
✓ Server authority
✓ Hidden opponent hand
✓ Disconnect handling
✓ Automated Game Engine tests
✓ Production Web deployment
```

---

# 🎯 Recommended Implementation Order

The actual coding order should be:

```text
1. Types
        ↓
2. Card Definitions
        ↓
3. GameState
        ↓
4. Round System
        ↓
5. Mana
        ↓
6. Card Draw
        ↓
7. Unit Placement
        ↓
8. Summoning Sickness
        ↓
9. Status Effects
        ↓
10. Combat Resolver
        ↓
11. Core Resolver
        ↓
12. Win Condition
        ↓
13. Unit Tests
        ↓
14. React Board
        ↓
15. Card UI
        ↓
16. Bot
        ↓
17. Socket.IO
        ↓
18. Multiplayer
        ↓
19. Animation
        ↓
20. Sound
        ↓
21. Deployment
```

---

# 🚀 Codex Starting Instruction

When starting implementation:

> Build the project incrementally.
>
> Start with the Shared Game Engine and its tests.
>
> Do not implement the full UI first.
>
> Do not introduce multiplayer before the local Game Engine can execute an entire match deterministically.
>
> Do not duplicate game rules between Bot, Client, and Server.
>
> The Game Engine must be the single source of truth.

The first milestone should be:

```text
A complete local match
from Round 1
to Victory / Defeat / Draw
using automated tests,
without React or Socket.IO dependencies.
```

Once this milestone passes, build the Web UI around the engine.

# END OF README

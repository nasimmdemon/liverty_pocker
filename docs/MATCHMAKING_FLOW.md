# Liberty Poker — Matchmaking Flow

A single reference for product, engineering, and QA. This document merges the **Matchmaking Flow**, **One-Pager**, **Protections**, **Liquidity rationale**, and **testing / monitoring** notes.

---

## 1. Objective

- **Fair, instant matchmaking** with no collusion.
- **No indefinite waiting** — bot fallback after a bounded wait.
- **Controlled bot liquidity** funded from tier reserves (not “infinite” bots).

---

## 2. End-to-End Flow (Player Journey)

### 2.1 Join Request

The player selects:

- **Tier** (skill / bracket band).
- **Stake** (**sub-tier** within that tier).

The system validates:

1. **Eligibility** — player is allowed to play at that tier (self-tier rules).
2. **Balance** — sufficient funds for the selected stake.

### 2.2 Instant Match (Attempt First)

The system **always tries real humans first**.

The player is seated **immediately** when:

- A **seat is available** on a valid table for that tier + sub-tier.
- **No restriction applies** (cooldown, abuse flags, mutual blocks — see §5).

### 2.3 Queue (Up to ~30 Seconds)

If no instant seat:

- Player enters the **sub-tier queue**.
- The system **continuously retries** for a valid **human** match (same tier + sub-tier rules).

### 2.4 Bot Fallback (~30 Seconds, No Waiting Guarantee)

If **still no human** after ~30 seconds:

1. **Reserve + eligibility** are checked (see §7).
2. If allowed: **allocate from tier reserve** → **spawn system bot(s)**.
3. **Create table**: at least **one human + bot(s)** — never bot-only.
4. Mark table **Open for Joining** so other humans can join anytime.
5. **Bots are replaced** as real players join (liquidity transitions to human-heavy).

If reserve / rules **forbid** bot fill:

- Player **remains queued** (or receives a clear product message — product decision).

### 2.5 Guarantees (Product Level)

| Guarantee | Meaning |
|-----------|---------|
| **Zero indefinite waiting** | Bot fallback when rules allow (~30s). |
| **Fair matchmaking** | Cooldown / no-repeat rules enforced **mutually**. |
| **Adaptive scaling** | Sub-tiers open/close from **measured flow** per tier. |
| **Controlled liquidity** | Bots are **reserve-backed** with burn limits / windows / tier caps. |

---

## 3. Dynamic Tables & Sub-Tier Scaling (Per Tier)

Scaling is **independent per tier** (no single global dial for all tiers).

### 3.1 Flow Signals

- Each tier tracks **request rate** (join attempts / minute or equivalent).
- **Stability baseline**: treat **~6 requests/min** as “stable” for that tier’s sub-tier set.
- **High flow**: **≥ 12 requests/min** → **open a new sub-tier** (additional stake band / queue lane).
- **Higher sustained flow** → **more sub-tiers** over time.
- **Low activity** → **fewer active** tables / sub-tiers (consolidate for faster fills).

### 3.2 Outcomes

- Faster seating.
- More balanced tables when possible.
- Smooth experience at low and high volume.

### 3.3 Stress / Org Test Scenario (MoneyMakers Devs)

When **many developers join the same sub-tier simultaneously**:

- Measured flow should **exceed stability** and trigger **scaling**.
- **Second sub-tier** (or next lane) **opens** so additional players can join **there** instead of overloading one queue.

---

## 4. Bot Behavior (Hard Rules)

| Rule | Detail |
|------|--------|
| **When** | Only after **~30s** wait without a valid human match. |
| **Funding** | From **tier reserve** (not player pocket for “fake” liquidity). |
| **Composition** | **Always ≥1 human** at the table with bots. |
| **Replacement** | Bots **exit or are replaced** as humans join. |
| **Forbidden** | **No bot vs bot** tables. **No empty** tables as “active games.” **No external** bots. |

---

## 5. Cooldown & Abuse Rules

### 5.1 Same Opponent / No Repeat Targeting

- Players **cannot** be matched together **again** until **each** has completed **at least 3 games** against **other** opponents (humans or bots — product to confirm “others” definition).
- Rule is **mutual**: enforced for **both** sides.

### 5.2 Leave / Rejoin & Table Manipulation

- **Leave / rejoin spam** → **penalties** and **lower matchmaking priority**.
- Players **cannot** pick specific opponents.
- System **blocks** patterns that look like **table manipulation** or **collusion**.

### 5.3 QA Questions to Validate in Specs

- **Two players** same tier land on **same table** once — **next** match: they should **not** sit together until the **3-game / other opponents** rule is satisfied (both sides).
- **Collision**: two humans each in **bot-backfill** scenarios should still respect **cooldown** and **no repeat** when they would otherwise meet again.

---

## 6. Reserve Integration

- **Declare reserve** (per tier or global policy — **must be defined at system start** for transparency and audits).
- **Funds every bot session** from that reserve.
- **Enforced by**:
  - **Burn limits** (max bot cost per window).
  - **Time windows** (e.g. hourly/daily caps).
  - **Tier allocation** (slice of reserve per tier).
- If **insufficient reserve** → **no bot** → player **stays queued** (or explicit UX — align with §2.4).

---

## 7. Restrictions Summary

- No **repeat targeting** (cooldown).
- No **cooldown violations**.
- No **join/leave abuse**.
- No **bot-only** tables.

---

## 8. Why Bot Liquidity Exists (Bootstrap & Retention)

### Without bots (illustrated failure mode)

1. First player joins → **no one else** → **queue only**, no table.
2. **No feedback** feels like a **dead app**.
3. Player **leaves** in 10–30s.
4. Second player later → **same** → never **synchronized**.

**System problem:** players exist over time but **never meet** → **no games** → **no retention** → **no revenue**.

### With bot seeding (target experience)

1. First player → **seated quickly** (bot if needed).
2. **Game starts** immediately.
3. Table **Open for Joining** → next humans **drop into live play**.
4. Ecosystem becomes **self-sustaining**.

---

## 9. Testing, Monitoring & Debug Destinations

### 9.1 Required Monitoring Parameters

- **Queue depth** per tier + sub-tier.
- **Time-in-queue** (p50 / p95 / max).
- **Instant match rate** vs **queued** vs **bot fallback rate**.
- **Active tables** per tier / sub-tier.
- **Reserve balance** and **burn rate** (per tier, per window).
- **Cooldown / block** hits (why a match was rejected).
- **Flow rate** (requests/min) driving **sub-tier scaling** events.

### 9.2 Destination / Event Debugging

- Log or trace: `join_request` → `instant_match` | `enqueue` → `dequeue_attempt` → `bot_spawn` | `human_match`.
- Correlate with **table id**, **tier**, **sub-tier**, **reserve debit id**.

### 9.3 Concrete Test Cases (from requirements)

| Test | Expected behavior |
|------|-------------------|
| **Same sub-tier, many devs at once** | Flow **> stability** → **second sub-tier** opens; distribution across lanes. |
| **First tier / sub-tier concurrency** | **At least 3** tables can be **open simultaneously** when load demands (capacity / reserve allowing). |
| **Two players, same table** | Next pairing respects **3-game / other opponents** rule **for both**. |
| **Bot funding** | Bot spawns show **reserve allocation** and respect **burn / window / tier** caps. |
| **Reserve declared upfront** | Config / admin surface shows **starting reserve** and **remaining** over time. |

---

## 10. Implementation Checklist (Engineering)

- [ ] Tier + sub-tier model in data layer.
- [ ] Join API: validate eligibility + balance.
- [ ] Matchmaking service: seat finder + queue + ~30s timer.
- [ ] Cooldown / “3 games vs others” store (per player pair or graph).
- [ ] Reserve ledger + bot spawn only on successful debit.
- [ ] Table state: `open_for_joining`, bot slots, replace-on-human-join.
- [ ] Per-tier flow meter → sub-tier lifecycle (open/close).
- [ ] Metrics + dashboards (see §9).
- [ ] Abuse signals: leave/rejoin frequency → priority penalty.

---

## Client implementation (app)

- **Entry:** Public table → choose tier + stake (same as solo) → **Quick match (players)**.
- **Pool id:** `{tierKey}_{gameMode}_sb{small}_bb{big}` — same **tier**, **mode** (Sit & Go vs Tournament), **small blind**, and **big blind**. Entrance/buy-in may differ per player; each player’s starting stack is their own amount.
- **Code:** `src/lib/matchmaking.ts`, `src/lib/multiplayer.ts` (matchmaking fields + bots), `SitAndGoScreen`, `MultiplayerLobby`, `PokerTable` (host-driven bot turns).
- **Not yet in client:** reserve ledger, 3-game cooldown graph, sub-tier auto-scaling from measured RPM (doc only).

## Document History

- Consolidated from matchmaking spec, one-pager, protections, liquidity narrative, and testing notes.

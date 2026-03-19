# Commission and Rake Logic

## Rake Formula

- **House rake**: 5% of pot each round
- **Min pot for rake**: 60 (no rake if pot < 60)
- **Cap**: 50 chips max per pot
- **Formula**: `rake = min(floor(pot * 0.05), cap)`

## Per-Player Distribution Model

Rake is distributed based on **each player's contribution** to the pot. For each player's proportional share of the rake:

| Step | Check | Action |
|------|-------|--------|
| 1 | `player.referredBy` exists AND affiliate NOT at table | 30% → Affiliate |
| 2 | Table is private AND `inviterId` exists | 10% → Inviter |
| 3 | Host at table AND player has NO affiliate | 10% → Host |
| 4 | Remainder | → House |

## Conflict Resolution Rules

### Rule A — Affiliate overrides Host
If a player has an affiliate, their rake share goes to the **Affiliate**, NOT the Host.
This prevents double counting. The Host gets 0% for that player.

### Rule B — Inviter is table-specific
Only applies if:
- Table is **private**
- `inviterId` is set (creator's referrer)

Otherwise: Inviter = 0

### Rule C — Sit & Go / Tournament
Inviter = **0 ALWAYS** (not private tables)

### Rule D — Host definition
Host earns 10% if:
- Host (game creator) is playing at the table
- Player does NOT have an affiliate

If player has affiliate → Host gets nothing for that player.

### Rule E — Creator can be both Inviter + Host
If creator is both the inviter recipient and host:
- Gets 10% inviter + 10% host = **20%** (when applicable per-player)

### Rule F — Missing roles
If no affiliate exists → that 30% goes to House.
If no host at table → that 10% goes to House.
If not private table → inviter 10% goes to House.

## Distribution Algorithm

```
for each player in hand:
    playerRakeShare = totalRake * (playerContribution / totalContributions)

    if player.hasAffiliate AND affiliateNotAtTable:
        affiliateTotal += playerRakeShare * 30%
    
    if table.isPrivate AND inviterId:
        inviterTotal += playerRakeShare * 10%
    
    if host.atTable AND NOT player.hasAffiliate:
        hostTotal += playerRakeShare * 10%

    remaining → house
```

## Example Breakdown

### Pot: $60, All roles present

| | Amount |
|---|---|
| **Pot** | $60 |
| **Rake (5%)** | $3 |
| **Winner gets** | $57 |

Assuming 3 players contribute equally ($20 each), Player A has affiliate, Player B invited, Player C no roles:

| Category | Amount | Source |
|----------|--------|--------|
| Affiliate | $0.30 | 30% of Player A's $1 rake share |
| Inviter | $0.30 | 10% of all players (private) |
| Host | $0.20 | 10% of Players B+C (no affiliate) |
| House | $2.20 | Remainder |

### Edge Case: Affiliate + Host conflict

- Player has affiliate → Affiliate gets 30%, Host gets **0** for this player
- Other players without affiliate → Host gets 10%

### Edge Case: No affiliate exists

- That 30% goes entirely to House

### Edge Case: Sit & Go table

- Inviter = 0 always (not private)
- Only Affiliate + Host + House split

## UI Display

### 🏆 Winner Pot
- Total: $60
- Rake: -$3
- Final: $57

### 💰 Rake Breakdown ($3)
- Affiliate Earnings: $X
- Host Earnings: $X
- Inviter Earnings: $X
- House Earnings: $X

## Test Setup

| Player | Affiliate | Inviter | Host | Expected |
|--------|-----------|---------|------|----------|
| Player 0 | ✅ (referredBy set) | ❌ | ❌ | Affiliate gets 30% of P0's share, Host gets 0 for P0 |
| Player 1 | ❌ | ✅ (table creator) | ✅ (host) | Host gets 10% of P1's share |
| Others | ❌ | ❌ | ❌ | All shares → House |

# Commission and Rake Logic

## Rake Formula

- **House rake**: 5% of pot each round
- **Min pot for rake**: 60 (no rake if pot < 60)
- **Cap**: 50 chips max per pot
- **Formula**: `rake = min(floor(pot * 0.05), cap)`

## Distribution Rules

| Recipient | Share | Condition |
|-----------|-------|-----------|
| **Affiliation** | 30% | Referred player in hand; affiliate NOT at table |
| **Host** | 10% | Host (game creator) is a player at the table |
| **Inviter** | 10% | Private table only; inviter invited table creator |
| **House** | Remainder | Leftovers + affiliate share when affiliate is at table |

## Special Cases

- **Affiliate on table**: Their 30% goes to House (not to them)
- **Host not on table**: Host share (10%) goes to House
- **Sit & Go / Tournament**: Inviter = 0
- **Winner**: Gets `pot - totalRake` (net pot)

## Definitions

### Affiliation
User clicked affiliate link and signed up. Not necessarily on same table. The affiliate is the user whose referral code was used when the referred player signed up.

### Host
The person who created the game (hostId). When they play at the table, they receive 10% of the rake.

### Inviter
The person who invited the table creator to the app (via referral link). Only applies to private tables. The inviter is the creator's `referredBy` from their user profile.

### House
Receives the remainder of the rake after all other shares are distributed.

## Example 1: Pot 60, Affiliate + Host + Inviter

- **Pot**: 60
- **Rake**: 5% = 3
- **Winner pot**: 60 - 3 = 57
- **Breakdown**:
  - Affiliation: 30% of 3 = 1$
  - Host: 10% of 3 = 0.3$
  - Inviter: 10% of 3 = 0.3$
  - House: 3 - 1 - 0.3 - 0.3 = 1.4$

## Example 2: Affiliate at Table

- **Pot**: 60
- **Rake**: 3
- **Affiliate is playing**: Affiliate share = 0 (goes to House)
- **Breakdown**:
  - Affiliation: 0
  - Host: 0.3$
  - Inviter: 0.3$ (if private)
  - House: 3 - 0.3 - 0.3 = 2.4$

## Test Scenarios

### Case 1: Affiliation + Host
- Player 0 (you) invited Player 1 (you2) → affiliation
- Player 1 is host (created table) → host
- When hand ends with pot >= 60: verify both affiliation and host shares appear in breakdown

### Case 2: Private Table with Inviter
- Player 0 invited host → inviter
- Host created private table → invite share applies
- Verify inviter share appears when pot >= 60

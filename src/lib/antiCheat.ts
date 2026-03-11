import { GameState } from './gameTypes';

export interface AntiCheatResult {
  triggered: boolean;
  penaltyAmount: number;
  recipientCount: number;
  recipientNames: string[];
}

/**
 * Anti-cheat: when a player leaves during an active hand, return money to players they played against.
 * The leaving player is penalized; affected players are credited.
 */
export function runAntiCheatOnExit(gameState: GameState | null): AntiCheatResult {
  if (!gameState || gameState.showdown) {
    return { triggered: false, penaltyAmount: 0, recipientCount: 0, recipientNames: [] };
  }

  const userPlayer = gameState.players.find(p => p.isUser);
  if (!userPlayer || userPlayer.hasFolded || !userPlayer.cards.length) {
    return { triggered: false, penaltyAmount: 0, recipientCount: 0, recipientNames: [] };
  }

  // User left during active hand with cards — anti-cheat triggers
  const penaltyAmount = userPlayer.currentBet + userPlayer.totalRoundBet + Math.min(gameState.bigBlind * 2, userPlayer.chips);
  const recipients = gameState.players.filter(p => p.isActive && !p.hasFolded && !p.isUser);
  const recipientNames = recipients.map(p => p.name);

  return {
    triggered: true,
    penaltyAmount: Math.min(penaltyAmount, userPlayer.chips + userPlayer.currentBet + userPlayer.totalRoundBet),
    recipientCount: recipients.length,
    recipientNames,
  };
}

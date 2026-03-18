import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Percent } from 'lucide-react';
import pokerTableBg from '@/assets/poker-table-bg.png';
import type { TestCommissionConfig } from '@/lib/gameLogic';

interface TestingScreenProps {
  onStartGame: (config: TestingConfig) => void;
  onBack: () => void;
}

export type { TestCommissionConfig };

export interface TestingConfig {
  botCount: number;
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  turnTimer: number;
  testCommission?: TestCommissionConfig;
  cardBack?: string;
}

const TestingScreen = ({ onStartGame, onBack }: TestingScreenProps) => {
  const [botCount, setBotCount] = useState(5);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [startingChips, setStartingChips] = useState(1500);
  const [turnTimer, setTurnTimer] = useState(30);
  const [copied, setCopied] = useState(false);
  const [commissionTest, setCommissionTest] = useState(false);
  const [affiliatePlayerIndex, setAffiliatePlayerIndex] = useState(0);
  const [hostPlayerIndex, setHostPlayerIndex] = useState(1);
  const [inviterPlayerIndex, setInviterPlayerIndex] = useState(0);
  const [isPrivateTable, setIsPrivateTable] = useState(true);

  const shareLink = `${window.location.origin}?table=test-${Date.now()}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStart = () => {
    const cardBack = Math.random() < 0.5 ? '/card_bg_1.png' : '/card_bg_2.png';
    onStartGame({
      botCount,
      smallBlind,
      bigBlind,
      startingChips,
      turnTimer,
      testCommission: commissionTest
        ? { affiliatePlayerIndex, hostPlayerIndex, inviterPlayerIndex, isPrivateTable }
        : undefined,
      cardBack,
    });
  };

  const inputClass = 'w-full bg-background/80 border-2 border-primary/40 rounded-lg px-3 py-2 text-foreground text-sm font-bold text-center focus:outline-none focus:border-primary';
  const labelClass = "text-sm tracking-wider text-muted-foreground";

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pokerTableBg})` }} />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 w-full flex items-center px-3 sm:px-6 py-3 sm:py-4">
        <motion.button
          className="casino-btn text-[10px] sm:text-xs px-3 py-1.5"
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← BACK
        </motion.button>
      </div>

      <motion.h1
        className="relative z-10 text-2xl sm:text-4xl tracking-[0.15em] text-center"
        style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        🧪 TESTING MODE
      </motion.h1>

      <p className="relative z-10 text-muted-foreground text-xs text-center mt-1 px-4 max-w-sm">
        Configure bots and table settings. Share the link so others can join.
      </p>

      <div className="relative z-10 w-[90%] max-w-sm mt-4 flex flex-col gap-4">
        {/* Bot count */}
        <div className="flex flex-col gap-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <label className={labelClass}>NUMBER OF BOTS (1-5)</label>
          <input
            type="number" min={1} max={5} value={botCount}
            onChange={e => setBotCount(Math.max(1, Math.min(5, Number(e.target.value))))}
            className={inputClass}
          />
        </div>

        {/* Blinds */}
        <div className="grid grid-cols-2 gap-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>SMALL BLIND</label>
            <input type="number" min={1} value={smallBlind} onChange={e => setSmallBlind(Number(e.target.value))} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>BIG BLIND</label>
            <input type="number" min={2} value={bigBlind} onChange={e => setBigBlind(Number(e.target.value))} className={inputClass} />
          </div>
        </div>

        {/* Starting chips */}
        <div className="flex flex-col gap-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <label className={labelClass}>STARTING CHIPS</label>
          <input type="number" min={100} step={100} value={startingChips} onChange={e => setStartingChips(Number(e.target.value))} className={inputClass} />
        </div>

        {/* Turn timer */}
        <div className="flex flex-col gap-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <label className={labelClass}>TURN TIMER (SECONDS)</label>
          <input type="number" min={5} max={60} value={turnTimer} onChange={e => setTurnTimer(Number(e.target.value))} className={inputClass} />
        </div>

        {/* Commission test — modern card style */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(30,28,24,0.9) 0%, rgba(18,16,14,0.95) 100%)',
            border: '1px solid rgba(242,210,122,0.25)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <button
            type="button"
            onClick={() => setCommissionTest(!commissionTest)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors"
          >
            <div
              className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 ${
                commissionTest ? 'bg-primary/90' : 'bg-muted/60'
              }`}
            >
              <motion.div
                className="absolute top-0.5 left-1 w-5 h-5 rounded-full bg-white shadow-md"
                animate={{ x: commissionTest ? 18 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Percent className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-medium text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
                Commission test
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
              affiliation · host · inviter
            </span>
          </button>
          <AnimatePresence>
            {commissionTest && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-3 border-t border-white/5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Affiliate</label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={affiliatePlayerIndex}
                      onChange={(e) => setAffiliatePlayerIndex(Math.max(0, Math.min(5, Number(e.target.value))))}
                      className={`${inputClass} text-xs`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Host</label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={hostPlayerIndex}
                      onChange={(e) => setHostPlayerIndex(Math.max(0, Math.min(5, Number(e.target.value))))}
                      className={`${inputClass} text-xs`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Inviter</label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={inviterPlayerIndex}
                      onChange={(e) => setInviterPlayerIndex(Math.max(0, Math.min(5, Number(e.target.value))))}
                      className={`${inputClass} text-xs`}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrivateTable}
                        onChange={(e) => setIsPrivateTable(e.target.checked)}
                        className="rounded border-primary/50 bg-background/80 w-4 h-4"
                      />
                      <span className="text-xs text-muted-foreground">Private table</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-primary/30 my-1" />

        {/* Share link */}
        <div className="flex flex-col gap-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <label className={labelClass}>INVITE LINK</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareLink}
              className={`${inputClass} text-xs text-left truncate`}
            />
            <button
              className="shrink-0 w-10 h-10 rounded-lg border-2 border-primary/40 flex items-center justify-center hover:bg-primary/20 transition-colors"
              onClick={handleCopyLink}
            >
              {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} className="text-primary" />}
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5">Share this link with others to join your test table</span>
        </div>
      </div>

      {/* Start */}
      <motion.button
        className="relative z-10 mt-6 mb-8 casino-btn text-sm sm:text-base px-8 py-3 rounded-xl font-bold tracking-wider"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--casino-red)) 0%, hsl(0 50% 25%) 100%)',
          color: 'hsl(var(--casino-gold))',
          fontFamily: "'Bebas Neue', sans-serif",
        }}
        onClick={handleStart}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        🚀 START TEST GAME
      </motion.button>
    </motion.div>
  );
};

export default TestingScreen;

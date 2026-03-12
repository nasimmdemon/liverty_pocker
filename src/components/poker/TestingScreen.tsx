import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import pokerTableBg from '@/assets/poker-table-bg.png';

interface TestingScreenProps {
  onStartGame: (config: TestingConfig) => void;
  onBack: () => void;
}

export interface TestingConfig {
  botCount: number;
  smallBlind: number;
  bigBlind: number;
  startingChips: number;
  turnTimer: number;
}

const TestingScreen = ({ onStartGame, onBack }: TestingScreenProps) => {
  const [botCount, setBotCount] = useState(5);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [startingChips, setStartingChips] = useState(1500);
  const [turnTimer, setTurnTimer] = useState(30);
  const [copied, setCopied] = useState(false);

  const shareLink = `${window.location.origin}?table=test-${Date.now()}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleStart = () => {
    onStartGame({ botCount, smallBlind, bigBlind, startingChips, turnTimer });
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

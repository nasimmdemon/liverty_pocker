import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Percent, Play, RotateCcw } from 'lucide-react';
import pokerTableBg from '@/assets/poker-table-bg.png';
import ChipIcon from './ChipIcon';
import type { TestCommissionConfig } from '@/lib/gameLogic';
import type { PlayingCard as CardType } from '@/lib/gameTypes';

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

type Tab = 'config' | 'animations';

/* ── Mini Card Component ── */

const SUIT_SYMBOLS: Record<string, string> = { '♠': '♠', '♥': '♥', '♦': '♦', '♣': '♣' };

function MiniCard({ card, delay = 0 }: { card: CardType; delay?: number }) {
  if (!card.faceUp) {
    return (
      <motion.div
        initial={{ scale: 0, rotateY: 180, rotateZ: -180, opacity: 0 }}
        animate={{ scale: 1, rotateY: 0, rotateZ: 0, opacity: 1 }}
        transition={{ delay, duration: 0.7, type: 'spring', stiffness: 120, damping: 14 }}
        className="w-12 h-[68px] rounded-lg border border-border/60 overflow-hidden"
        style={{ backgroundImage: 'url(/card_bg_1.png)', backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', transformStyle: 'preserve-3d', perspective: '600px' }}
      />
    );
  }
  const isRed = card.suit === '♥' || card.suit === '♦';
  return (
    <motion.div
      initial={{ scale: 0, rotateY: 180, opacity: 0 }}
      animate={{ scale: 1, rotateY: 0, opacity: 1 }}
      transition={{ delay, duration: 0.6, type: 'spring', stiffness: 150, damping: 16 }}
      className="w-12 h-[68px] rounded-lg border border-border/40 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(145deg, #f8f8f8 0%, #e8e8e8 100%)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', color: isRed ? '#dc2626' : '#1a1a1a', fontFamily: "'Bebas Neue', sans-serif" }}
    >
      <span className="text-lg font-bold leading-none">{card.rank}</span>
      <span className="text-sm leading-none">{SUIT_SYMBOLS[card.suit]}</span>
    </motion.div>
  );
}

/* ── Animation Categories ── */

interface AnimItem { id: string; label: string; description: string; }
interface AnimCategory { title: string; emoji: string; items: AnimItem[]; }

const ANIM_CATEGORIES: AnimCategory[] = [
  {
    title: 'CARDS', emoji: '🃏',
    items: [
      { id: 'card-deal', label: 'Card Deal', description: 'Cards spinning in with 3D effect' },
      { id: 'card-flip', label: 'Card Reveal', description: 'Card flipping face-up' },
      { id: 'fold-fade', label: 'Fold Fade', description: 'Cards fading out on fold' },
    ],
  },
  {
    title: 'CHIPS & MONEY', emoji: '💰',
    items: [
      { id: 'chip-to-pot', label: 'Bet → Pot', description: 'Chips flying from player to pot' },
      { id: 'win-chips', label: 'Win Payout', description: 'Chips showering to winner' },
      { id: 'rake-split', label: 'Rake Split', description: 'Pot splits into rake, affiliate, host' },
      { id: 'receive-money', label: 'Receive Money', description: 'Coins flowing in with +amount' },
    ],
  },
  {
    title: 'GAMEPLAY UI', emoji: '🎮',
    items: [
      { id: 'timer-ring', label: 'Timer Ring', description: '10-second countdown ring' },
      { id: 'winner-banner', label: 'Winner Banner', description: 'Player wins the hand popup' },
    ],
  },
  {
    title: 'TRANSITIONS', emoji: '🔄',
    items: [
      { id: 'loading-to-game', label: 'Loading → Game', description: 'Full loading screen transition' },
      { id: 'screen-fade', label: 'Screen Fade', description: 'Crossfade between screens' },
    ],
  },
];

const ANIM_DURATIONS: Record<string, number> = {
  'chip-to-pot': 1200, 'win-chips': 2200, 'card-deal': 1500, 'card-flip': 1200,
  'timer-ring': 10500, 'fold-fade': 1800, 'rake-split': 3000, 'receive-money': 2500,
  'winner-banner': 3000, 'loading-to-game': 4000, 'screen-fade': 2500,
};

/* ── Animation Preview Container ── */

function AnimationPreview({ id, looping }: { id: string; looping: boolean }) {
  const [cycle, setCycle] = useState(0);
  const restart = useCallback(() => setCycle(c => c + 1), []);

  useEffect(() => {
    if (!looping) return;
    const dur = ANIM_DURATIONS[id] ?? 2000;
    const t = setTimeout(() => setCycle(c => c + 1), dur);
    return () => clearTimeout(t);
  }, [id, looping, cycle]);

  return (
    <div className="relative w-full h-40 rounded-xl overflow-hidden flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, rgba(30,60,30,0.9) 0%, rgba(10,20,10,0.95) 100%)' }}
    >
      <AnimatePresence mode="wait">
        <motion.div key={`${id}-${cycle}`} className="flex items-center justify-center gap-4 w-full h-full"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
        >
          {id === 'chip-to-pot' && <ChipToPotPreview />}
          {id === 'win-chips' && <WinChipsPreview />}
          {id === 'card-deal' && <CardDealPreview />}
          {id === 'card-flip' && <CardFlipPreview />}
          {id === 'timer-ring' && <TimerRingPreview />}
          {id === 'fold-fade' && <FoldFadePreview />}
          {id === 'rake-split' && <RakeSplitPreview />}
          {id === 'receive-money' && <ReceiveMoneyPreview />}
          {id === 'winner-banner' && <WinnerBannerPreview />}
          {id === 'loading-to-game' && <LoadingToGamePreview />}
          {id === 'screen-fade' && <ScreenFadePreview />}
        </motion.div>
      </AnimatePresence>
      <button onClick={restart} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors" title="Replay">
        <RotateCcw size={14} className="text-primary" />
      </button>
    </div>
  );
}

/* ── Individual Animation Previews ── */

function ChipToPotPreview() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="absolute"
          initial={{ x: -80 + i * 80, y: 60, opacity: 1, scale: 1 }}
          animate={{ x: 0, y: -10, opacity: [1, 1, 0.7], scale: [1, 1.3, 0.8] }}
          transition={{ duration: 0.7, delay: i * 0.15, ease: 'easeInOut' }}
        ><ChipIcon size={36} variant="red" /></motion.div>
      ))}
      <motion.span className="text-primary font-bold text-sm absolute -top-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, duration: 0.3 }}
      >POT: $150</motion.span>
    </div>
  );
}

function WinChipsPreview() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div key={i} className="absolute"
          initial={{ x: 0, y: -20, opacity: 1, scale: 1 }}
          animate={{ x: ((i % 5) - 2) * 30, y: 40 + ((i % 3) - 1) * 15, opacity: [1, 1, 0.8, 0], scale: [1, 1.2, 1, 0.7] }}
          transition={{ duration: 1.5, delay: i * 0.06, ease: [0.25, 0.46, 0.45, 0.94], times: [0, 0.5, 0.7, 1] }}
        ><ChipIcon size={24} variant="red" /></motion.div>
      ))}
      <motion.span className="absolute text-primary font-bold text-base drop-shadow-lg" style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        initial={{ opacity: 0, y: 0, scale: 1 }}
        animate={{ opacity: [0, 1, 1, 0], y: [0, -30, -40, -50], scale: [1, 1.3, 1.6, 2] }}
        transition={{ duration: 1.8, times: [0, 0.3, 0.6, 1] }}
      >+$500</motion.span>
    </div>
  );
}

function CardDealPreview() {
  const cards: CardType[] = [
    { suit: '♠', rank: 'A', faceUp: false }, { suit: '♥', rank: 'K', faceUp: false },
    { suit: '♦', rank: 'Q', faceUp: false }, { suit: '♣', rank: 'J', faceUp: false },
  ];
  return <div className="flex gap-2">{cards.map((c, i) => <MiniCard key={i} card={c} delay={i * 0.2} />)}</div>;
}

function CardFlipPreview() {
  return <div className="flex gap-3">{[
    { suit: '♠' as const, rank: 'A', faceUp: true }, { suit: '♥' as const, rank: 'K', faceUp: true },
  ].map((c, i) => <MiniCard key={i} card={c} delay={i * 0.3} />)}</div>;
}

function TimerRingPreview() {
  return (
    <div className="relative w-24 h-24">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(242,210,122,0.15)" strokeWidth="4" />
        <motion.circle cx="50" cy="50" r="46" fill="none" stroke="#F2D27A" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 46}`}
          initial={{ strokeDashoffset: 0 }} animate={{ strokeDashoffset: 2 * Math.PI * 46 }}
          transition={{ duration: 10, ease: 'linear' }} transform="rotate(-90 50 50)"
        />
      </svg>
      <motion.span className="absolute inset-0 flex items-center justify-center text-primary font-bold text-lg" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        <motion.span initial={{ scale: 1 }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: 9 }}>10</motion.span>
      </motion.span>
    </div>
  );
}

function FoldFadePreview() {
  return (
    <div className="flex gap-3">
      {[{ suit: '♠' as const, rank: '7', faceUp: true }, { suit: '♦' as const, rank: '2', faceUp: true }].map((c, i) => (
        <motion.div key={i} initial={{ opacity: 1, y: 0, rotateZ: 0 }}
          animate={{ opacity: 0, y: 30, rotateZ: i === 0 ? -15 : 15 }}
          transition={{ delay: 0.5 + i * 0.1, duration: 0.6, ease: 'easeIn' }}
        ><MiniCard card={c} delay={0} /></motion.div>
      ))}
    </div>
  );
}

function RakeSplitPreview() {
  const items = [
    { label: 'RAKE 5%', value: '$25', color: '#ef4444', delay: 0 },
    { label: 'AFFILIATE 30%', value: '$7.50', color: '#F2D27A', delay: 0.6 },
    { label: 'HOST 10%', value: '$2.50', color: '#22c55e', delay: 1.2 },
    { label: 'PLATFORM', value: '$15', color: '#8b8b8b', delay: 1.8 },
  ];
  return (
    <div className="flex flex-col items-center gap-1.5 w-full px-4">
      <motion.div className="text-xs text-muted-foreground mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      >POT: $500 → RAKE: $25</motion.div>
      {items.map((item) => (
        <motion.div key={item.label} className="flex items-center justify-between w-full max-w-[200px] px-3 py-1 rounded-md"
          style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${item.color}40` }}
          initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: item.delay, duration: 0.4, type: 'spring', stiffness: 200 }}
        >
          <span className="text-[10px] tracking-wider" style={{ color: item.color, fontFamily: "'Bebas Neue', sans-serif" }}>{item.label}</span>
          <span className="text-xs font-bold" style={{ color: item.color }}>{item.value}</span>
        </motion.div>
      ))}
    </div>
  );
}

function ReceiveMoneyPreview() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div key={i} className="absolute text-xl"
          initial={{ y: -60, x: ((i % 3) - 1) * 40, opacity: 0, scale: 0.3 }}
          animate={{ y: 20 + (i % 2) * 15, opacity: [0, 1, 1, 0.6], scale: [0.3, 1.2, 1, 0.8] }}
          transition={{ delay: i * 0.12, duration: 1.2, ease: [0.22, 1, 0.36, 1], times: [0, 0.3, 0.7, 1] }}
        >🪙</motion.div>
      ))}
      <motion.div className="absolute flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: [0.5, 1.3, 1] }}
        transition={{ delay: 0.8, duration: 0.6, type: 'spring' }}
      >
        <span className="text-2xl font-bold text-primary drop-shadow-lg" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>+$1,250</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">RECEIVED</span>
      </motion.div>
    </div>
  );
}

function WinnerBannerPreview() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div className="flex flex-col items-center gap-2 px-6 py-3 rounded-xl"
        style={{ background: 'linear-gradient(145deg, rgba(242,210,122,0.15) 0%, rgba(30,28,24,0.9) 100%)', border: '2px solid rgba(242,210,122,0.5)', boxShadow: '0 0 30px rgba(242,210,122,0.2)' }}
        initial={{ opacity: 0, scale: 0.3, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.span className="text-lg" initial={{ scale: 0 }} animate={{ scale: [0, 1.5, 1] }} transition={{ delay: 0.3, duration: 0.4 }}>🏆</motion.span>
        <span className="text-sm font-bold text-primary tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>PLAYER WINS!</span>
        <span className="text-xs text-muted-foreground">Full House — Aces over Kings</span>
        <motion.span className="text-base font-bold text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        >+$2,450</motion.span>
      </motion.div>
    </div>
  );
}

function LoadingToGamePreview() {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <motion.div className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(180deg, rgba(15,15,15,1) 0%, rgba(5,20,5,0.9) 100%)' }}
        initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 3.5, times: [0, 0.7, 1] }}
      >
        <span className="text-xs tracking-[0.2em] mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#F2D27A' }}>FINDING TABLE FOR YOU</span>
        <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(242,210,122,0.3)' }}>
          <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #C9A227, #F2D27A)' }}
            initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 2.5, ease: 'linear' }}
          />
        </div>
        <motion.span className="text-[9px] text-muted-foreground mt-2 italic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          Earn 30% from invited players — for life.
        </motion.span>
      </motion.div>
      <motion.div className="absolute inset-0 flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, rgba(30,80,30,0.9) 0%, rgba(10,30,10,1) 100%)' }}
        initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1] }} transition={{ duration: 3.5, times: [0, 0.7, 1] }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-12 rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(30,100,30,0.8), rgba(20,60,20,0.6))', border: '2px solid rgba(242,210,122,0.4)' }} />
          <span className="text-[10px] text-primary tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>TABLE READY</span>
        </div>
      </motion.div>
    </div>
  );
}

function ScreenFadePreview() {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden">
      <motion.div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(20,15,10,0.95)' }}
        initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0, 0] }} transition={{ duration: 2, times: [0, 0.4, 0.5, 1] }}
      ><span className="text-sm text-primary tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>SCREEN A</span></motion.div>
      <motion.div className="absolute inset-0 flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse, rgba(30,60,30,0.95), rgba(10,20,10,1))' }}
        initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1, 1] }} transition={{ duration: 2, times: [0, 0.4, 0.5, 1] }}
      ><span className="text-sm text-primary tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>SCREEN B</span></motion.div>
    </div>
  );
}

/* ── Main Component ── */

const TestingScreen = ({ onStartGame, onBack }: TestingScreenProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('config');
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
  const [playingAnim, setPlayingAnim] = useState<string | null>(null);
  const [loopAnim, setLoopAnim] = useState(true);
  const [animCycle, setAnimCycle] = useState(0);

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
      botCount, smallBlind, bigBlind, startingChips, turnTimer,
      testCommission: commissionTest
        ? { affiliatePlayerIndex, hostPlayerIndex, inviterPlayerIndex, isPrivateTable }
        : undefined,
      cardBack,
    });
  };

  const inputClass = 'w-full bg-background/80 border-2 border-primary/40 rounded-lg px-3 py-2 text-foreground text-sm font-bold text-center focus:outline-none focus:border-primary';
  const labelClass = "text-sm tracking-wider text-muted-foreground";

  const tabClass = (t: Tab) =>
    `flex-1 py-2.5 text-sm tracking-[0.15em] rounded-lg transition-all ${
      activeTab === t
        ? 'bg-primary/20 text-primary border border-primary/50'
        : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
    }`;

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center overflow-y-auto"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${pokerTableBg})` }} />
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 w-full flex items-center px-3 sm:px-6 py-3 sm:py-4">
        <motion.button className="casino-btn text-[10px] sm:text-xs px-3 py-1.5" onClick={onBack} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          ← BACK
        </motion.button>
      </div>

      <motion.h1
        className="relative z-10 text-2xl sm:text-4xl tracking-[0.15em] text-center"
        style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      >
        🧪 TESTING MODE
      </motion.h1>

      <p className="relative z-10 text-muted-foreground text-xs text-center mt-1 px-4 max-w-sm">
        Configure bots and table settings, or preview animations.
      </p>

      {/* Tabs */}
      <div className="relative z-10 w-[90%] max-w-sm mt-4 flex gap-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        <button className={tabClass('config')} onClick={() => setActiveTab('config')}>⚙️ CONFIG</button>
        <button className={tabClass('animations')} onClick={() => setActiveTab('animations')}>🎬 ANIMATIONS</button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'config' ? (
          <motion.div key="config" className="relative z-10 w-[90%] max-w-sm mt-4 flex flex-col gap-4"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
          >
            {/* Bot count */}
            <div className="flex flex-col gap-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              <label className={labelClass}>NUMBER OF BOTS (1-5)</label>
              <input type="number" min={1} max={5} value={botCount} onChange={e => setBotCount(Math.max(1, Math.min(5, Number(e.target.value))))} className={inputClass} />
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

            {/* Commission test */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(30,28,24,0.9) 0%, rgba(18,16,14,0.95) 100%)', border: '1px solid rgba(242,210,122,0.25)', boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
              <button type="button" onClick={() => setCommissionTest(!commissionTest)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors">
                <div className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 ${commissionTest ? 'bg-primary/90' : 'bg-muted/60'}`}>
                  <motion.div className="absolute top-0.5 left-1 w-5 h-5 rounded-full bg-white shadow-md" animate={{ x: commissionTest ? 18 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Percent className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>Commission test</span>
                </div>
                <span className="text-[11px] text-muted-foreground ml-auto shrink-0">affiliation · host · inviter</span>
              </button>
              <AnimatePresence>
                {commissionTest && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-3 border-t border-white/5">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Affiliate</label>
                        <input type="number" min={0} max={5} value={affiliatePlayerIndex} onChange={e => setAffiliatePlayerIndex(Math.max(0, Math.min(5, Number(e.target.value))))} className={`${inputClass} text-xs`} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Host</label>
                        <input type="number" min={0} max={5} value={hostPlayerIndex} onChange={e => setHostPlayerIndex(Math.max(0, Math.min(5, Number(e.target.value))))} className={`${inputClass} text-xs`} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Inviter</label>
                        <input type="number" min={0} max={5} value={inviterPlayerIndex} onChange={e => setInviterPlayerIndex(Math.max(0, Math.min(5, Number(e.target.value))))} className={`${inputClass} text-xs`} />
                      </div>
                      <div className="flex flex-col justify-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={isPrivateTable} onChange={e => setIsPrivateTable(e.target.checked)} className="rounded border-primary/50 bg-background/80 w-4 h-4" />
                          <span className="text-xs text-muted-foreground">Private table</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Share link */}
            <div className="w-full h-px bg-primary/30 my-1" />
            <div className="flex flex-col gap-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              <label className={labelClass}>INVITE LINK</label>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={shareLink} className={`${inputClass} text-xs text-left truncate`} />
                <button className="shrink-0 w-10 h-10 rounded-lg border-2 border-primary/40 flex items-center justify-center hover:bg-primary/20 transition-colors" onClick={handleCopyLink}>
                  {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} className="text-primary" />}
                </button>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">Share this link with others to join your test table</span>
            </div>
          </motion.div>
        ) : (
          <motion.div key="animations" className="relative z-10 w-[90%] max-w-sm mt-4 flex flex-col gap-4 pb-24"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
          >
            {/* Loop toggle */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground tracking-wider" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>PREVIEW ANIMATIONS</span>
              <button onClick={() => setLoopAnim(!loopAnim)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors ${loopAnim ? 'border-primary/60 text-primary bg-primary/10' : 'border-muted/40 text-muted-foreground'}`}
              ><RotateCcw size={12} /> {loopAnim ? 'Loop ON' : 'Loop OFF'}</button>
            </div>

            {/* Categorized animations */}
            {ANIM_CATEGORIES.map((cat) => (
              <div key={cat.title} className="flex flex-col gap-2">
                {/* Category header */}
                <div className="flex items-center gap-2 px-1 mt-1">
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="text-xs font-bold tracking-[0.15em]" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#F2D27A' }}>
                    {cat.title}
                  </span>
                  <div className="flex-1 h-px bg-primary/20" />
                </div>

                {/* Animation items */}
                {cat.items.map((anim) => {
                  const isOpen = playingAnim === anim.id;
                  return (
                    <div key={anim.id} className="rounded-xl overflow-hidden" style={{
                      background: 'linear-gradient(145deg, rgba(30,28,24,0.9) 0%, rgba(18,16,14,0.95) 100%)',
                      border: isOpen ? '1px solid rgba(242,210,122,0.5)' : '1px solid rgba(242,210,122,0.15)',
                      boxShadow: isOpen ? '0 0 20px rgba(242,210,122,0.1)' : '0 2px 8px rgba(0,0,0,0.2)',
                    }}>
                      <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                        onClick={() => { if (isOpen) { setPlayingAnim(null); } else { setPlayingAnim(anim.id); setAnimCycle(c => c + 1); } }}
                      >
                        <Play size={16} className={`shrink-0 transition-colors ${isOpen ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-foreground block" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}>{anim.label}</span>
                          <span className="text-[11px] text-muted-foreground">{anim.description}</span>
                        </div>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="overflow-hidden">
                            <div className="px-3 pb-3" key={animCycle}>
                              <AnimationPreview id={anim.id} looping={loopAnim} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start button — only on config tab */}
      {activeTab === 'config' && (
        <motion.button
          className="relative z-10 mt-6 mb-8 casino-btn text-sm sm:text-base px-8 py-3 rounded-xl font-bold tracking-wider"
          style={{ background: 'linear-gradient(180deg, hsl(var(--casino-red)) 0%, hsl(0 50% 25%) 100%)', color: 'hsl(var(--casino-gold))', fontFamily: "'Bebas Neue', sans-serif" }}
          onClick={handleStart} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        >
          🚀 START TEST GAME
        </motion.button>
      )}
    </motion.div>
  );
};

export default TestingScreen;

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import charactersBg from '@/assets/characters-bg.png';

interface LoadingScreenProps {
  onComplete: () => void;
  isPublic?: boolean;
}

const LOADING_DURATION = 9;

// Example pot simulation values
const EXAMPLE_POT = 200;
const RAKE_PERCENT = 5;
const rakeAmount = Math.floor(EXAMPLE_POT * RAKE_PERCENT / 100); // $10
const affiliateCut = Math.floor(rakeAmount * 30 / 100);           // $3
const hosterCut = Math.floor(rakeAmount * 10 / 100);              // $1
const houseMoney = rakeAmount - affiliateCut - hosterCut;          // $6
const winnerPot = EXAMPLE_POT - rakeAmount;                        // $190

interface BreakdownStep {
  label: string;
  value: string;
  detail: string;
  color: string;
  icon: string;
}

const BREAKDOWN_STEPS: BreakdownStep[] = [
  { label: 'PRE-FLOP POT', value: '$30', detail: 'Small Blind $5 + Big Blind $10 + Calls', color: '120 50% 50%', icon: '🃏' },
  { label: 'FINAL POT', value: `$${EXAMPLE_POT}`, detail: 'After all betting rounds', color: '40 80% 55%', icon: '💰' },
];

// Revenue structure steps shown after pot
interface RevenueStep {
  label: string;
  value: string;
  detail: string;
  color: string;
  icon: string;
  type: 'deduction' | 'revenue' | 'prize' | 'winner';
}

const REVENUE_STEPS: RevenueStep[] = [
  { label: 'RAKE (5% HOUSE)', value: `-$${rakeAmount}`, detail: `Deducted from every pot`, color: '0 70% 55%', icon: '🏦', type: 'deduction' },
  { label: 'AFFILIATE COMMISSION', value: `$${affiliateCut}`, detail: '30% of rake from 2 referred players', color: '280 55% 55%', icon: '🤝', type: 'revenue' },
  { label: 'HOST COMMISSION', value: `$${hosterCut}`, detail: '10% of rake from all players', color: '200 60% 55%', icon: '🎩', type: 'revenue' },
  { label: 'HOST PRIZE BONUS', value: '+$0', detail: 'Optional extra prize from host', color: '160 50% 50%', icon: '🎁', type: 'prize' },
  { label: 'PLATFORM REVENUE', value: `$${houseMoney}`, detail: 'Remaining house earnings', color: '0 50% 45%', icon: '🏠', type: 'revenue' },
  { label: 'PLAYER WINNINGS', value: `$${winnerPot}`, detail: 'Prize pool based on ranking', color: '50 90% 55%', icon: '🏆', type: 'winner' },
];

const STEP_INTERVAL = 700;

const LoadingScreen = ({ onComplete, isPublic = true }: LoadingScreenProps) => {
  const [visiblePotSteps, setVisiblePotSteps] = useState(0);
  const [visibleRevenueSteps, setVisibleRevenueSteps] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => onComplete(), LOADING_DURATION * 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Reveal pot steps first
  useEffect(() => {
    if (visiblePotSteps >= BREAKDOWN_STEPS.length) return;
    const id = setTimeout(() => setVisiblePotSteps(v => v + 1), 600 + visiblePotSteps * STEP_INTERVAL);
    return () => clearTimeout(id);
  }, [visiblePotSteps]);

  // Then revenue steps
  useEffect(() => {
    if (visiblePotSteps < BREAKDOWN_STEPS.length) return;
    if (visibleRevenueSteps >= REVENUE_STEPS.length) return;
    const delay = visibleRevenueSteps === 0 ? 500 : STEP_INTERVAL;
    const id = setTimeout(() => setVisibleRevenueSteps(v => v + 1), delay);
    return () => clearTimeout(id);
  }, [visiblePotSteps, visibleRevenueSteps]);

  const renderStep = (step: { label: string; value: string; detail: string; color: string; icon: string }, idx: number, bgStyle?: string, isWinner?: boolean) => (
    <motion.div
      key={idx}
      className={`flex items-center justify-between px-3 py-1.5 sm:py-2 ${isWinner ? 'border-t border-primary/30' : ''}`}
      style={{
        background: isWinner
          ? 'linear-gradient(90deg, hsl(50 90% 55% / 0.1), transparent)'
          : bgStyle || 'transparent',
      }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm sm:text-base shrink-0">{step.icon}</span>
        <div className="flex flex-col min-w-0">
          <span
            className="text-[10px] sm:text-xs tracking-wider truncate"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              color: isWinner ? 'hsl(50 90% 60%)' : `hsl(${step.color})`,
            }}
          >
            {step.label}
          </span>
          <span className="text-muted-foreground text-[8px] sm:text-[9px] truncate">
            {step.detail}
          </span>
        </div>
      </div>
      <motion.span
        className={`text-sm sm:text-base font-bold shrink-0 ml-2 ${isWinner ? 'text-lg sm:text-xl' : ''}`}
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          color: isWinner ? 'hsl(50 90% 60%)' : `hsl(${step.color})`,
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
      >
        {step.value}
      </motion.span>
    </motion.div>
  );

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-end overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${charactersBg})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

      <div className="relative z-10 flex flex-col items-center gap-3 mb-[4vh] sm:mb-[6vh] w-full px-3 sm:px-8 max-w-xl">
        {/* Title */}
        <h2
          className="text-lg sm:text-2xl md:text-3xl tracking-[0.12em] text-center"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: '#F2D27A',
            textShadow: '0 2px 10px rgba(242, 210, 122, 0.4)',
          }}
        >
          {isPublic ? 'FINDING TABLE FOR YOU' : 'CREATING TABLE FOR YOU'}
        </h2>

        {/* Progress bar */}
        <div
          className="relative w-full max-w-sm h-2 sm:h-3 rounded-full overflow-hidden"
          style={{
            border: '1px solid hsl(var(--casino-gold) / 0.5)',
            background: 'hsl(var(--casino-dark) / 0.6)',
          }}
        >
          <motion.div
            className="absolute top-0 left-0 bottom-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, hsl(var(--casino-gold)), hsl(45 80% 65%))',
              boxShadow: '0 0 12px rgba(242, 210, 122, 0.5)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: LOADING_DURATION, ease: 'linear' }}
          />
        </div>

        {/* Pot Breakdown */}
        <div
          className="w-full mt-2 sm:mt-3 rounded-xl border border-primary/30 overflow-hidden"
          style={{ background: 'hsl(0 0% 5% / 0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div className="px-3 py-2 border-b border-primary/20 flex items-center justify-between">
            <span
              className="text-xs sm:text-sm tracking-wider"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
            >
              💡 HOW THE POT WORKS
            </span>
            <span className="text-muted-foreground text-[9px] sm:text-[10px]">Example hand</span>
          </div>

          <div className="flex flex-col">
            {BREAKDOWN_STEPS.map((step, i) => (
              <AnimatePresence key={i}>
                {i < visiblePotSteps && renderStep(step, i)}
              </AnimatePresence>
            ))}
          </div>
        </div>

        {/* Revenue Structure — appears after pot steps */}
        <AnimatePresence>
          {visiblePotSteps >= BREAKDOWN_STEPS.length && (
            <motion.div
              className="w-full rounded-xl border border-primary/30 overflow-hidden"
              style={{ background: 'hsl(0 0% 5% / 0.85)', backdropFilter: 'blur(8px)' }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="px-3 py-2 border-b border-primary/20 flex items-center justify-between">
                <span
                  className="text-xs sm:text-sm tracking-wider"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
                >
                  📊 REVENUE STRUCTURE
                </span>
                <span className="text-muted-foreground text-[9px] sm:text-[10px]">Per hand</span>
              </div>

              <div className="flex flex-col">
                {REVENUE_STEPS.map((step, i) => (
                  <AnimatePresence key={i}>
                    {i < visibleRevenueSteps && renderStep(
                      step,
                      i,
                      step.type === 'deduction'
                        ? 'hsl(0 40% 15% / 0.3)'
                        : step.type === 'prize'
                          ? 'hsl(160 30% 12% / 0.3)'
                          : step.type === 'revenue'
                            ? 'hsl(0 0% 8% / 0.4)'
                            : undefined,
                      step.type === 'winner'
                    )}
                  </AnimatePresence>
                ))}
              </div>

              {visibleRevenueSteps >= REVENUE_STEPS.length && (
                <motion.div
                  className="px-3 py-1.5 border-t border-primary/10 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-muted-foreground text-[8px] sm:text-[9px] italic">
                    Rake deducted before winnings • Host may add bonus prizes • Anti-cheat protected
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;

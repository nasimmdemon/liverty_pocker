import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import charactersBg from '@/assets/characters-bg.png';

interface LoadingScreenProps {
  onComplete: () => void;
  isPublic?: boolean;
}

const LOADING_DURATION = 10;

// Example pot simulation
const EXAMPLE_POT = 200;
const RAKE_PERCENT = 5;
const rakeAmount = Math.floor(EXAMPLE_POT * RAKE_PERCENT / 100);
const affiliateCut = Math.floor(rakeAmount * 30 / 100);
const hosterCut = Math.floor(rakeAmount * 10 / 100);
const houseMoney = rakeAmount - affiliateCut - hosterCut;
const winnerPot = EXAMPLE_POT - rakeAmount;

// "Did you know" tips that cycle
const DID_YOU_KNOW = [
  '🎯 The best poker players fold 70-80% of their hands.',
  '♠️ A Royal Flush has a 1 in 649,739 chance of being dealt.',
  '💡 Position is everything — late position wins more pots.',
  '🃏 Texas Hold\'em became popular after the 2003 WSOP.',
  '🧠 Reading opponents is more valuable than reading cards.',
];

// Pot breakdown steps
interface Step {
  label: string;
  value: string;
  detail: string;
  color: string;
  icon: string;
}

const POT_STEPS: Step[] = [
  { label: 'PRE-FLOP POT', value: '$30', detail: 'Small Blind $5 + Big Blind $10 + Calls', color: '120 50% 50%', icon: '🃏' },
  { label: 'FINAL POT', value: `$${EXAMPLE_POT}`, detail: 'After all betting rounds', color: '40 80% 55%', icon: '💰' },
];

interface RevenueStep extends Step {
  type: 'deduction' | 'revenue' | 'prize' | 'winner';
}

const REVENUE_STEPS: RevenueStep[] = [
  { label: 'RAKE (5% HOUSE)', value: `-$${rakeAmount}`, detail: 'Deducted from every pot', color: '0 70% 55%', icon: '🏦', type: 'deduction' },
  { label: 'AFFILIATE SHARE', value: `$${affiliateCut}`, detail: '30% rake from referred players — for life', color: '280 55% 55%', icon: '🤝', type: 'revenue' },
  { label: 'HOST COMMISSION', value: `$${hosterCut}`, detail: '10% from total table rake', color: '200 60% 55%', icon: '🎩', type: 'revenue' },
  { label: 'HOST PRIZE BONUS', value: '+$0', detail: 'Optional extra prize from host', color: '160 50% 50%', icon: '🎁', type: 'prize' },
  { label: 'PLATFORM REVENUE', value: `$${houseMoney}`, detail: 'Remaining house earnings', color: '0 50% 45%', icon: '🏠', type: 'revenue' },
  { label: 'PLAYER WINNINGS', value: `$${winnerPot}`, detail: 'Prize pool based on ranking', color: '50 90% 55%', icon: '🏆', type: 'winner' },
];

// Marketing banners that pop in
const BANNERS = [
  { title: 'Play. Invite. Earn.', lines: ['30% lifetime rake share from invited players', '10% host commission from total table rake'] },
  { title: 'Turn Your Table Into Income', lines: ['Invite players → 30% from rake on any hand they play — for life', 'Host tables → 10% commission from total rake'] },
];

const LoadingScreen = ({ onComplete, isPublic = true }: LoadingScreenProps) => {
  const [visiblePotSteps, setVisiblePotSteps] = useState(0);
  const [visibleRevenueSteps, setVisibleRevenueSteps] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => onComplete(), LOADING_DURATION * 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Reveal pot steps
  useEffect(() => {
    if (visiblePotSteps >= POT_STEPS.length) return;
    const id = setTimeout(() => setVisiblePotSteps(v => v + 1), 800 + visiblePotSteps * 600);
    return () => clearTimeout(id);
  }, [visiblePotSteps]);

  // Then revenue steps
  useEffect(() => {
    if (visiblePotSteps < POT_STEPS.length) return;
    if (visibleRevenueSteps >= REVENUE_STEPS.length) return;
    const delay = visibleRevenueSteps === 0 ? 400 : 550;
    const id = setTimeout(() => setVisibleRevenueSteps(v => v + 1), delay);
    return () => clearTimeout(id);
  }, [visiblePotSteps, visibleRevenueSteps]);

  // Show banner after revenue is done
  const [showBanner, setShowBanner] = useState(false);
  const banner = BANNERS[Math.floor(Math.random() * BANNERS.length)];

  useEffect(() => {
    if (visibleRevenueSteps < REVENUE_STEPS.length) return;
    const id = setTimeout(() => setShowBanner(true), 600);
    return () => clearTimeout(id);
  }, [visibleRevenueSteps]);

  // Cycle tips every 3s
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % DID_YOU_KNOW.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const bgForRevenue = (type: string) => {
    switch (type) {
      case 'deduction': return 'hsl(0 40% 15% / 0.3)';
      case 'prize': return 'hsl(160 30% 12% / 0.3)';
      case 'revenue': return 'hsl(0 0% 8% / 0.4)';
      default: return undefined;
    }
  };

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-end overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* BG */}
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${charactersBg})` }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: 'hsl(var(--casino-gold) / 0.4)',
            left: `${15 + i * 14}%`,
            bottom: '10%',
          }}
          animate={{
            y: [0, -120 - i * 30, -200],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.2, 0.3],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.7,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Fixed-height tip carousel at top */}
      <div className="relative z-10 w-full px-3 sm:px-8 max-w-xl mt-auto">
        <div
          className="w-full max-w-md mx-auto px-4 py-2 rounded-lg border border-primary/20 text-center h-14 sm:h-12 flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'hsl(0 0% 8% / 0.7)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <span
            className="text-[10px] sm:text-xs tracking-wider block mb-0.5"
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
          >
            💡 DID YOU KNOW?
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentTip}
              className="text-muted-foreground text-[9px] sm:text-[11px] block"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              {DID_YOU_KNOW[currentTip]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 mb-[3vh] sm:mb-[5vh] w-full px-3 sm:px-8 max-w-xl mt-2">
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title with pop animation */}
        <motion.h2
          className="text-lg sm:text-2xl md:text-3xl tracking-[0.12em] text-center"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            color: '#F2D27A',
            textShadow: '0 2px 10px rgba(242, 210, 122, 0.4)',
          }}
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 15, delay: 0.1 }}
        >
          {isPublic ? 'FINDING TABLE FOR YOU' : 'CREATING TABLE FOR YOU'}
        </motion.h2>

        {/* Pulsing dots under title */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'hsl(var(--casino-gold))' }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </div>

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
          {/* Shimmer effect on progress bar */}
          <motion.div
            className="absolute top-0 bottom-0 w-12 rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            }}
            animate={{ left: ['-10%', '110%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Pot Breakdown card — pops in */}
        <motion.div
          className="w-full mt-1 sm:mt-2 rounded-xl border border-primary/30 overflow-hidden"
          style={{ background: 'hsl(0 0% 5% / 0.85)', backdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
        >
          <div className="px-3 py-2 border-b border-primary/20 flex items-center justify-between">
            <motion.span
              className="text-xs sm:text-sm tracking-wider"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: 'hsl(var(--casino-gold))' }}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              💡 HOW THE POT WORKS
            </motion.span>
            <motion.span
              className="text-muted-foreground text-[9px] sm:text-[10px]"
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Example hand
            </motion.span>
          </div>

          <div className="flex flex-col">
            {POT_STEPS.map((step, i) => (
              <AnimatePresence key={i}>
                {i < visiblePotSteps && (
                  <motion.div
                    className="flex items-center justify-between px-3 py-1.5 sm:py-2"
                    initial={{ opacity: 0, x: -30, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <motion.span
                        className="text-sm sm:text-base shrink-0"
                        animate={{ rotate: [0, -10, 10, 0] }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        {step.icon}
                      </motion.span>
                      <div className="flex flex-col min-w-0">
                        <span
                          className="text-[10px] sm:text-xs tracking-wider truncate"
                          style={{ fontFamily: "'Bebas Neue', sans-serif", color: `hsl(${step.color})` }}
                        >
                          {step.label}
                        </span>
                        <span className="text-muted-foreground text-[8px] sm:text-[9px] truncate">{step.detail}</span>
                      </div>
                    </div>
                    <motion.span
                      className="text-sm sm:text-base font-bold shrink-0 ml-2"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", color: `hsl(${step.color})` }}
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.15 }}
                    >
                      {step.value}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
          </div>
        </motion.div>

        {/* Revenue Structure — pops in after pot */}
        <AnimatePresence>
          {visiblePotSteps >= POT_STEPS.length && (
            <motion.div
              className="w-full rounded-xl border border-primary/30 overflow-hidden"
              style={{ background: 'hsl(0 0% 5% / 0.85)', backdropFilter: 'blur(8px)' }}
              initial={{ opacity: 0, y: 25, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
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
                    {i < visibleRevenueSteps && (
                      <motion.div
                        className={`flex items-center justify-between px-3 py-1.5 sm:py-2 ${step.type === 'winner' ? 'border-t border-primary/30' : ''}`}
                        style={{
                          background: step.type === 'winner'
                            ? 'linear-gradient(90deg, hsl(50 90% 55% / 0.1), transparent)'
                            : bgForRevenue(step.type),
                        }}
                        initial={{ opacity: 0, x: -25, scale: 0.92 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <motion.span
                            className="text-sm sm:text-base shrink-0"
                            animate={step.type === 'winner' ? { scale: [1, 1.3, 1] } : { rotate: [0, -8, 8, 0] }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                          >
                            {step.icon}
                          </motion.span>
                          <div className="flex flex-col min-w-0">
                            <span
                              className="text-[10px] sm:text-xs tracking-wider truncate"
                              style={{
                                fontFamily: "'Bebas Neue', sans-serif",
                                color: step.type === 'winner' ? 'hsl(50 90% 60%)' : `hsl(${step.color})`,
                              }}
                            >
                              {step.label}
                            </span>
                            <span className="text-muted-foreground text-[8px] sm:text-[9px] truncate">{step.detail}</span>
                          </div>
                        </div>
                        <motion.span
                          className={`text-sm sm:text-base font-bold shrink-0 ml-2 ${step.type === 'winner' ? 'text-lg sm:text-xl' : ''}`}
                          style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            color: step.type === 'winner' ? 'hsl(50 90% 60%)' : step.type === 'deduction' ? 'hsl(0 70% 60%)' : `hsl(${step.color})`,
                          }}
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.15 }}
                        >
                          {step.value}
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Marketing Banner — pops in at the end */}
        <AnimatePresence>
          {showBanner && (
            <motion.div
              className="w-full rounded-xl border-2 border-primary/50 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(0 0% 8% / 0.9), hsl(40 30% 10% / 0.9))',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 0 30px hsl(var(--casino-gold) / 0.15)',
              }}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <div className="px-4 py-3 text-center">
                <motion.h3
                  className="text-base sm:text-lg tracking-wider mb-1.5"
                  style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    color: 'hsl(var(--casino-gold))',
                    textShadow: '0 0 15px hsl(var(--casino-gold) / 0.3)',
                  }}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                >
                  {banner.title}
                </motion.h3>
                {banner.lines.map((line, i) => (
                  <motion.p
                    key={i}
                    className="text-muted-foreground text-[9px] sm:text-[11px] leading-relaxed"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.15 }}
                  >
                    • {line}
                  </motion.p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;

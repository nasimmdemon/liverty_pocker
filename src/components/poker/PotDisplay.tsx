import { motion } from 'framer-motion';

interface PotDisplayProps {
  pot: number;
}

const PotDisplay = ({ pot }: PotDisplayProps) => (
  <motion.div
    className="flex flex-col items-center justify-center rounded-xl px-4 py-2 border border-primary/40"
    style={{
      background: 'linear-gradient(180deg, hsl(120 22% 14% / 0.8) 0%, hsl(120 20% 10% / 0.9) 100%)',
      boxShadow: 'inset 0 0 16px rgba(0,0,0,0.3), 0 0 12px hsl(var(--casino-gold) / 0.15)',
    }}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <span className="text-primary font-display text-sm sm:text-base lg:text-xl font-bold drop-shadow-lg tracking-wider">
      ${pot.toLocaleString()}
    </span>
    <span className="text-muted-foreground text-[9px] sm:text-[10px] uppercase tracking-widest">Pot</span>
  </motion.div>
);

export default PotDisplay;

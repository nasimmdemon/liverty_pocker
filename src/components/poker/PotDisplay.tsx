import { motion } from 'framer-motion';

interface PotDisplayProps {
  pot: number;
}

const PotDisplay = ({ pot }: PotDisplayProps) => (
  <motion.div
    className="absolute top-[28%] sm:top-[25%] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <span className="text-primary font-display text-base sm:text-xl font-bold drop-shadow-lg">
      ${pot.toLocaleString()}
    </span>
    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Pot</span>
  </motion.div>
);

export default PotDisplay;

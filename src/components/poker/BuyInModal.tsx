import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BuyInModalProps {
  onConfirm: (amount: number) => void;
}

const BUY_IN_OPTIONS = [500, 1000, 1500];

const BuyInModal = ({ onConfirm }: BuyInModalProps) => {
  const [selected, setSelected] = useState(1000);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-[90%] max-w-md rounded-2xl border-2 border-primary p-6 flex flex-col items-center gap-6"
          style={{ background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <h2 className="font-display text-2xl sm:text-3xl text-primary tracking-wider">Select Buy-In</h2>
          <p className="text-muted-foreground text-sm text-center">Choose how many chips to bring to the table</p>

          <div className="flex gap-3 w-full">
            {BUY_IN_OPTIONS.map(amount => (
              <button
                key={amount}
                onClick={() => setSelected(amount)}
                className={`flex-1 py-4 rounded-xl border-2 transition-all duration-200 font-display text-lg sm:text-xl tracking-wide ${
                  selected === amount
                    ? 'border-primary bg-primary/20 text-primary glow-gold'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                }`}
              >
                ${amount.toLocaleString()}
              </button>
            ))}
          </div>

          <button
            onClick={() => onConfirm(selected)}
            className="casino-btn w-full text-base py-4"
          >
            Join Table
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BuyInModal;

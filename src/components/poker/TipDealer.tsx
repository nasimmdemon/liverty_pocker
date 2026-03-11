import { useState } from 'react';
import { motion } from 'framer-motion';
import { Banknote, Coins } from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const TIP_AMOUNTS = [5, 10, 25, 50, 100];

interface TipDealerProps {
  chipCount: number;
  onTip: (amount: number) => void;
  isMobile?: boolean;
  displayMode?: 'icon' | 'button';
}

const TipDealer = ({ chipCount, onTip, isMobile = false, displayMode = 'icon' }: TipDealerProps) => {
  const [open, setOpen] = useState(false);

  const handleTip = (amount: number) => {
    if (amount > chipCount) {
      toast.error('Not enough chips to tip');
      return;
    }
    onTip(amount);
    setOpen(false);
    toast.success(`Tipped dealer $${amount}`, {
      description: 'Thanks for your generosity!',
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={
            displayMode === 'button'
              ? 'dealer-tip-button'
              : 'shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border-2 border-primary transition-all hover:bg-primary/10 hover:scale-105'
          }
          style={displayMode === 'button' ? undefined : { background: 'hsl(var(--casino-dark))' }}
          title="Tip the dealer"
        >
          {displayMode === 'button' ? (
            <>
              <Coins size={isMobile ? 12 : 14} className="text-primary" />
              <span className="text-primary text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                Tip Dealer
              </span>
            </>
          ) : (
            <Coins size={isMobile ? 14 : 16} className="text-primary" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0 border-primary/30"
        align="center"
        side="top"
        sideOffset={8}
        style={{ background: 'hsl(var(--casino-dark))' }}
      >
        <div className="p-3 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-primary" />
            <span className="font-display text-sm font-bold text-primary tracking-wider">
              Tip the Dealer
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Show appreciation for great dealing
          </p>
        </div>
        <div className="p-3 flex flex-wrap gap-2">
          {TIP_AMOUNTS.map((amount) => (
            <motion.button
              key={amount}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTip(amount)}
              disabled={amount > chipCount}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-primary text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              ${amount}
            </motion.button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TipDealer;

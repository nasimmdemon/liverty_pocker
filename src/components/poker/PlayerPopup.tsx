import { motion, AnimatePresence } from 'framer-motion';
import { Player } from '@/lib/gameTypes';
import { X, AlertTriangle, UserPlus, VolumeX } from 'lucide-react';

interface PlayerPopupProps {
  player: Player | null;
  onClose: () => void;
  onReport?: (player: Player) => void;
  onAddFriend?: (player: Player) => void;
  onMute?: (player: Player) => void;
}

const PlayerPopup = ({ player, onClose, onReport, onAddFriend, onMute }: PlayerPopupProps) => (
  <AnimatePresence>
    {player && (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative rounded-xl p-5 min-w-[260px] border-2 border-secondary"
          style={{ background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--muted)))' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-2 right-2 text-destructive">
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary">
              <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="text-muted-foreground text-xs">NAME:</div>
              <div className="text-foreground font-bold">{player.name}</div>
              {player.invitedBy && (
                <div className="text-muted-foreground text-xs">invited by: {player.invitedBy}</div>
              )}
              <div className="text-foreground text-sm mt-1">
                <span className="text-muted-foreground">NET WORTH: </span>
                <span className="font-bold">${player.netWorth}</span>
              </div>
              <div className="text-foreground text-sm">
                <span className="text-muted-foreground">RANK: </span>
                <span className="font-bold">{player.rank}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { onReport?.(player); onClose(); }}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
              style={{ background: 'hsl(var(--destructive))' }}
              title="Report player"
            >
              <AlertTriangle size={18} className="text-destructive-foreground" />
            </button>
            <button
              onClick={() => { onAddFriend?.(player); onClose(); }}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
              style={{ background: 'hsl(120 40% 40%)' }}
              title="Add friend"
            >
              <UserPlus size={18} className="text-foreground" />
            </button>
            <button
              onClick={() => { onMute?.(player); onClose(); }}
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
              style={{ background: 'hsl(220 60% 50%)' }}
              title="Mute player"
            >
              <VolumeX size={18} className="text-foreground" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default PlayerPopup;

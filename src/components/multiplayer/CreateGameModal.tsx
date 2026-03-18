import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, X, Percent } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGameRoom } from '@/lib/multiplayer';
import { toast } from '@/hooks/use-toast';

interface CreateGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostId: string;
  hostName: string;
  hostPhotoURL: string | null;
  onCreated: (room: import('@/lib/multiplayer').GameRoom) => void;
  inviterId?: string;
  isPrivateTable?: boolean;
}

const CreateGameModal = ({
  open,
  onOpenChange,
  hostId,
  hostName,
  hostPhotoURL,
  onCreated,
  inviterId,
  isPrivateTable = false,
}: CreateGameModalProps) => {
  const [buyIn, setBuyIn] = useState(1500);
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [turnTimer, setTurnTimer] = useState(10);
  const [botCount, setBotCount] = useState(0);
  const [gameMode, setGameMode] = useState<'tournament' | 'sit-and-go'>('sit-and-go');
  const [commissionTest, setCommissionTest] = useState(false);
  const [affiliatePlayerIndex, setAffiliatePlayerIndex] = useState(0);
  const [hostPlayerIndex, setHostPlayerIndex] = useState(1);
  const [inviterPlayerIndex, setInviterPlayerIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ gameId: string; inviteCode: string; room: import('@/lib/multiplayer').GameRoom } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const room = await createGameRoom(hostId, hostName, hostPhotoURL, buyIn, smallBlind, bigBlind, inviterId, isPrivateTable);
      setCreated({ gameId: room.id, inviteCode: room.inviteCode, room });
      toast({ title: 'Game created!', description: 'Share the code with friends to invite them.' });
    } catch (e) {
      toast({ title: 'Failed to create game', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!created) return;
    const url = `${window.location.origin}${window.location.pathname}?join=${created.inviteCode}`;
    navigator.clipboard.writeText(`${created.inviteCode}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied to clipboard!' });
  };

  const handleGoToLobby = () => {
    if (created && created.room) {
      onCreated(created.room);
      onOpenChange(false);
      setCreated(null);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCreated(null);
  };

  const inputClass = 'bg-background/80 border-2 border-primary/40 rounded-lg px-3 py-2 text-foreground text-sm font-bold text-center focus:outline-none focus:border-primary w-full';
  const labelClass = 'text-xs tracking-wider text-muted-foreground uppercase';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background border-2 border-primary/50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-primary">Create Multiplayer Game</DialogTitle>
        </DialogHeader>
        <AnimatePresence mode="wait">
          {!created ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Buy-in */}
              <div className="grid gap-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                <label className={labelClass}>Buy-in ($)</label>
                <input type="number" min={100} max={100000} value={buyIn} onChange={e => setBuyIn(Number(e.target.value))} className={inputClass} />
              </div>

              {/* Blinds */}
              <div className="grid grid-cols-2 gap-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                <div className="grid gap-1">
                  <label className={labelClass}>Small Blind</label>
                  <input type="number" min={1} value={smallBlind} onChange={e => setSmallBlind(Number(e.target.value))} className={inputClass} />
                </div>
                <div className="grid gap-1">
                  <label className={labelClass}>Big Blind</label>
                  <input type="number" min={1} value={bigBlind} onChange={e => setBigBlind(Number(e.target.value))} className={inputClass} />
                </div>
              </div>

              {/* Turn Timer */}
              <div className="grid gap-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                <label className={labelClass}>Turn Timer (seconds)</label>
                <input type="number" min={5} max={60} value={turnTimer} onChange={e => setTurnTimer(Number(e.target.value))} className={inputClass} />
              </div>

              {/* Bot count */}
              <div className="grid gap-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                <label className={labelClass}>Bots to fill empty seats (0-5)</label>
                <input type="number" min={0} max={5} value={botCount} onChange={e => setBotCount(Math.max(0, Math.min(5, Number(e.target.value))))} className={inputClass} />
              </div>

              {/* Game Mode */}
              <div className="grid gap-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                <label className={labelClass}>Game Mode</label>
                <div className="flex gap-2">
                  {(['sit-and-go', 'tournament'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setGameMode(mode)}
                      className={`flex-1 py-2 text-xs tracking-wider rounded-lg border-2 transition-all ${
                        gameMode === mode
                          ? 'border-primary/60 bg-primary/15 text-primary'
                          : 'border-primary/20 text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {mode === 'sit-and-go' ? 'SIT & GO' : 'TOURNAMENT'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Commission test toggle */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'linear-gradient(145deg, rgba(30,28,24,0.9) 0%, rgba(18,16,14,0.95) 100%)',
                  border: '1px solid rgba(242,210,122,0.25)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setCommissionTest(!commissionTest)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <div className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-200 ${commissionTest ? 'bg-primary/90' : 'bg-muted/60'}`}>
                    <motion.div
                      className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md"
                      animate={{ x: commissionTest ? 18 : 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  </div>
                  <Percent className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium text-foreground">Commission test</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">affiliate · host · inviter</span>
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
                      <div className="px-4 pb-3 pt-1 grid grid-cols-3 gap-2 border-t border-white/5">
                        <div className="grid gap-1">
                          <label className="text-[10px] text-muted-foreground uppercase">Affiliate</label>
                          <input type="number" min={0} max={5} value={affiliatePlayerIndex} onChange={e => setAffiliatePlayerIndex(Math.max(0, Math.min(5, Number(e.target.value))))} className={`${inputClass} text-xs`} />
                        </div>
                        <div className="grid gap-1">
                          <label className="text-[10px] text-muted-foreground uppercase">Host</label>
                          <input type="number" min={0} max={5} value={hostPlayerIndex} onChange={e => setHostPlayerIndex(Math.max(0, Math.min(5, Number(e.target.value))))} className={`${inputClass} text-xs`} />
                        </div>
                        <div className="grid gap-1">
                          <label className="text-[10px] text-muted-foreground uppercase">Inviter</label>
                          <input type="number" min={0} max={5} value={inviterPlayerIndex} onChange={e => setInviterPlayerIndex(Math.max(0, Math.min(5, Number(e.target.value))))} className={`${inputClass} text-xs`} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                className="w-full casino-btn"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Game'}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="invite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">Share this code with friends:</p>
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted border-2 border-primary/30">
                <span className="text-2xl font-mono font-bold text-primary tracking-widest">
                  {created.inviteCode}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Or share the link: {window.location.origin}{window.location.pathname}?join={created.inviteCode}
              </p>
              <div className="flex gap-2">
                <Button className="flex-1 casino-btn" onClick={handleGoToLobby}>
                  Go to Lobby
                </Button>
                <Button variant="outline" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGameModal;

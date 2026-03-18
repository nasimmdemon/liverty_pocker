import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, X } from 'lucide-react';
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
  inviterId?: string;      // UID of who referred the host (for private table rake)
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background border-2 border-primary/50">
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
              className="space-y-4"
            >
              <div className="grid gap-2">
                <Label>Buy-in ($)</Label>
                <Input
                  type="number"
                  min={100}
                  max={100000}
                  value={buyIn}
                  onChange={(e) => setBuyIn(Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Small Blind</Label>
                  <Input
                    type="number"
                    min={1}
                    value={smallBlind}
                    onChange={(e) => setSmallBlind(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Big Blind</Label>
                  <Input
                    type="number"
                    min={1}
                    value={bigBlind}
                    onChange={(e) => setBigBlind(Number(e.target.value))}
                  />
                </div>
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

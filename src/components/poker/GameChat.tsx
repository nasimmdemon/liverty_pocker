import { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion } from 'framer-motion';

const QUICK_MESSAGES = [
  'Nice hand!',
  'Good luck!',
  'GG',
  'Thanks!',
  'Oops!',
  'All in!',
  'Let\'s go!',
  'Unlucky',
];

interface GameChatProps {
  onSendMessage: (text: string) => void;
  isMobile?: boolean;
}

const GameChat = ({ onSendMessage, isMobile = false }: GameChatProps) => {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  const handleQuickMessage = (text: string) => {
    onSendMessage(text);
    setOpen(false);
  };

  const handleCustomSend = () => {
    const trimmed = customText.trim();
    if (trimmed) {
      onSendMessage(trimmed);
      setCustomText('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center border-2 border-primary hover:bg-primary/10 transition-colors"
          style={{ background: 'hsl(var(--casino-dark))' }}
        >
          <MessageCircle size={isMobile ? 14 : 16} className="text-primary" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        className="w-72 sm:w-80 p-3 border-primary/30 bg-background/95 backdrop-blur-sm"
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Quick messages</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_MESSAGES.map((msg) => (
              <button
                key={msg}
                onClick={() => handleQuickMessage(msg)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-primary/50 bg-primary/10 hover:bg-primary/20 text-foreground transition-colors"
              >
                {msg}
              </button>
            ))}
          </div>
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Custom message</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSend()}
                placeholder="Type a message..."
                maxLength={80}
                className="flex-1 px-3 py-2 rounded-lg text-sm bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleCustomSend}
                disabled={!customText.trim()}
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border-2 border-primary bg-primary/20 hover:bg-primary/30 disabled:opacity-50 disabled:pointer-events-none transition-colors"
              >
                <Send size={16} className="text-primary" />
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default GameChat;

export const BOT_CHAT_MESSAGES = [
  'Nice hand!',
  'Good luck!',
  'Hmm...',
  'Let\'s see',
  'Interesting',
  'GG',
  'Unlucky',
  'All in!',
  'Thanks!',
];

export function ChatBubble({ text, playerName }: { text: string; playerName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.95 }}
      className="relative z-50 max-w-[160px] sm:max-w-[200px]"
    >
      <div
        className="relative px-3 py-2 rounded-xl border-2 border-primary/60 shadow-lg"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--casino-dark)) 0%, hsl(0 0% 8%) 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px hsl(var(--casino-gold) / 0.3)',
        }}
      >
        <p className="text-[10px] text-muted-foreground font-semibold mb-0.5 truncate">{playerName}</p>
        <p className="text-xs text-foreground font-medium break-words">{text}</p>
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
          style={{
            background: 'hsl(var(--casino-dark))',
            borderRight: '2px solid hsl(var(--casino-gold) / 0.6)',
            borderBottom: '2px solid hsl(var(--casino-gold) / 0.6)',
          }}
        />
      </div>
    </motion.div>
  );
}

import { whatsappLink } from '@/lib/constants';
import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton() {
  const msg = whatsappLink('Oi! Vim pelo site da Arena Manaus e quero reservar um horário ☀');

  return (
    <a
      href={msg}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 bg-lime hover:bg-lime-dark text-ink rounded-full p-4 shadow-2xl transition-all hover:scale-110 active:scale-95"
    >
      <MessageCircle size={28} />
    </a>
  );
}

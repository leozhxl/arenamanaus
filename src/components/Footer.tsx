import { ARENA } from '@/lib/constants';
import { WaveDivider } from './WaveDivider';
import { Instagram, MessageCircle, Mail } from 'lucide-react';

const FOOTER_LINKS = [
  { label: 'Quadras', href: '#estrutura' },
  { label: 'Aulas', href: '#aulas' },
  { label: 'Preços', href: '#precos' },
  { label: 'Reservar', href: '#reserva' },
  { label: 'Eventos', href: '#eventos' },
  { label: 'Contato', href: '#contato' },
];

export default function Footer() {
  return (
    <footer className="bg-ink relative">
      {/* Wave top */}
      <div className="absolute top-0 left-0 right-0 -translate-y-px">
        <WaveDivider color="#A6E22E" />
      </div>

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {/* Logo + tagline */}
            <div>
              <div className="flex flex-col leading-none mb-3">
                <span className="font-display text-3xl text-lime tracking-wide">ARENA</span>
                <span className="font-display text-xl text-foam tracking-[0.2em] -mt-1">MANAUS</span>
              </div>
              <p className="font-body text-sm text-foam/50">
                {ARENA.subtitle} · since {ARENA.since}
              </p>
              <p className="font-marker text-lime text-lg mt-4">
                {ARENA.slogan}
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-display text-sm text-foam/40 uppercase mb-4">Navegação</h4>
              <div className="grid grid-cols-2 gap-2">
                {FOOTER_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="font-body text-sm text-foam/70 hover:text-lime transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Social */}
            <div>
              <h4 className="font-display text-sm text-foam/40 uppercase mb-4">Fala com a gente</h4>
              <div className="flex flex-col gap-3">
                <a
                  href={`https://instagram.com/${ARENA.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-body text-sm text-foam/70 hover:text-lime transition-colors"
                >
                  <Instagram size={18} /> @{ARENA.instagram}
                </a>
                <a
                  href={`https://wa.me/${ARENA.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-body text-sm text-foam/70 hover:text-lime transition-colors"
                >
                  <MessageCircle size={18} /> WhatsApp
                </a>
                <a
                  href={`mailto:${ARENA.email}`}
                  className="inline-flex items-center gap-2 font-body text-sm text-foam/70 hover:text-lime transition-colors"
                >
                  <Mail size={18} /> {ARENA.email}
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-foam/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-body text-xs text-foam/30">
              © {new Date().getFullYear()} Arena Manaus · Esportes de Areia · {ARENA.location}
            </p>
            <p className="font-body text-xs text-foam/30">
              Feito com sol e areia em Balneário Gaivota/SC
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
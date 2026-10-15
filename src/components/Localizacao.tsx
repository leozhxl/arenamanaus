import { ARENA, whatsappLink } from '@/lib/constants';
import { MapPin, Clock, MessageCircle, Instagram } from 'lucide-react';

export default function Localizacao() {
  return (
    <section id="contato" className="bg-sand py-16 md:py-24 sand-texture">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <p className="font-marker text-sea text-lg mb-2">localização e contato</p>
          <h2 className="font-display text-4xl md:text-6xl text-ink uppercase">
            Onde a areia tá
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Map */}
          <div className="rounded-2xl overflow-hidden shadow-lg h-80 md:h-full min-h-[320px] bg-sand-burnt">
            <iframe
              title="Mapa Arena Manaus — Balneário Gaivota/SC"
              src={`https://www.google.com/maps?q=${encodeURIComponent('Arena Manaus Quadra de esportes, Av. Santa Catarina, 632, Balneário Gaivota - SC, 88955-000')}&output=embed`}
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>

          {/* Contact info */}
          <div className="space-y-6">
            <div className="bg-foam rounded-xl p-6 border border-sand-dark/20">
              <div className="flex items-start gap-4">
                <MapPin size={24} className="text-sea shrink-0 mt-1" />
                <div>
                  <h3 className="font-display text-lg text-ink uppercase">Endereço</h3>
                  <p className="font-body text-ink/60 mt-1">{ARENA.address}</p>
                </div>
              </div>
            </div>

            <div className="bg-foam rounded-xl p-6 border border-sand-dark/20">
              <div className="flex items-start gap-4">
                <Clock size={24} className="text-lime-dark shrink-0 mt-1" />
                <div>
                  <h3 className="font-display text-lg text-ink uppercase">Funcionamento</h3>
                  <p className="font-body text-ink/60 mt-1">{ARENA.hours}</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <a
                href={whatsappLink('Oi! Vim pelo site da Arena Manaus e quero reservar um horário ☀')}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-lime hover:bg-lime-dark text-ink rounded-xl p-4 text-center transition-colors lift"
              >
                <MessageCircle size={24} className="mx-auto mb-2" />
                <span className="font-body font-bold text-sm">WhatsApp</span>
                <span className="block font-body text-xs text-ink/70 mt-1">{ARENA.phone}</span>
              </a>
              <a
                href={`https://instagram.com/${ARENA.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-foam hover:bg-sand border border-sand-dark/20 text-ink rounded-xl p-4 text-center transition-colors lift"
              >
                <Instagram size={24} className="mx-auto mb-2 text-sea" />
                <span className="font-body font-bold text-sm">Instagram</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { ARENA } from '@/lib/constants';
import { Instagram } from 'lucide-react';

const GALLERY_IMAGES = [
  { url: 'https://images.pexels.com/photos/14018343/pexels-photo-14018343.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Futevôlei ao pôr do sol na Arena Manaus' },
  { url: 'https://images.pexels.com/photos/9265913/pexels-photo-9265913.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Partida de vôlei de praia' },
  { url: 'https://images.pexels.com/photos/38572465/pexels-photo-38572465.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Beach tênis em quadra de areia' },
  { url: 'https://images.pexels.com/photos/4330940/pexels-photo-4330940.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Vôlei de praia à noite com iluminação' },
  { url: 'https://images.pexels.com/photos/12169060/pexels-photo-12169060.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Jogador saltando para atacar' },
  { url: 'https://images.pexels.com/photos/7425906/pexels-photo-7425906.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Grupo jogando vôlei de praia' },
  { url: 'https://images.pexels.com/photos/35398615/pexels-photo-35398615.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Bola de vôlei na areia ao pôr do sol' },
  { url: 'https://images.pexels.com/photos/9870518/pexels-photo-9870518.jpeg?auto=compress&cs=tinysrgb&w=600', alt: 'Vista de cima de quadra de areia' },
];

export default function Galeria() {
  return (
    <section className="bg-sand-burnt py-16 md:py-24 sand-texture">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center mb-10">
          <p className="font-marker text-sea text-lg mb-2">galeria</p>
          <h2 className="font-display text-4xl md:text-6xl text-ink uppercase">
            A areia em movimento
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {GALLERY_IMAGES.map((img, i) => (
            <div
              key={i}
              className={`overflow-hidden rounded-lg lift ${
                i === 0 ? 'col-span-2 row-span-2' : ''
              }`}
            >
              <img
                src={img.url}
                alt={img.alt}
                className={`w-full object-cover ${i === 0 ? 'h-full min-h-[200px]' : 'h-32 md:h-40'}`}
              />
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a
            href={`https://instagram.com/${ARENA.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-body font-bold text-sea hover:text-sea-dark transition-colors"
          >
            <Instagram size={20} /> @{ARENA.instagram}
          </a>
        </div>
      </div>
    </section>
  );
}
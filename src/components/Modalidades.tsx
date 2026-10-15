import { WaveDivider } from './WaveDivider';
import { SPORT_TAGS } from '@/lib/types';

const MODALIDADES = [
  {
    sport: 'futevolei' as const,
    label: 'Futevôlei',
    image: '/futevolei.jpg',
    alt: 'Jogador de futevôlei dando uma bicicleta na areia com a torcida ao fundo',
    // Fotos com fullImage aparecem inteiras, na proporção original, sem corte
    fullImage: true,
  },
  {
    sport: 'volei' as const,
    label: 'Vôlei de Praia',
    image: '/volei-praia.jpg',
    alt: 'Jogadoras de vôlei de praia disputando a bola na rede',
    fullImage: true,
  },
  {
    sport: 'beachtennis' as const,
    label: 'Beach Tênis',
    image: '/beach-tenis.jpg',
    alt: 'Duas jogadoras disputando uma partida de beach tênis na areia',
    fullImage: true,
  },
];

export default function Modalidades() {
  return (
    <section id="modalidades" className="bg-sand sand-texture py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <p className="font-marker text-lime text-lg mb-2">as modalidades</p>
          <h2 className="font-display text-4xl md:text-6xl text-ink uppercase">
            Escolha sua areia
          </h2>
        </div>

        <div className="flex flex-col gap-8">
          {MODALIDADES.map((mod, i) => {
            const full = 'fullImage' in mod && mod.fullImage;
            const narrow = 'narrow' in mod && mod.narrow;
            return (
            <div
              key={mod.sport}
              className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-6 md:gap-10 items-center lift`}
            >
              <div className={`w-full md:w-1/2 relative ${narrow ? 'max-w-md mx-auto' : ''}`}>
                <div className={`relative rounded-2xl overflow-hidden shadow-xl ${full ? '' : 'h-64 md:h-80'}`}>
                  <img
                    src={mod.image}
                    alt={mod.alt}
                    className={full ? 'block w-full h-auto' : 'w-full h-full object-cover'}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
                </div>
                <div className={`absolute ${i % 2 === 0 ? 'right-0' : 'left-0'} -bottom-4 bg-lime text-ink font-display text-sm px-4 py-2 rounded-lg shadow-lg`}>
                  0{i + 1}
                </div>
              </div>

              <div className="w-full md:w-1/2 text-center md:text-left">
                <h3 className="font-display text-4xl md:text-5xl text-ink uppercase leading-none">
                  {mod.label}
                </h3>
                <p className="font-body text-lg md:text-xl text-ink/70 mt-4">
                  {SPORT_TAGS[mod.sport]}
                </p>
                <a
                  href="#reserva"
                  className="inline-block mt-6 font-body font-bold text-sea hover:text-sea-dark transition-colors border-b-2 border-sea/30 hover:border-sea pb-0.5"
                >
                  Reservar esta modalidade →
                </a>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <WaveDivider color="#E8D5B5" />
    </section>
  );
}
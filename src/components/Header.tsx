import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Quadras', href: '#estrutura' },
  { label: 'Aulas', href: '#aulas' },
  { label: 'Preços', href: '#precos' },
  { label: 'Agendar', href: '#reserva' },
  { label: 'Eventos', href: '#eventos' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Contato', href: '#contato' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed top-[28px] left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-ink/90 backdrop-blur-md shadow-lg'
            : 'bg-ink/40 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          {/* Logo placeholder */}
          <a href="#hero" className="flex items-center gap-2" aria-label="Arena Manaus">
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl md:text-2xl text-lime tracking-wide">
                ARENA
              </span>
              <span className="font-display text-sm md:text-base text-foam tracking-[0.2em] -mt-1">
                MANAUS
              </span>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-body text-sm font-medium text-foam/90 hover:text-lime transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#reserva"
              className="hidden sm:inline-flex bg-lime hover:bg-lime-dark text-ink font-body font-bold text-sm px-5 py-2.5 rounded-full transition-colors"
            >
              RESERVAR QUADRA
            </a>
            <button
              className="lg:hidden text-foam p-2"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-ink flex flex-col">
          <div className="flex items-center justify-between h-16 px-4 border-b border-foam/10">
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl text-lime tracking-wide">ARENA</span>
              <span className="font-display text-sm text-foam tracking-[0.2em] -mt-1">MANAUS</span>
            </div>
            <button
              className="text-foam p-2"
              onClick={() => setMenuOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={24} />
            </button>
          </div>
          <nav className="flex-1 flex flex-col justify-center px-6 gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="font-display text-3xl text-foam hover:text-lime transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="p-6 border-t border-foam/10">
            <a
              href="#reserva"
              onClick={() => setMenuOpen(false)}
              className="block w-full text-center bg-lime text-ink font-body font-bold text-lg py-4 rounded-full"
            >
              RESERVAR QUADRA
            </a>
          </div>
        </div>
      )}
    </>
  );
}
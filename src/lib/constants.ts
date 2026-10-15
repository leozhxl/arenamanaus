// ── Pricing ────────────────────────────────────
export const PRICING = {
  courtDay: 60,
  courtNight: 80,
  courtWeekend: 100,
  monthly4: 200,
  monthly8: 360,
  rental: 10,
};

export const LESSON_PRICING = {
  onceWeek: 120,
  twiceWeek: 200,
  thriceWeek: 280,
  single: 50,
  private: 100,
};

// ── Time slots ─────────────────────────────────
export const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00',
];

export const DURATIONS = [
  { hours: 1, label: '1 hora' },
  { hours: 1.5, label: '1h30' },
  { hours: 2, label: '2 horas' },
];

// ── Arena info ────────────────────────────────
export const ARENA = {
  name: 'Arena Manaus',
  subtitle: 'Quadra de Esportes',
  since: '2025',
  slogan: 'A vibe que você procura, o esporte que você ama!',
  location: 'Balneário Gaivota · SC',
  whatsapp: '5548996411280',
  phone: '(48) 99641-1280',
  instagram: 'arena.manaus', // [inserir @ real]
  email: 'contato@arenamanaus.com.br', // [inserir e-mail real]
  address: 'Av. Santa Catarina, 632 — Balneário Gaivota, SC, 88955-000',
  hours: 'Seg a Sex: 6h às 22h · Fim de semana: 7h às 23h',
  cancelPolicy: 'Cancelamento com até 12h de antecedência',
  latePolicy: 'Tolerância de 15 minutos de atraso',
  rainPolicy: 'Chuva? Temos quadra coberta',
};

export function whatsappLink(message: string): string {
  return `https://wa.me/${ARENA.whatsapp}?text=${encodeURIComponent(message)}`;
}


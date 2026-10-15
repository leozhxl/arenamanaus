export type Sport = 'futevolei' | 'volei' | 'beachtennis';

export interface Court {
  id: number;
  name: string;
  sport: string;
  active: boolean;
}

export interface Reservation {
  id: string;
  court_id: number;
  sport: string;
  date: string;
  start_time: string;
  duration_hours: number;
  num_players: number;
  player_name: string;
  player_phone: string;
  player_email: string;
  total_price: number;
  payment_method: string;
  status: string;
}

export interface TrialClass {
  id: string;
  sport: string;
  level: string;
  preferred_day: string | null;
  preferred_time: string | null;
  name: string;
  phone: string;
  email: string;
  status: string;
}

export interface ArenaEvent {
  id: string;
  title: string;
  type: string;
  date: string;
  description: string | null;
  image_url: string | null;
  published?: boolean;
}

/** Tipos de evento que a equipe pode publicar pelo admin */
export const EVENT_TYPES: Record<string, string> = {
  torneio: 'Torneio',
  dayuse: 'Day Use',
  aula: 'Aulão / Clínica',
  especial: 'Especial',
  promocao: 'Promoção',
  aviso: 'Aviso',
  aniversario: 'Aniversário',
  empresa: 'Evento Empresarial',
};

export interface CourtBlock {
  id: string;
  court_id: number | null;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export const SPORT_LABELS: Record<Sport, string> = {
  futevolei: 'Futevôlei',
  volei: 'Vôlei de Praia',
  beachtennis: 'Beach Tênis',
};

export const SPORT_TAGS: Record<Sport, string> = {
  futevolei: 'Pé, peito, cabeça e muita resenha.',
  volei: 'Dupla, rede alta e areia quente.',
  beachtennis: 'Raquete na mão, diversão garantida.',
};
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { SPORT_LABELS, type Sport, type Court } from '@/lib/types';
import { PRICING, TIME_SLOTS, DURATIONS, ARENA, whatsappLink } from '@/lib/constants';
import { WaveDivider } from './WaveDivider';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const STEPS = ['Modalidade', 'Quadra', 'Data e horário', 'Duração', 'Seus dados'];

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Só para mostrar ao cliente: o valor que vale é calculado no servidor (create_reservation)
function getPriceForSlot(date: Date, time: string | null, duration: number): number {
  const day = date.getDay();
  const hour = time ? parseInt(time.split(':')[0]) : 0;
  const isWeekend = day === 0 || day === 6;
  const isNight = hour >= 18;

  let base;
  if (isWeekend) base = PRICING.courtWeekend;
  else if (isNight) base = PRICING.courtNight;
  else base = PRICING.courtDay;

  return base * duration;
}

type BusySlot = { court_id: number | null; start_time: string; end_time: string };

type Conflict = { time: string; courtName: string; freeCourts: Court[]; nextTimes: string[] };

/** A quadra está livre entre start e end (minutos)? Bloqueio sem quadra vale para todas. */
const isCourtFree = (busy: BusySlot[], courtId: number, start: number, end: number) =>
  !busy.some((b) => (b.court_id === null || b.court_id === courtId) && start < toMin(b.end_time) && toMin(b.start_time) < end);

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

// Data local em YYYY-MM-DD (toISOString usa UTC e pode mudar o dia)
const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export default function Reserva() {
  const [step, setStep] = useState(0);
  const [sport, setSport] = useState<Sport | null>(null);
  const [courtId, setCourtId] = useState<number | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(1);
  const [numPlayers, setNumPlayers] = useState(2);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'arena'>('pix');
  const [reservations, setReservations] = useState<BusySlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date());
  const [conflict, setConflict] = useState<Conflict | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('courts').select('*').eq('active', true).order('id');
      if (data) setCourts(data as Court[]);
    })();
  }, []);

  // Horários ocupados (reservas + bloqueios), sem expor dados dos clientes
  const fetchBusySlots = useCallback(async (date: Date) => {
    const { data } = await supabase.rpc('get_busy_slots', { p_date: toDateStr(date) });
    return (data ?? []) as BusySlot[];
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    fetchBusySlots(selectedDate).then(setReservations);
  }, [selectedDate, fetchBusySlots]);

  const takenSlots = useMemo(() => {
    const taken = new Set<string>();
    if (courtId === null) return taken;
    for (const slot of TIME_SLOTS) {
      const s = toMin(slot);
      if (!isCourtFree(reservations, courtId, s, s + 60)) taken.add(slot);
    }
    return taken;
  }, [reservations, courtId]);

  const isSlotTaken = (time: string) => takenSlots.has(time);

  // Horário ocupado: mostra outras quadras livres no mesmo horário e próximos horários livres desta quadra
  const buildConflict = (busy: BusySlot[], time: string, hours: number): Conflict => {
    const start = toMin(time);
    const end = start + hours * 60;
    return {
      time,
      courtName: courts.find((c) => c.id === courtId)?.name ?? 'quadra',
      freeCourts: courts.filter((c) => c.id !== courtId && isCourtFree(busy, c.id, start, end)),
      nextTimes:
        courtId === null
          ? []
          : TIME_SLOTS.filter((t) => toMin(t) > start && isCourtFree(busy, courtId, toMin(t), toMin(t) + hours * 60)).slice(0, 4),
    };
  };

  const pickSlot = (time: string) => {
    if (isSlotTaken(time)) {
      setSelectedTime(null);
      setConflict(buildConflict(reservations, time, 1));
    } else {
      setSelectedTime(time);
      setConflict(null);
    }
  };

  const switchCourt = (id: number, time: string) => {
    setCourtId(id);
    setSelectedTime(time);
    setConflict(null);
    setError(null);
  };

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [viewMonth]);

  const [confirmedPrice, setConfirmedPrice] = useState<number | null>(null);
  const totalPrice = confirmedPrice ?? (selectedDate ? getPriceForSlot(selectedDate, selectedTime, duration) : 0);

  const canProceed = (): boolean => {
    if (step === 0) return sport !== null;
    if (step === 1) return courtId !== null;
    if (step === 2) return selectedDate !== null && selectedTime !== null;
    if (step === 3) return duration > 0;
    if (step === 4) return name.trim() !== '' && phone.trim() !== '' && email.trim() !== '';
    return false;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !sport || courtId === null) return;
    setSubmitting(true);
    setError(null);

    const dateStr = toDateStr(selectedDate);

    // Confere de novo antes de salvar, considerando a duração escolhida
    const busy = await fetchBusySlots(selectedDate);
    const start = toMin(selectedTime);
    const end = start + duration * 60;
    const existing = !isCourtFree(busy, courtId, start, end);

    if (existing) {
      // Alguém reservou enquanto a pessoa preenchia: volta para o horário com as alternativas
      setReservations(busy);
      setConflict(buildConflict(busy, selectedTime, duration));
      setSelectedTime(null);
      setSubmitting(false);
      setStep(2);
      return;
    }

    // O servidor valida os dados, confere o horário, limita abusos e calcula o preço
    const { data, error: rpcError } = await supabase.rpc('create_reservation', {
      p_court_id: courtId,
      p_sport: sport,
      p_date: dateStr,
      p_start_time: selectedTime,
      p_duration: duration,
      p_num_players: numPlayers,
      p_name: name,
      p_phone: phone,
      p_email: email,
      p_payment_method: paymentMethod,
    });

    if (rpcError) {
      if (rpcError.message === 'HORARIO_OCUPADO') {
        const fresh = await fetchBusySlots(selectedDate);
        setReservations(fresh);
        setConflict(buildConflict(fresh, selectedTime, duration));
        setSelectedTime(null);
        setStep(2);
      } else {
        // Mensagens de validação vêm prontas do servidor (P0001); o resto vira mensagem genérica
        setError(
          rpcError.code === 'P0001'
            ? rpcError.message
            : 'Não foi possível concluir a reserva. Tente novamente ou chame a gente no WhatsApp.'
        );
      }
      setSubmitting(false);
      return;
    }

    setConfirmedPrice(Number((data as { total_price: number }).total_price));
    setSuccess(true);
    setSubmitting(false);
  };

  const resetForm = () => {
    setConflict(null);
    setConfirmedPrice(null);
    setStep(0);
    setSport(null);
    setCourtId(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setDuration(1);
    setNumPlayers(2);
    setName('');
    setPhone('');
    setEmail('');
    setSuccess(false);
    setError(null);
  };

  const monthLabel = viewMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const courtName = courts.find((c) => c.id === courtId)?.name || '';

  if (success) {
    const endMin = toMin(selectedTime!) + duration * 60;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
    const msg = [
      'Oi! Vim pelo site da Arena Manaus 👋',
      '',
      '*Meu agendamento:*',
      `• Nome: ${name}`,
      `• Modalidade: ${SPORT_LABELS[sport!]}`,
      `• Quadra: ${courtName}`,
      `• Data: ${selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}`,
      `• Horário: ${selectedTime} às ${endTime}`,
      `• Jogadores: ${numPlayers}`,
      `• Valor: ${formatPrice(totalPrice)}`,
      `• Pagamento: ${paymentMethod === 'pix' ? 'Pix' : 'Na arena'}`,
    ].join('\n');
    return (
      <section id="reserva" className="bg-ink py-16 md:py-24 relative">
        <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-lime mx-auto flex items-center justify-center mb-6">
            <Check size={40} className="text-ink" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-lime uppercase mb-4">
            Reserva confirmada!
          </h2>
          <p className="font-body text-foam/80 text-lg mb-2">
            {SPORT_LABELS[sport!]} · {courtName}
          </p>
          <p className="font-body text-foam/60 text-base mb-2">
            {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {selectedTime} · {duration}h
          </p>
          <p className="font-body text-lime text-2xl font-bold mb-8">
            {formatPrice(totalPrice)}
          </p>
          <p className="font-body text-foam/70 mb-8">
            Sua reserva foi salva. Confirme pelo WhatsApp pra receber os detalhes e o QR Code do Pix.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={whatsappLink(msg)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-lime hover:bg-lime-dark text-ink font-body font-bold px-8 py-4 rounded-full transition-colors"
            >
              Confirmar no WhatsApp
            </a>
            <button
              onClick={resetForm}
              className="border-2 border-foam/30 hover:border-foam text-foam font-body font-bold px-8 py-4 rounded-full transition-colors"
            >
              Fazer outra reserva
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="reserva" className="bg-ink net-pattern py-16 md:py-24 relative">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="text-center mb-10">
          <p className="font-marker text-lime text-lg mb-2">reserva de quadra</p>
          <h2 className="font-display text-4xl md:text-6xl text-foam uppercase">
            Garante seu horário
          </h2>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-body font-medium transition-colors ${
                  i === step
                    ? 'bg-lime text-ink'
                    : i < step
                    ? 'bg-lime/20 text-lime'
                    : 'bg-foam/10 text-foam/40'
                }`}
              >
                <span className="font-bold">{i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={16} className="text-foam/30" />}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-sunset/20 border border-sunset text-foam rounded-lg p-4 mb-6 font-body text-sm">
            {error}
          </div>
        )}

        <div className="bg-foam rounded-2xl p-6 md:p-8 shadow-2xl">
          {/* Step 0: Sport */}
          {step === 0 && (
            <div>
              <h3 className="font-display text-2xl text-ink uppercase mb-6">Escolha a modalidade</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(Object.keys(SPORT_LABELS) as Sport[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSport(s); setStep(1); }}
                    className={`p-6 rounded-xl border-2 transition-all text-center lift ${
                      sport === s ? 'border-lime bg-lime/10' : 'border-sand-dark/30 hover:border-lime/50'
                    }`}
                  >
                    <div className="font-display text-xl text-ink uppercase">{SPORT_LABELS[s]}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Court */}
          {step === 1 && (
            <div>
              <h3 className="font-display text-2xl text-ink uppercase mb-6">Escolha a quadra</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {courts.map((court) => (
                  <button
                    key={court.id}
                    onClick={() => { setCourtId(court.id); setSelectedTime(null); setConflict(null); setStep(2); }}
                    className={`p-6 rounded-xl border-2 transition-all text-center lift ${
                      courtId === court.id ? 'border-lime bg-lime/10' : 'border-sand-dark/30 hover:border-lime/50'
                    }`}
                  >
                    <div className="font-display text-2xl text-ink uppercase">{court.name}</div>
                    <div className="font-body text-sm text-ink/50 mt-1">{SPORT_LABELS[court.sport as Sport] || court.sport}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(0)} className="mt-6 font-body text-sm text-sea flex items-center gap-1">
                <ChevronLeft size={16} /> Voltar
              </button>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div>
              <h3 className="font-display text-2xl text-ink uppercase mb-6">Data e horário</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Calendar */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className="p-2 hover:bg-sand rounded-lg">
                      <ChevronLeft size={20} className="text-ink" />
                    </button>
                    <span className="font-body font-bold text-ink capitalize">{monthLabel}</span>
                    <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className="p-2 hover:bg-sand rounded-lg">
                      <ChevronRight size={20} className="text-ink" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                      <div key={i} className="font-body text-xs text-ink/40 font-bold py-2">{d}</div>
                    ))}
                    {calendarDays.map((date, i) => (
                      <div key={i}>
                        {date && (
                          <button
                            disabled={isDateDisabled(date)}
                            onClick={() => { setSelectedDate(date); setSelectedTime(null); setConflict(null); setLoading(true); setTimeout(() => setLoading(false), 200); }}
                            className={`cal-day w-9 h-9 rounded-lg font-body text-sm font-medium ${
                              selectedDate?.toDateString() === date.toDateString()
                                ? 'bg-lime text-ink font-bold'
                                : isDateDisabled(date)
                                ? 'text-ink/20 cursor-not-allowed cal-disabled'
                                : 'text-ink hover:bg-sand'
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time slots */}
                <div>
                  <p className="font-body text-sm text-ink/60 mb-3">
                    {selectedDate ? `Horários para ${formatDateBR(selectedDate)}` : 'Escolha uma data primeiro'}
                  </p>
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="animate-spin text-sea" size={24} />
                    </div>
                  ) : selectedDate ? (
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto no-scrollbar">
                      {TIME_SLOTS.map((time) => {
                        const taken = isSlotTaken(time);
                        const hour = parseInt(time.split(':')[0]);
                        const isLastSlot = !taken && hour >= 20;
                        return (
                          <button
                            key={time}
                            onClick={() => pickSlot(time)}
                            title={taken ? 'Horário ocupado nesta quadra: clique para ver outras quadras livres' : undefined}
                            className={`time-slot rounded-lg py-2 px-2 font-body text-sm font-bold text-center ${
                              selectedTime === time
                                ? 'bg-lime text-ink ring-2 ring-lime ring-offset-1'
                                : conflict?.time === time
                                ? 'bg-sunset/20 text-sunset ring-2 ring-sunset/60'
                                : taken
                                ? 'bg-ink/10 text-ink/35 line-through decoration-ink/30 hover:bg-ink/15'
                                : isLastSlot
                                ? 'bg-sunset/15 text-sunset hover:bg-sunset/25'
                                : 'bg-lime/10 text-sea-dark hover:bg-lime/20'
                            }`}
                          >
                            {time}
                            {taken && <span className="block text-[10px] font-medium no-underline">ocupado</span>}
                            {isLastSlot && !taken && ' 🔥'}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-ink/30 font-body text-sm">
                      Selecione uma data no calendário
                    </div>
                  )}
                </div>
              </div>

              {/* Horário ocupado: alternativas */}
              {conflict && selectedDate && (
                <div className="mt-6 rounded-xl border-2 border-sunset/40 bg-sunset/10 p-5" role="alert">
                  <p className="font-body font-bold text-ink">
                    Esse horário já está agendado na {conflict.courtName}.
                  </p>
                  <p className="font-body text-sm text-ink/70 mt-1">
                    {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} às{' '}
                    {conflict.time} a {conflict.courtName} já tem reserva.
                  </p>

                  {conflict.freeCourts.length > 0 ? (
                    <>
                      <p className="font-body text-sm font-bold text-ink mt-4 mb-2">
                        {conflict.freeCourts.length === 1 ? 'Essa quadra está livre' : 'Essas quadras estão livres'} às {conflict.time}:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {conflict.freeCourts.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => switchCourt(c.id, conflict.time)}
                            className="bg-lime hover:bg-lime-dark text-ink font-body font-bold text-sm px-4 py-2.5 rounded-full transition-colors"
                          >
                            Reservar {c.name}
                            <span className="font-normal text-ink/60"> · {SPORT_LABELS[c.sport as Sport] || c.sport}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="font-body text-sm text-ink/70 mt-4">Nenhuma outra quadra está livre às {conflict.time}.</p>
                  )}

                  {conflict.nextTimes.length > 0 && (
                    <>
                      <p className="font-body text-sm font-bold text-ink mt-4 mb-2">
                        Ou continue na {conflict.courtName} em outro horário:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {conflict.nextTimes.map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              setSelectedTime(t);
                              setConflict(null);
                            }}
                            className="bg-foam border border-ink/15 hover:border-lime text-ink font-body font-bold text-sm px-4 py-2 rounded-full transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {conflict.freeCourts.length === 0 && conflict.nextTimes.length === 0 && (
                    <p className="font-body text-sm text-ink/70 mt-2">Escolha outro dia no calendário.</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-6">
                <button onClick={() => setStep(1)} className="font-body text-sm text-sea flex items-center gap-1">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button
                  disabled={!canProceed()}
                  onClick={() => setStep(3)}
                  className="bg-lime hover:bg-lime-dark disabled:bg-ink/20 disabled:text-ink/40 text-ink font-body font-bold px-6 py-3 rounded-full transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Duration & Players */}
          {step === 3 && (
            <div>
              <h3 className="font-display text-2xl text-ink uppercase mb-6">Duração e jogadores</h3>
              <div className="space-y-6">
                <div>
                  <label className="font-body text-sm text-ink/60 font-bold block mb-3">Duração</label>
                  <div className="grid grid-cols-3 gap-3">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.hours}
                        onClick={() => setDuration(d.hours)}
                        className={`py-3 rounded-xl font-body font-bold transition-all ${
                          duration === d.hours ? 'bg-lime text-ink' : 'bg-sand text-ink/60 hover:bg-sand-burnt'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-body text-sm text-ink/60 font-bold block mb-3">Nº de jogadores</label>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setNumPlayers(Math.max(1, numPlayers - 1))} className="w-10 h-10 rounded-full bg-sand text-ink font-bold text-xl hover:bg-sand-burnt">−</button>
                    <span className="font-display text-3xl text-ink w-12 text-center">{numPlayers}</span>
                    <button onClick={() => setNumPlayers(Math.min(10, numPlayers + 1))} className="w-10 h-10 rounded-full bg-sand text-ink font-bold text-xl hover:bg-sand-burnt">+</button>
                  </div>
                </div>
                <div className="bg-sand rounded-xl p-4 flex items-center justify-between">
                  <span className="font-body text-ink/60">Valor total</span>
                  <span className="font-display text-3xl text-lime-dark">{formatPrice(totalPrice)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-6">
                <button onClick={() => setStep(2)} className="font-body text-sm text-sea flex items-center gap-1">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="bg-lime hover:bg-lime-dark text-ink font-body font-bold px-6 py-3 rounded-full transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Contact + Summary */}
          {step === 4 && (
            <div>
              <h3 className="font-display text-2xl text-ink uppercase mb-6">Seus dados e pagamento</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="font-body text-sm text-ink/60 font-bold block mb-1">Nome completo</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-sand rounded-lg px-4 py-3 font-body text-ink outline-none focus:ring-2 ring-lime"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="font-body text-sm text-ink/60 font-bold block mb-1">WhatsApp</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-sand rounded-lg px-4 py-3 font-body text-ink outline-none focus:ring-2 ring-lime"
                      placeholder="(48) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="font-body text-sm text-ink/60 font-bold block mb-1">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-sand rounded-lg px-4 py-3 font-body text-ink outline-none focus:ring-2 ring-lime"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <label className="font-body text-sm text-ink/60 font-bold block mb-2">Pagamento</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod('pix')}
                        className={`py-3 rounded-xl font-body font-bold transition-all ${paymentMethod === 'pix' ? 'bg-lime text-ink' : 'bg-sand text-ink/60'}`}
                      >
                        Pix (QR Code)
                      </button>
                      <button
                        onClick={() => setPaymentMethod('arena')}
                        className={`py-3 rounded-xl font-body font-bold transition-all ${paymentMethod === 'arena' ? 'bg-lime text-ink' : 'bg-sand text-ink/60'}`}
                      >
                        Pagar na arena
                      </button>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-sand rounded-xl p-5 h-fit">
                  <h4 className="font-display text-lg text-ink uppercase mb-4">Resumo</h4>
                  <dl className="space-y-2 font-body text-sm">
                    <div className="flex justify-between"><dt className="text-ink/50">Modalidade</dt><dd className="text-ink font-bold">{SPORT_LABELS[sport!]}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink/50">Quadra</dt><dd className="text-ink font-bold">{courtName}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink/50">Data</dt><dd className="text-ink font-bold">{selectedDate?.toLocaleDateString('pt-BR')}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink/50">Horário</dt><dd className="text-ink font-bold">{selectedTime}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink/50">Duração</dt><dd className="text-ink font-bold">{duration}h</dd></div>
                    <div className="flex justify-between"><dt className="text-ink/50">Jogadores</dt><dd className="text-ink font-bold">{numPlayers}</dd></div>
                    <div className="border-t border-ink/10 pt-3 flex justify-between items-center mt-3">
                      <dt className="text-ink/60 font-bold">Total</dt>
                      <dd className="font-display text-2xl text-lime-dark">{formatPrice(totalPrice)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 pt-4 border-t border-ink/10 space-y-2">
                    <p className="font-body text-xs text-ink/50">📌 {ARENA.cancelPolicy}</p>
                    <p className="font-body text-xs text-ink/50">⏰ {ARENA.latePolicy}</p>
                    <p className="font-body text-xs text-ink/50">🌧️ {ARENA.rainPolicy}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6">
                <button onClick={() => setStep(3)} className="font-body text-sm text-sea flex items-center gap-1">
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button
                  disabled={!canProceed() || submitting}
                  onClick={handleSubmit}
                  className="bg-lime hover:bg-lime-dark disabled:bg-ink/20 text-ink font-body font-bold px-8 py-3 rounded-full transition-colors flex items-center gap-2"
                >
                  {submitting ? <><Loader2 size={18} className="animate-spin" /> Confirmando...</> : 'Confirmar reserva'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <WaveDivider color="#F4E9D8" />
    </section>
  );
}
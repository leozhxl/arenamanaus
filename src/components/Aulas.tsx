import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LESSON_PRICING, whatsappLink } from '@/lib/constants';
import { SPORT_LABELS, type Sport } from '@/lib/types';
import { Loader2, Check } from 'lucide-react';

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TURMAS = ['Iniciante', 'Intermediário', 'Avançado', 'Kids', 'Feminino'];

const GRADE = [
  { day: 'Segunda', futevolei: '18h - 19h', volei: '19h - 20h', beachtennis: '—' },
  { day: 'Terça', futevolei: '—', volei: '18h - 19h', beachtennis: '20h - 21h' },
  { day: 'Quarta', futevolei: '18h - 19h', volei: '—', beachtennis: '19h - 20h' },
  { day: 'Quinta', futevolei: '19h - 20h', volei: '18h - 19h', beachtennis: '—' },
  { day: 'Sexta', futevolei: '18h - 19h', volei: '19h - 20h', beachtennis: '20h - 21h' },
  { day: 'Sábado', futevolei: '10h - 11h', volei: '—', beachtennis: '11h - 12h' },
];

const PLANS = [
  { label: '1x/semana', price: LESSON_PRICING.onceWeek },
  { label: '2x/semana', price: LESSON_PRICING.twiceWeek },
  { label: '3x/semana', price: LESSON_PRICING.thriceWeek, highlight: true },
  { label: 'Aula avulsa', price: LESSON_PRICING.single },
];

const TO_BRING = ['Roupa leve e confortável', 'Protetor solar', 'Garrafinha de água', 'Viseira ou boné'];

export default function Aulas() {
  const [form, setForm] = useState({
    sport: '' as Sport | '',
    level: '',
    day: '',
    time: '',
    name: '',
    phone: '',
    email: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trialMessage = () =>
    [
      'Oi! Vim pelo site da Arena Manaus 👋',
      '',
      '*Quero agendar uma aula experimental:*',
      `• Nome: ${form.name}`,
      `• Modalidade: ${form.sport ? SPORT_LABELS[form.sport] : ''}`,
      `• Nível: ${form.level}`,
      form.day ? `• Melhor dia: ${form.day}` : null,
      form.time ? `• Melhor horário: ${form.time}` : null,
      `• WhatsApp: ${form.phone}`,
      form.email ? `• E-mail: ${form.email}` : null,
    ]
      .filter((line) => line !== null)
      .join('\n');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    // Abre a aba já no clique para o navegador não bloquear como pop-up
    const whatsappTab = window.open('', '_blank');

    // O servidor valida os dados e limita pedidos repetidos (anti-spam)
    const { error: dbError } = await supabase.rpc('request_trial_class', {
      p_sport: form.sport,
      p_level: form.level,
      p_day: form.day,
      p_time: form.time,
      p_name: form.name,
      p_phone: form.phone,
      p_email: form.email,
    });
    setSubmitting(false);

    if (dbError) {
      console.error('Erro ao salvar aula experimental:', dbError);
      whatsappTab?.close();
      setError(
        dbError.code === 'P0001'
          ? dbError.message
          : 'Não conseguimos registrar seu pedido agora. Tente de novo ou chame a gente direto no WhatsApp.'
      );
      return;
    }

    // Avisa a arena pelo WhatsApp com os dados do pedido
    const link = whatsappLink(trialMessage());
    if (whatsappTab) whatsappTab.location.href = link;
    else window.location.href = link;
    setSubmitted(true);
  };

  const missing = [
    !form.sport && 'modalidade',
    !form.level && 'nível',
    !form.name.trim() && 'nome',
    !form.phone.trim() && 'WhatsApp',
  ].filter(Boolean);
  const canSubmit = missing.length === 0;

  return (
    <section id="aulas" className="bg-sand-burnt py-16 md:py-24 sand-texture">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <p className="font-marker text-sea text-lg mb-2">aulas e treinos</p>
          <h2 className="font-display text-4xl md:text-6xl text-ink uppercase">
            Do primeiro toque ao game
          </h2>
        </div>

        {/* Turmas */}
        <div className="mb-12">
          <h3 className="font-display text-xl text-ink uppercase mb-4">Turmas</h3>
          <div className="flex flex-wrap gap-3">
            {TURMAS.map((turma) => (
              <span key={turma} className="bg-foam border border-sand-dark/30 rounded-full px-5 py-2 font-body font-bold text-sm text-ink">
                {turma}
              </span>
            ))}
          </div>
        </div>

        {/* Grade semanal */}
        <div className="mb-12 overflow-x-auto">
          <h3 className="font-display text-xl text-ink uppercase mb-4">Grade semanal</h3>
          <table className="w-full bg-foam rounded-xl overflow-hidden text-sm min-w-[600px]">
            <thead>
              <tr className="bg-ink text-foam">
                <th className="text-left px-4 py-3 font-body font-bold">Dia</th>
                <th className="text-center px-4 py-3 font-body font-bold">Futevôlei</th>
                <th className="text-center px-4 py-3 font-body font-bold">Vôlei</th>
                <th className="text-center px-4 py-3 font-body font-bold">Beach Tênis</th>
              </tr>
            </thead>
            <tbody>
              {GRADE.map((row) => (
                <tr key={row.day} className="border-b border-sand-dark/20 last:border-0">
                  <td className="px-4 py-3 font-body font-bold text-ink">{row.day}</td>
                  <td className={`px-4 py-3 text-center font-body ${row.futevolei === '—' ? 'text-ink/30' : 'text-lime-dark font-bold'}`}>{row.futevolei}</td>
                  <td className={`px-4 py-3 text-center font-body ${row.volei === '—' ? 'text-ink/30' : 'text-sea font-bold'}`}>{row.volei}</td>
                  <td className={`px-4 py-3 text-center font-body ${row.beachtennis === '—' ? 'text-ink/30' : 'text-sunset font-bold'}`}>{row.beachtennis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Plans */}
        <div className="mb-12">
          <h3 className="font-display text-xl text-ink uppercase mb-4">Planos de aula</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.label}
                className={`rounded-xl p-5 text-center border-2 lift ${
                  plan.highlight ? 'bg-lime border-lime-dark' : 'bg-foam border-sand-dark/20'
                }`}
              >
                {plan.highlight && (
                  <span className="block font-body font-bold text-xs text-sunset mb-1">MAIS ESCOLHIDO</span>
                )}
                <p className="font-body text-sm text-ink/70">{plan.label}</p>
                <p className="font-display text-2xl text-ink mt-1">{formatPrice(plan.price)}</p>
                <p className="font-body text-xs text-ink/40">por mês</p>
              </div>
            ))}
          </div>
          <p className="font-body text-sm text-ink/50 mt-4 text-center">
            Aula particular ou em dupla: <strong className="text-ink">{formatPrice(LESSON_PRICING.private)}</strong>
          </p>
        </div>

        {/* Trial class form */}
        <div id="aula-experimental" className="bg-foam rounded-2xl p-6 md:p-8 shadow-lg">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-lime mx-auto flex items-center justify-center mb-4">
                <Check size={32} className="text-ink" />
              </div>
              <h3 className="font-display text-2xl text-ink uppercase mb-2">Pedido enviado!</h3>
              <p className="font-body text-ink/60">
                Abrimos o WhatsApp com seus dados — é só enviar a mensagem. A gente responde pra confirmar sua aula
                experimental.
              </p>
              <a
                href={whatsappLink(trialMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 bg-lime hover:bg-lime-dark text-ink font-body font-bold px-6 py-3 rounded-full transition-colors"
              >
                O WhatsApp não abriu? Clique aqui
              </a>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-6 font-body text-sm text-sea font-bold underline"
              >
                Enviar outro pedido
              </button>
            </div>
          ) : (
            <>
              <h3 className="font-display text-2xl text-ink uppercase mb-2">Agendar aula experimental</h3>
              <p className="font-body text-sm text-ink/50 mb-6">Quer conhecer antes de fechar um plano? Só preenche que a gente chama.</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-sm text-ink/60 font-bold block mb-1">Modalidade</label>
                  <select
                    value={form.sport}
                    onChange={(e) => setForm({ ...form, sport: e.target.value as Sport })}
                    className="w-full bg-sand rounded-lg px-4 py-3 font-body text-ink outline-none focus:ring-2 ring-lime"
                  >
                    <option value="">Escolher...</option>
                    {(Object.keys(SPORT_LABELS) as Sport[]).map((s) => (
                      <option key={s} value={s}>{SPORT_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-body text-sm text-ink/60 font-bold block mb-1">Nível</label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value })}
                    className="w-full bg-sand rounded-lg px-4 py-3 font-body text-ink outline-none focus:ring-2 ring-lime"
                  >
                    <option value="">Escolher...</option>
                    {TURMAS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-body text-sm text-ink/60 font-bold block mb-1">Melhor dia</label>
                  <select
                    value={form.day}
                    onChange={(e) => setForm({ ...form, day: e.target.value })}
                    className="w-full bg-sand rounded-lg px-4 py-3 font-body text-ink outline-none focus:ring-2 ring-lime"
                  >
                    <option value="">Escolher...</option>
                    {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-body text-sm text-ink/60 font-bold block mb-1">Melhor horário</label>
                  <select
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full bg-sand rounded-lg px-4 py-3 font-body text-ink outline-none focus:ring-2 ring-lime"
                  >
                    <option value="">Escolher...</option>
                    {['Manhã', 'Tarde', 'Noite'].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-body text-sm text-ink/60 font-bold block mb-1">Nome</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-sand rounded-lg px-4 py-3 font-body text-ink outline-none focus:ring-2 ring-lime" placeholder="Seu nome" />
                </div>
                <div>
                  <label className="font-body text-sm text-ink/60 font-bold block mb-1">WhatsApp</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-sand rounded-lg px-4 py-3 font-body text-ink outline-none focus:ring-2 ring-lime" placeholder="(48) 99999-9999" />
                </div>
                <div className="md:col-span-2">
                  <label className="font-body text-sm text-ink/60 font-bold block mb-1">
                    E-mail <span className="font-normal text-ink/40">(opcional)</span>
                  </label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-sand rounded-lg px-4 py-3 font-body text-ink outline-none focus:ring-2 ring-lime" placeholder="seu@email.com" />
                </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="mt-6 w-full bg-lime hover:bg-lime-dark disabled:bg-ink/20 text-ink font-body font-bold py-4 rounded-full transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : 'Agendar aula experimental'}
              </button>
              {error ? (
                <p className="mt-3 text-center font-body text-sm text-red-600">
                  {error}{' '}
                  <a href={whatsappLink(trialMessage())} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                    Chamar no WhatsApp
                  </a>
                </p>
              ) : (
                !canSubmit && (
                  <p className="mt-3 text-center font-body text-xs text-ink/50">Falta preencher: {missing.join(', ')}</p>
                )
              )}
            </>
          )}
        </div>

        {/* What to bring */}
        <div className="mt-8 bg-ink rounded-xl p-6">
          <h3 className="font-display text-lg text-lime uppercase mb-4">O que levar</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TO_BRING.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="text-lime">✓</span>
                <span className="font-body text-sm text-foam/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
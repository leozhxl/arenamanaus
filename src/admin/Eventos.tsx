import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { EVENT_TYPES, type ArenaEvent } from '@/lib/types';
import { formatDateLong, toDateStr } from './lib';
import { useDataChanged } from './realtime';
import { Button, Card, ErrorText, Field, Modal, PageHeader, Spinner, inputCls } from './ui';

const BUCKET = 'event-images';
const MAX_MB = 5;

type EventRow = ArenaEvent & { published: boolean };

export default function Eventos() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EventRow | 'new' | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    setEvents((data ?? []) as EventRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useDataChanged(load);

  const today = toDateStr(new Date());
  const upcoming = events.filter((e) => e.date >= today);
  const past = events.filter((e) => e.date < today).reverse();

  const togglePublished = async (e: EventRow) => {
    setEvents((all) => all.map((x) => (x.id === e.id ? { ...x, published: !e.published } : x)));
    await supabase.from('events').update({ published: !e.published }).eq('id', e.id);
  };

  const remove = async (e: EventRow) => {
    if (!confirm(`Excluir "${e.title}"? Ele some do site.`)) return;
    await supabase.from('events').delete().eq('id', e.id);
    if (e.image_url) await removeImage(e.image_url);
    load();
  };

  const card = (e: EventRow, isPast = false) => (
    <Card key={e.id} className={`flex flex-col overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
      {e.image_url ? (
        <img src={e.image_url} alt="" className="block h-auto max-h-80 w-full bg-ink object-contain" />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-sand text-xs text-ink/40">Sem foto</div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-lime/30 px-2 py-0.5 text-[11px] font-bold uppercase text-ink">{EVENT_TYPES[e.type] ?? e.type}</span>
          {!e.published && <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-bold uppercase text-ink/60">Rascunho</span>}
        </div>
        <h3 className="mt-2 font-display text-lg uppercase leading-tight">{e.title}</h3>
        <p className="mt-1 text-sm text-ink/60 first-letter:uppercase">{formatDateLong(e.date)}</p>
        {e.description && <p className="mt-2 line-clamp-3 text-sm text-ink/70">{e.description}</p>}
        <div className="mt-auto flex items-center gap-1 pt-4">
          <Button variant="ghost" className="px-3" onClick={() => setEditing(e)}>
            <Pencil size={14} /> Editar
          </Button>
          {!isPast && (
            <Button variant="ghost" className="px-3" onClick={() => togglePublished(e)} title={e.published ? 'Esconder do site' : 'Publicar no site'}>
              {e.published ? <EyeOff size={14} /> : <Eye size={14} />}
              {e.published ? 'Esconder' : 'Publicar'}
            </Button>
          )}
          <button onClick={() => remove(e)} className="ml-auto p-2 text-ink/30 hover:text-red-600" aria-label="Excluir evento">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="Eventos"
        subtitle="Torneios, day use, aulões, promoções e avisos. Os próximos aparecem no site na seção “Tem sempre rolê”."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} /> Novo evento
          </Button>
        }
      />

      {loading ? (
        <Spinner />
      ) : (
        <>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink/40">Próximos ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <Card className="mb-8 p-10 text-center text-sm text-ink/50">
              Nenhum evento futuro. Clique em <strong>Novo evento</strong> para publicar no site.
            </Card>
          ) : (
            <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{upcoming.map((e) => card(e))}</div>
          )}

          {past.length > 0 && (
            <>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink/40">Já aconteceram ({past.length})</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{past.map((e) => card(e, true))}</div>
            </>
          )}
        </>
      )}

      {editing && (
        <EventModal
          event={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

async function removeImage(url: string) {
  const path = url.split(`/${BUCKET}/`)[1];
  if (path) await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]);
}

function EventModal({ event, onClose, onSaved }: { event: EventRow | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: event?.title ?? '',
    type: event?.type ?? 'torneio',
    date: event?.date ?? '',
    description: event?.description ?? '',
    image_url: event?.image_url ?? '',
    published: event?.published ?? true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return setError('Use uma foto JPG, PNG ou WEBP.');
    if (f.size > MAX_MB * 1024 * 1024) return setError(`A foto passa de ${MAX_MB} MB. Use uma menor.`);
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearImage = () => {
    setFile(null);
    setPreview(null);
    setForm((f) => ({ ...f, image_url: '' }));
  };

  const save = async () => {
    if (!form.title.trim()) return setError('Dê um título para o evento.');
    if (!form.date) return setError('Escolha a data.');
    setSaving(true);
    setError(null);

    let imageUrl = form.image_url || null;
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (upError) {
        console.error(upError);
        setSaving(false);
        return setError('Não foi possível enviar a foto. Confira se o SQL de eventos foi rodado no Supabase.');
      }
      imageUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      title: form.title.trim(),
      type: form.type,
      date: form.date,
      description: form.description.trim() || null,
      image_url: imageUrl,
      published: form.published,
    };
    const { error: dbError } = event
      ? await supabase.from('events').update(payload).eq('id', event.id)
      : await supabase.from('events').insert(payload);

    if (dbError) {
      console.error(dbError);
      setSaving(false);
      return setError('Não foi possível salvar o evento.');
    }
    // Foto antiga trocada ou removida: apaga do armazenamento
    if (event?.image_url && event.image_url !== imageUrl) await removeImage(event.image_url);
    setSaving(false);
    onSaved();
  };

  const shownImage = preview ?? (form.image_url || null);

  return (
    <Modal
      title={event ? 'Editar evento' : 'Novo evento'}
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={save} loading={saving}>
            {form.published ? (event ? 'Salvar e publicar' : 'Publicar no site') : 'Salvar rascunho'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          <Field label="Título *">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex.: Torneio de Futevôlei — Duplas Mistas"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                {Object.entries(EVENT_TYPES).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Data *">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="Descrição">
            <textarea
              rows={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={'Horário, valor da inscrição, premiação, regras...\nPode quebrar linha.'}
              className={inputCls}
            />
          </Field>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="h-4 w-4 accent-lime-dark"
            />
            Mostrar no site
            <span className="font-normal text-ink/50">(desmarque para salvar como rascunho)</span>
          </label>
        </div>

        {/* Foto */}
        <div>
          <span className="mb-1 block text-xs font-semibold text-ink/60">Foto (opcional)</span>
          {shownImage ? (
            <div className="relative overflow-hidden rounded-xl border border-ink/10">
              <img src={shownImage} alt="" className="block h-auto max-h-96 w-full bg-ink object-contain" />
              <button
                onClick={clearImage}
                className="absolute right-2 top-2 rounded-full bg-ink/70 p-1.5 text-foam hover:bg-ink"
                aria-label="Remover foto"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files[0]);
              }}
              className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/20 bg-white text-sm text-ink/50 hover:border-lime-dark hover:text-ink"
            >
              <ImagePlus size={24} />
              Clique ou arraste a foto
            </button>
          )}
          {shownImage && (
            <button onClick={() => fileInput.current?.click()} className="mt-2 text-xs font-semibold text-sea hover:text-sea-dark">
              Trocar foto
            </button>
          )}
          <p className="mt-2 text-xs text-ink/40">JPG, PNG ou WEBP até {MAX_MB} MB. A imagem aparece inteira no site, sem cortes.</p>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      {error && (
        <div className="mt-4">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </Modal>
  );
}

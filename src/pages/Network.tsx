import { useMemo, useState } from 'react';
import { useDebts, usePayments, usePersons, useSettings } from '../hooks/useData';
import { getNetEdges } from '../services/debtLogic';
import { formatCurrency } from '../utils/format';
import { Card, EmptyState } from '../components/ui';
import { usePageLoading } from '../hooks/usePageLoading';
import { NetworkSkeleton } from '../components/Skeleton';

type Tone = 'owe' | 'receive' | 'neutral';

// owe     = saya berhutang kepada orang lain (panah keluar dari "Saya")
// receive = orang lain berhutang kepada saya (panah masuk ke "Saya")
// neutral = hubungan antar orang lain
const TONES: Record<Tone, { stroke: string; labelText: string; listText: string }> = {
  owe: {
    stroke: '#ef4444',
    labelText: 'fill-red-600 [.dark_&]:fill-red-300',
    listText: 'text-red-600',
  },
  receive: {
    stroke: '#10b981',
    labelText: 'fill-emerald-600 [.dark_&]:fill-emerald-300',
    listText: 'text-emerald-600',
  },
  neutral: {
    stroke: '#818cf8',
    labelText: 'fill-indigo-700 [.dark_&]:fill-indigo-300',
    listText: 'text-slate-700',
  },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function shorten(name: string, max = 12): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

export function Network() {
  const debts = useDebts();
  const payments = usePayments();
  const persons = usePersons(); // hanya orang yang belum dihapus
  const settings = useSettings();
  const me = settings.myPersonId;
  const loading = usePageLoading(['persons', 'debts', 'payments', 'settings']);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const nameById = useMemo(() => new Map(persons.map((p) => [p.id, p.name])), [persons]);
  const nameOf = (id: string) => nameById.get(id) ?? '—';

  // Semua hubungan net, lalu buang yang melibatkan orang yang sudah dihapus.
  const { edges, hiddenCount } = useMemo(() => {
    const all = getNetEdges(debts, payments);
    const visible = all
      .filter((e) => e.amount > 0 && nameById.has(e.fromId) && nameById.has(e.toId))
      .map((e) => ({ fromId: e.fromId, toId: e.toId, amount: e.amount }))
      .sort((a, b) => b.amount - a.amount);
    return { edges: visible, hiddenCount: all.length - visible.length };
  }, [debts, payments, nameById]);

  // Node dikunci dengan ID (bukan nama), jadi dua orang bernama sama tidak tergabung.
  const nodeIds = useMemo(() => {
    const ids = new Set<string>();
    edges.forEach((e) => {
      ids.add(e.fromId);
      ids.add(e.toId);
    });
    return Array.from(ids);
  }, [edges]);

  const toneOf = (e: { fromId: string; toId: string }): Tone => {
    if (!me) return 'neutral';
    if (e.fromId === me) return 'owe';
    if (e.toId === me) return 'receive';
    return 'neutral';
  };

  const totals = useMemo(() => {
    const total = edges.reduce((s, e) => s + e.amount, 0);
    const iOwe = me ? edges.filter((e) => e.fromId === me).reduce((s, e) => s + e.amount, 0) : 0;
    const owedToMe = me ? edges.filter((e) => e.toId === me).reduce((s, e) => s + e.amount, 0) : 0;
    return { total, iOwe, owedToMe };
  }, [edges, me]);

  if (loading) return <NetworkSkeleton />;

  if (edges.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Jaringan</h2>
        <EmptyState
          title="Belum ada hubungan hutang"
          description={
            hiddenCount > 0
              ? 'Hubungan yang ada melibatkan orang yang sudah dihapus, jadi tidak ditampilkan.'
              : 'Tambahkan transaksi hutang untuk melihat jaringan.'
          }
        />
      </div>
    );
  }

  // Susun node melingkar — radius menyesuaikan jumlah node agar label tidak berdesakan.
  const nodeR = 26;
  const radius = Math.max(90, 55 + nodeIds.length * 26);
  const size = radius * 2 + 140;
  const center = size / 2;
  const positions = new Map<string, { x: number; y: number }>();
  nodeIds.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / nodeIds.length - Math.PI / 2;
    positions.set(id, {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    });
  });

  const isEdgeRelated = (e: { fromId: string; toId: string }) =>
    !selectedId || e.fromId === selectedId || e.toId === selectedId;

  const isNodeRelated = (id: string) =>
    !selectedId ||
    id === selectedId ||
    edges.some(
      (e) => (e.fromId === selectedId && e.toId === id) || (e.toId === selectedId && e.fromId === id)
    );

  const toggleSelect = (id: string) => setSelectedId((cur) => (cur === id ? null : id));

  const stats: { label: string; value: string; className?: string }[] = [
    { label: 'Orang', value: String(nodeIds.length) },
    { label: 'Hubungan', value: String(edges.length) },
  ];
  if (me) {
    stats.push(
      { label: 'Hutang saya', value: formatCurrency(totals.iOwe), className: 'text-red-600' },
      { label: 'Piutang saya', value: formatCurrency(totals.owedToMe), className: 'text-emerald-600' }
    );
  } else {
    stats.push({ label: 'Total nominal', value: formatCurrency(totals.total) });
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Jaringan</h2>
      <p className="text-sm text-slate-500">
        Arah panah: <span className="font-medium text-slate-700">yang berhutang → yang memberi hutang</span>. Nominal
        sudah dihitung net (kalau dua orang saling berhutang, otomatis dikliringkan jadi satu angka). Ketuk seseorang
        untuk menyorot hubungannya.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-3">
            <p className="text-[11px] text-slate-500">{s.label}</p>
            <p className={`text-sm font-bold mt-0.5 ${s.className ?? 'text-slate-800'}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {me ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 rounded bg-red-500" /> Saya berhutang
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 rounded bg-emerald-500" /> Piutang saya
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 rounded bg-indigo-400" /> Antar orang lain
            </span>
          </>
        ) : (
          <span>Pilih "Saya" di Settings agar hutang dan piutangmu diberi warna berbeda.</span>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full mx-auto" style={{ minWidth: 320, maxWidth: 480 }}>
          <defs>
            {(Object.keys(TONES) as Tone[]).map((tone) => (
              <marker
                key={tone}
                id={`arrow-${tone}`}
                markerWidth="9"
                markerHeight="9"
                refX="7.5"
                refY="4.5"
                orient="auto"
              >
                <path d="M0,0.5 L8,4.5 L0,8.5 Z" fill={TONES[tone].stroke} />
              </marker>
            ))}
          </defs>

          {/* Area kosong: ketuk untuk membatalkan sorotan */}
          <rect x={0} y={0} width={size} height={size} fill="transparent" onClick={() => setSelectedId(null)} />

          {edges.map((e, i) => {
            const a = positions.get(e.fromId)!;
            const b = positions.get(e.toId)!;
            const tone = toneOf(e);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const startX = a.x + ux * nodeR;
            const startY = a.y + uy * nodeR;
            const endX = b.x - ux * (nodeR + 9);
            const endY = b.y - uy * (nodeR + 9);

            // Variasikan posisi label agar tidak menumpuk di titik tengah saat banyak garis
            const t = edges.length > 3 ? (i % 2 === 0 ? 0.4 : 0.6) : 0.5;
            const labelX = startX + (endX - startX) * t;
            const labelY = startY + (endY - startY) * t;

            const label = formatCurrency(e.amount);
            const labelWidth = Math.max(46, label.length * 6.3 + 12);

            return (
              <g
                key={`${e.fromId}-${e.toId}`}
                opacity={isEdgeRelated(e) ? 1 : 0.15}
                style={{ transition: 'opacity 150ms' }}
                pointerEvents="none"
              >
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={TONES[tone].stroke}
                  strokeWidth={2}
                  markerEnd={`url(#arrow-${tone})`}
                />
                <rect
                  x={labelX - labelWidth / 2}
                  y={labelY - 10}
                  width={labelWidth}
                  height={20}
                  rx={10}
                  className="fill-white stroke-slate-200 [.dark_&]:fill-slate-800 [.dark_&]:stroke-slate-600"
                />
                <text
                  x={labelX}
                  y={labelY + 4}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight={600}
                  className={TONES[tone].labelText}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {nodeIds.map((id) => {
            const p = positions.get(id)!;
            const name = nameOf(id);
            const isMe = id === me;
            const isSelected = id === selectedId;
            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${name}${isMe ? ' (Saya)' : ''}`}
                opacity={isNodeRelated(id) ? 1 : 0.25}
                style={{ transition: 'opacity 150ms', cursor: 'pointer', outline: 'none' }}
                onClick={() => toggleSelect(id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    toggleSelect(id);
                  }
                }}
              >
                <title>{name}</title>
                {isSelected && (
                  <circle cx={p.x} cy={p.y} r={nodeR + 5} fill="none" stroke="#6366f1" strokeWidth={2} opacity={0.35} />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={nodeR}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  className={
                    isMe
                      ? 'fill-indigo-600 stroke-indigo-700'
                      : 'fill-indigo-50 stroke-indigo-500 [.dark_&]:fill-slate-800'
                  }
                />
                <text
                  x={p.x}
                  y={p.y + 5}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight={700}
                  className={isMe ? 'fill-white' : 'fill-indigo-700 [.dark_&]:fill-indigo-300'}
                >
                  {initials(name)}
                </text>
                <text
                  x={p.x}
                  y={p.y + nodeR + 15}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={500}
                  className="fill-slate-600 [.dark_&]:fill-slate-300"
                >
                  {shorten(name)}
                  {isMe ? ' (Saya)' : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {hiddenCount > 0 && (
        <p className="text-[11px] text-slate-400">
          {hiddenCount} hubungan tidak ditampilkan karena melibatkan orang yang sudah dihapus.
        </p>
      )}

      <div className="space-y-2">
        {edges.map((e) => {
          const tone = toneOf(e);
          return (
            <div
              key={`${e.fromId}-${e.toId}`}
              className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm transition-opacity"
              style={{ opacity: isEdgeRelated(e) ? 1 : 0.35 }}
            >
              <span className="text-slate-800 min-w-0 truncate">
                {nameOf(e.fromId)}
                {e.fromId === me && <span className="text-slate-400"> (Saya)</span>}{' '}
                <span className="text-indigo-500">→</span> {nameOf(e.toId)}
                {e.toId === me && <span className="text-slate-400"> (Saya)</span>}
              </span>
              <span className={`font-semibold shrink-0 ${TONES[tone].listText}`}>{formatCurrency(e.amount)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
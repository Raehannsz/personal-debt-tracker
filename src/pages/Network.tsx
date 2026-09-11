import { useMemo } from 'react';
import { useDebts, usePayments, usePersons } from '../hooks/useData';
import { getNetEdges } from '../services/debtLogic';
import { formatCurrency } from '../utils/format';
import { EmptyState } from '../components/ui';

export function Network() {
  const debts = useDebts();
  const payments = usePayments();
  const persons = usePersons();

  const personName = (id: string) => persons.find((p) => p.id === id)?.name ?? '—';

  const edges = useMemo(() => {
    return getNetEdges(debts, payments).map((e) => ({
      from: personName(e.fromId),
      to: personName(e.toId),
      amount: e.amount,
    }));
  }, [debts, payments, persons]);

  const nodeNames = useMemo(() => {
    const names = new Set<string>();
    edges.forEach((e) => {
      names.add(e.from);
      names.add(e.to);
    });
    return Array.from(names);
  }, [edges]);

  if (edges.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Jaringan</h2>
        <EmptyState title="Belum ada hubungan hutang" description="Tambahkan transaksi hutang untuk melihat jaringan." />
      </div>
    );
  }

  // Layout nodes in a circle — radius scales with node count so labels don't crowd.
  const nodeR = 26;
  const radius = Math.max(90, 55 + nodeNames.length * 26);
  const size = radius * 2 + 140;
  const center = size / 2;
  const positions = new Map<string, { x: number; y: number }>();
  nodeNames.forEach((name, i) => {
    const angle = (2 * Math.PI * i) / nodeNames.length - Math.PI / 2;
    positions.set(name, {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    });
  });

  function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Jaringan</h2>
      <p className="text-sm text-slate-500">
        Arah panah: <span className="font-medium text-slate-700">yang berhutang → yang memberi hutang</span>. Nominal
        sudah dihitung net (kalau dua orang saling berhutang, otomatis dikliringkan jadi satu angka).
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full mx-auto" style={{ minWidth: 320, maxWidth: 480 }}>
          <defs>
            <marker id="arrow" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto">
              <path d="M0,0.5 L8,4.5 L0,8.5 Z" fill="#4f46e5" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const a = positions.get(e.from)!;
            const b = positions.get(e.to)!;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const startX = a.x + ux * nodeR;
            const startY = a.y + uy * nodeR;
            const endX = b.x - ux * (nodeR + 9);
            const endY = b.y - uy * (nodeR + 9);
            const labelX = (startX + endX) / 2;
            const labelY = (startY + endY) / 2;

            const label = formatCurrency(e.amount);
            const labelWidth = Math.max(46, label.length * 6.3 + 12);

            return (
              <g key={i}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="#818cf8"
                  strokeWidth={2}
                  markerEnd="url(#arrow)"
                />
                <rect
                  x={labelX - labelWidth / 2}
                  y={labelY - 10}
                  width={labelWidth}
                  height={20}
                  rx={10}
                  fill="white"
                  stroke="#e2e8f0"
                />
                <text x={labelX} y={labelY + 4} textAnchor="middle" fontSize="10.5" fontWeight={600} fill="#4338ca">
                  {label}
                </text>
              </g>
            );
          })}
          {nodeNames.map((name) => {
            const p = positions.get(name)!;
            return (
              <g key={name}>
                <circle cx={p.x} cy={p.y} r={nodeR} fill="#eef2ff" stroke="#6366f1" strokeWidth={1.5} />
                <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="12" fontWeight={700} fill="#4338ca">
                  {initials(name)}
                </text>
                <text x={p.x} y={p.y + nodeR + 15} textAnchor="middle" fontSize="11" fontWeight={500} fill="#334155">
                  {name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="space-y-2">
        {edges.map((e, i) => (
          <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm">
            <span className="text-slate-800">
              {e.from} <span className="text-indigo-500">→</span> {e.to}
            </span>
            <span className="font-medium text-slate-700">{formatCurrency(e.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { useDebts, usePayments, usePersons } from '../hooks/useData';
import { getRemainingDebt } from '../services/debtLogic';
import { formatCurrency } from '../utils/format';
import { EmptyState } from '../components/ui';

export function Network() {
  const debts = useDebts();
  const payments = usePayments();
  const persons = usePersons();

  const edges = useMemo(() => {
    return debts
      .filter((d) => d.status !== 'CANCELLED' && d.status !== 'PAID')
      .map((d) => ({
        from: persons.find((p) => p.id === d.debtorId)?.name ?? '—',
        to: persons.find((p) => p.id === d.creditorId)?.name ?? '—',
        amount: getRemainingDebt(d, payments),
      }))
      .filter((e) => e.amount > 0);
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

  // Layout nodes in a circle
  const size = 320;
  const center = size / 2;
  const radius = size / 2 - 50;
  const positions = new Map<string, { x: number; y: number }>();
  nodeNames.forEach((name, i) => {
    const angle = (2 * Math.PI * i) / nodeNames.length - Math.PI / 2;
    positions.set(name, {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    });
  });

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Jaringan</h2>
      <p className="text-sm text-slate-500">Arah panah menunjukkan: Debtor → Creditor (yang berhutang → yang memberi hutang)</p>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-md mx-auto" style={{ minWidth: 280 }}>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-indigo-500, #6366f1)" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const a = positions.get(e.from)!;
            const b = positions.get(e.to)!;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nodeR = 26;
            const startX = a.x + (dx / len) * nodeR;
            const startY = a.y + (dy / len) * nodeR;
            const endX = b.x - (dx / len) * (nodeR + 6);
            const endY = b.y - (dy / len) * (nodeR + 6);
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            return (
              <g key={i}>
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="#6366f1"
                  strokeWidth={2}
                  markerEnd="url(#arrow)"
                  opacity={0.6}
                />
                <rect x={midX - 28} y={midY - 9} width={56} height={18} rx={9} fill="white" stroke="#e2e8f0" />
                <text x={midX} y={midY + 4} textAnchor="middle" fontSize="9" fill="#475569">
                  {formatCurrency(e.amount).replace('Rp', '')}
                </text>
              </g>
            );
          })}
          {nodeNames.map((name) => {
            const p = positions.get(name)!;
            return (
              <g key={name}>
                <circle cx={p.x} cy={p.y} r={26} fill="#eef2ff" stroke="#6366f1" strokeWidth={1.5} />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fontWeight={600} fill="#4338ca">
                  {name.slice(0, 8)}
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

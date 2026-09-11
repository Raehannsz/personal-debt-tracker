import { useParams, Link } from 'react-router-dom';
import { usePerson, useDebts, usePayments, useSettings, usePersons } from '../hooks/useData';
import { getPersonBalance, getNetBalance, getRemainingDebt } from '../services/debtLogic';
import { formatCurrency, formatDate } from '../utils/format';
import { Card, Badge } from '../components/ui';
import { statusColor, statusLabel } from '../components/debtStatus';

export function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const person = usePerson(id);
  const debts = useDebts();
  const payments = usePayments();
  const settings = useSettings();
  const persons = usePersons(true);

  if (!person) {
    return <div className="p-6 text-slate-500 text-sm">Orang tidak ditemukan.</div>;
  }

  const personName = (pid: string) => persons.find((p) => p.id === pid)?.name ?? '—';
  const balance = settings.myPersonId ? getPersonBalance(settings.myPersonId, person.id, debts, payments) : null;
  const net = settings.myPersonId ? getNetBalance(settings.myPersonId, person.id, debts, payments) : null;
  const relatedDebts = debts.filter(
    (d) => (d.debtorId === person.id || d.creditorId === person.id) && d.status !== 'CANCELLED'
  );

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{person.name}</h2>
        {(person.phone || person.email) && (
          <p className="text-sm text-slate-500">{[person.phone, person.email].filter(Boolean).join(' · ')}</p>
        )}
      </div>

      {balance && net && !person.isMe && (
        <Card className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Saya berhutang kepada {person.name}</span>
            <span className="font-semibold text-red-600">{formatCurrency(balance.iOwe)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{person.name} berhutang kepada saya</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(balance.owedToMe)}</span>
          </div>
          {balance.iOwe > 0 && balance.owedToMe > 0 && (
            <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
              <span className="text-slate-700 font-medium">
                Net {net.direction === 'I_OWE' ? `(saya → ${person.name})` : `(${person.name} → saya)`}
              </span>
              <span className={`font-bold ${net.direction === 'I_OWE' ? 'text-red-600' : net.direction === 'SETTLED' ? 'text-slate-500' : 'text-emerald-600'}`}>
                {net.direction === 'SETTLED' ? 'Lunas (saling menutup)' : formatCurrency(net.amount)}
              </span>
            </div>
          )}
        </Card>
      )}

      {person.notes && (
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Catatan</p>
          <p className="text-sm text-slate-800">{person.notes}</p>
        </Card>
      )}

      <div>
        <h3 className="font-semibold text-slate-800 text-sm mb-2">Transaksi Terkait</h3>
        {relatedDebts.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada transaksi.</p>
        ) : (
          <div className="space-y-2">
            {relatedDebts.map((d) => {
              const remaining = getRemainingDebt(d, payments);
              return (
                <Link key={d.id} to={`/hutang/${d.id}`}>
                  <Card className="p-3.5 hover:border-indigo-200 transition">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-800">
                        {personName(d.debtorId)} → {personName(d.creditorId)}
                      </p>
                      <Badge color={statusColor(d.status)}>{statusLabel(d.status)}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-xs text-slate-500">{formatDate(d.transactionDate, true)}</p>
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(remaining)}</p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

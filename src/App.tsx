import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { firebaseConfigured } from './lib/firebase';
import { Dashboard } from './pages/Dashboard';
import { Debts } from './pages/Debts';
import { DebtDetail } from './pages/DebtDetail';
import { Persons } from './pages/Persons';
import { PersonDetail } from './pages/PersonDetail';
import { Network } from './pages/Network';
import { Settings } from './pages/Settings';

function FirebaseSetupNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-sm text-center space-y-3">
        <div className="text-3xl">⚙️</div>
        <h1 className="font-semibold text-slate-800">Config Firebase belum diisi</h1>
        <p className="text-sm text-slate-500">
          Buat file <code className="bg-slate-100 px-1.5 py-0.5 rounded">.env</code> (salin dari{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded">.env.example</code>) lalu isi dengan config
          Firebase kamu. Lihat README bagian "Setup Firebase" untuk langkah lengkapnya.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!firebaseConfigured) {
    return <FirebaseSetupNotice />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/hutang" element={<Debts />} />
          <Route path="/hutang/:id" element={<DebtDetail />} />
          <Route path="/orang" element={<Persons />} />
          <Route path="/orang/:id" element={<PersonDetail />} />
          <Route path="/jaringan" element={<Network />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

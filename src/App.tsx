import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { isEmpty, seedDemoData } from './data/seed';
import { Dashboard } from './pages/Dashboard';
import { Debts } from './pages/Debts';
import { DebtDetail } from './pages/DebtDetail';
import { Persons } from './pages/Persons';
import { PersonDetail } from './pages/PersonDetail';
import { Network } from './pages/Network';
import { Settings } from './pages/Settings';

export default function App() {
  useEffect(() => {
    isEmpty().then((empty) => {
      if (empty) seedDemoData();
    });
  }, []);

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

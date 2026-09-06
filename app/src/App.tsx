import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/ui/Layout'
import DashboardPage from '@/pages/Dashboard'
import SimulatorPage from '@/pages/Simulator'
import KasirPage from '@/pages/Kasir'
import DapurPage from '@/pages/Dapur'
import BahanPage from '@/pages/Bahan'
import LaporanPage from '@/pages/Laporan'

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/kasir" element={<KasirPage />} />
          <Route path="/dapur" element={<DapurPage />} />
          <Route path="/bahan" element={<BahanPage />} />
          <Route path="/laporan" element={<LaporanPage />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}

export default App

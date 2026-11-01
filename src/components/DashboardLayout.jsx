import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      {/* Komponen Sidebar Kiri */}
      <Sidebar />

      {/* Area Utama: Header, Konten Halaman, dan Footer */}
      <div className="flex flex-1 flex-col">
        <Header />

        <main className="flex-1 p-6">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
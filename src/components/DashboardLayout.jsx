import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

export default function DashboardLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const location = useLocation();

  // Otomatis menutup sidebar di HP saat berpindah halaman
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsDesktopCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-100 text-slate-800">
      {/* Sidebar Responsif */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isDesktopCollapsed={isDesktopCollapsed}
        setIsDesktopCollapsed={setIsDesktopCollapsed}
      />

      {/* Area Konten Utama */}
      <div className="flex min-w-0 flex-1 flex-col transition-all duration-300">
        <Header
          onToggleSidebar={handleToggleSidebar}
          isDesktopCollapsed={isDesktopCollapsed}
        />

        <main className="flex-1 overflow-x-hidden p-3 sm:p-6">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
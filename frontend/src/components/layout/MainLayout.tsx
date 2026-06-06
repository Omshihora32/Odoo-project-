import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/sidebarStore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function MainLayout() {
  const { isOpen } = useSidebarStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Navbar />
      <main
        className={cn(
          'min-h-screen pt-16 transition-all duration-300',
          isOpen ? 'ml-64' : 'ml-20'
        )}
      >
        <div className="p-6 page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

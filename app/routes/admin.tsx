import { Outlet } from '@remix-run/react';
import { ProtectedRoute } from '~/components/auth/ProtectedRoute';
import { DashboardNav } from '~/components/dashboard/DashboardNav';
import { Header } from '~/components/header/Header';

export default function AdminLayout() {
  return (
    <ProtectedRoute requireAdmin>
      <div className="flex flex-col h-screen w-screen bg-bolt-elements-background-depth-1">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <DashboardNav />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, LogOut } from 'lucide-react';
import { ADMIN_ROLES, useAuth } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';
import { OnboardingTour } from '@/components/onboarding-tour';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout, completeOnboarding } = useAuth();
  const router = useRouter();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      router.replace('/login');
      return;
    }
    // Tur otomatis muncul HANYA sekali seumur akun (flag dari backend via JWT).
    if (!user.onboardingCompleted) {
      setShowTour(true);
    }
  }, [user, loading, router]);

  function closeTour() {
    // Persist ke backend agar tidak muncul lagi di device mana pun.
    void completeOnboarding();
    setShowTour(false);
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Memuat…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="text-sm text-muted-foreground">
            {user.role === 'SuperAdmin' ? 'Platform Console' : 'Panel Admin'}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTour(true)}
              title="Panduan"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <div className="text-right">
              <div className="text-sm font-medium">{user.email}</div>
              <div className="text-xs text-muted-foreground">{user.role}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Keluar">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 bg-muted/30 p-6">{children}</main>
      </div>

      {showTour && <OnboardingTour role={user.role} onClose={closeTour} />}
    </div>
  );
}

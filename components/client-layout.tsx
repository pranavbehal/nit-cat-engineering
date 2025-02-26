"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Session, User } from "@supabase/auth-helpers-nextjs";
import { MainSidebar } from "@/components/main-sidebar";

interface ClientLayoutProps {
  children: React.ReactNode;
  serverUser: User | null;
}

export function ClientLayout({ children, serverUser }: ClientLayoutProps) {
  const [user, setUser] = useState<User | null>(serverUser);
  const [loading, setLoading] = useState(!serverUser);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (!serverUser) {
      const checkSession = async () => {
        const { data } = await supabase.auth.getUser();
        setUser(data.user);
        setLoading(false);
      };

      checkSession();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [serverUser, supabase.auth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {user && <MainSidebar />}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

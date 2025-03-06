"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

export function PublicGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const isAuthCallback = pathname.includes("/auth/callback");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && !isAuthCallback) {
          toast.error("You are already signed in");
          router.replace("/dashboard");
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase.auth]);

  if (isLoading) {
    return null;
  }

  return <>{children}</>;
}

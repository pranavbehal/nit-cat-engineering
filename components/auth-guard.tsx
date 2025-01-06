"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          toast.error("Please sign in to access this page");
          router.replace("/login");
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        toast.error("Authentication check failed");
        router.replace("/login");
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        toast.error("Your session has ended");
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase.auth]);

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return <>{children}</>;
}

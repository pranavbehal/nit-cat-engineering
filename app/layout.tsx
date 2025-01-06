import { GeistSans } from "geist/font";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Toaster } from "sonner";

import { MainSidebar } from "@/components/main-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const fontSans = GeistSans;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontSans.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen">
            {session && <MainSidebar />}
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}

import { GeistSans } from "geist/font";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Toaster } from "sonner";

import { ClientLayout } from "@/components/client-layout";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const fontSans = GeistSans;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={fontSans.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientLayout serverUser={user}>{children}</ClientLayout>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}

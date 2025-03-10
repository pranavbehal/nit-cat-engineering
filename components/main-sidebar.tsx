"use client";

import { useState, useEffect } from "react";
import { LayoutDashboard, Leaf, Settings, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

import {
  Sidebar,
  SidebarHeader,
  SidebarMain,
  SidebarNav,
  SidebarNavItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const sidebarItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Devices",
    href: "/devices",
    icon: Leaf,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: Settings,
  },
];

export function MainSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the current user when component mounts
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };

    fetchUser();
  }, [supabase]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  const userInitial = userEmail ? userEmail[0].toUpperCase() : "U";

  const displayEmail = userEmail
    ? userEmail.length > 20
      ? userEmail.substring(0, 17) + "..."
      : userEmail
    : "User";

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar>
          <SidebarHeader>
            <div className="flex h-[60px] items-center px-6">
              <div className="flex items-center gap-2 font-semibold">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M8 3h8l4 9v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9l4-9" />
                  <path d="M12 12v6" />
                  <path d="M9 18s1.5-2 3-2 3 2 3 2" />
                  <path d="M6 12h12" />
                </svg>
                <span>NitCat</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarMain>
            <SidebarNav>
              {sidebarItems.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  href={item.href}
                  active={pathname === item.href}
                  as={Link}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </SidebarNavItem>
              ))}
            </SidebarNav>
          </SidebarMain>
          <SidebarFooter>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 px-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {userInitial ? userInitial : "U"}
                      </span>
                    </div>
                    <div className="flex flex-col items-start text-sm">
                      <span className="font-medium">{displayEmail}</span>
                      <span className="text-xs text-muted-foreground">
                        Manage Account
                      </span>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
      </div>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b bg-background z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 font-semibold">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M8 3h8l4 9v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9l4-9" />
            <path d="M12 12v6" />
            <path d="M9 18s1.5-2 3-2 3 2 3 2" />
            <path d="M6 12h12" />
          </svg>
          <span>NitCat</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-sm font-medium">{userInitial}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-30 flex justify-around px-3 py-2">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center p-2 ${
              pathname === item.href ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs mt-1">{item.title}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

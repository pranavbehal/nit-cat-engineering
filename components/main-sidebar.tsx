"use client";

import { LayoutDashboard, Leaf, Settings, LogOut } from "lucide-react";
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  return (
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
            <Button variant="ghost" className="w-full justify-start gap-2 px-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-sm font-medium">U</span>
                </div>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium">User</span>
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
  );
}

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { Home, MessageSquare, ShoppingBag, LayoutDashboard, Settings, LogOut, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  roles?: string[];
  divider?: boolean;
}

export default function BottomNavigation() {
  const { user, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const isGuest = typeof window !== 'undefined' && localStorage.getItem("guestMode") === "true";

  const isActive = (path: string) => {
    return location === path;
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  // Build navigation items based on user role
  let navItems: NavItem[] = [];

  if (!user && !isGuest) {
    // Not logged in - minimal nav
    navItems = [
      { icon: <Home className="h-5 w-5" />, label: "الرئيسية", href: "/" },
      { icon: <MessageSquare className="h-5 w-5" />, label: "تواصل", href: "/contact" },
    ];
  } else {
    // Logged in or guest - full nav
    navItems = [
      { icon: <Home className="h-5 w-5" />, label: "الرئيسية", href: "/landing" },
      { icon: <ShoppingCart className="h-5 w-5" />, label: "الأضاحي", href: "/browse" },
    ];

    if (user && (user.role === "buyer" || user.role === "seller")) {
      navItems.push({
        icon: <ShoppingBag className="h-5 w-5" />,
        label: "طلباتي",
        href: "/orders",
      });
    }

    if (user?.role === "seller") {
      navItems.push({
        icon: <LayoutDashboard className="h-5 w-5" />,
        label: "لوحتي",
        href: "/seller",
      });
    }

    if (user?.role === "admin") {
      navItems.push({
        icon: <LayoutDashboard className="h-5 w-5" />,
        label: "الإدارة",
        href: "/admin",
      });
    }

    navItems.push(
      { icon: <MessageSquare className="h-5 w-5" />, label: "تواصل", href: "/contact" },
      { icon: <Settings className="h-5 w-5" />, label: "الحساب", href: "#profile" }
    );
  }

  return (
    <>
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item, idx) => {
            if (item.divider) {
              return null;
            }

            if (item.label === "الحساب") {
              return (
                <div key={`profile-${idx}`} className="relative group">
                  <button className="p-2 rounded-lg hover:bg-accent/10 transition-all duration-300 group-hover:scale-110">
                    {item.icon}
                  </button>
                  {/* Profile Dropdown */}
                  <div className="absolute bottom-full left-0 mb-2 w-32 bg-background border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 origin-bottom">
                    {user && (
                      <>
                        <Link href="/seller/profile">
                          <button className="w-full text-right px-4 py-2 hover:bg-accent/10 rounded-t-lg text-sm transition-colors">
                            الملف الشخصي
                          </button>
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-right px-4 py-2 hover:bg-destructive/10 text-destructive rounded-b-lg text-sm transition-colors flex items-center justify-end gap-2"
                        >
                          <LogOut className="h-4 w-4" />
                          خروج
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            }

            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 ease-out",
                    "hover:bg-accent/10 hover:scale-110",
                    active
                      ? "bg-primary/10 text-primary scale-110 shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={item.label}
                >
                  <span className="relative">
                    {item.icon}
                    {active && (
                      <span className="absolute inset-0 rounded-lg bg-primary/20 blur-md -z-10 animate-pulse" />
                    )}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Spacer for mobile */}
      {!location.includes("login") && !location.includes("register") && !location.includes("contact") && (
        <div className="md:hidden h-16" />
      )}
    </>
  );
}

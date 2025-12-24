import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import { Link, useLocation } from "wouter";
import { Crown, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function Header() {
  const { user, signOut } = useAuth();
  const [location, setLocation] = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const isGuest = typeof window !== 'undefined' && localStorage.getItem("guestMode") === "true";

  const isActive = (path: string) => {
    return location === path;
  };

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
    setLocation("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex h-16 md:h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/landing" className="flex items-center gap-2 px-2 py-1 rounded-md">
            <img 
              src="/logo.png" 
              alt="أضحيتي" 
              className="h-14 md:h-16 w-auto object-contain animate-sheep-hop hover:animate-spin transition-all duration-300 cursor-pointer drop-shadow-lg hover:drop-shadow-2xl"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 mr-auto ml-8">
            <Link href="/landing">
              <Button
                variant={isActive("/landing") ? "default" : "ghost"}
                size="sm"
              >
                الرئيسية
              </Button>
            </Link>
            <Link href="/browse">
              <Button
                variant={isActive("/browse") ? "default" : "ghost"}
                size="sm"
              >
                الأضاحي
              </Button>
            </Link>
            {user && (user.role === "buyer" || user.role === "seller") && (
              <Link href="/orders">
                <Button
                  variant={isActive("/orders") ? "default" : "ghost"}
                  size="sm"
                >
                  طلباتي
                </Button>
              </Link>
            )}
            {user?.role === "seller" && (
              <Link href="/seller">
                <Button
                  variant={isActive("/seller") ? "default" : "ghost"}
                  size="sm"
                >
                  لوحتي
                </Button>
              </Link>
            )}
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button
                  variant={isActive("/admin") ? "default" : "ghost"}
                  size="sm"
                >
                  الإدارة
                </Button>
              </Link>
            )}
            <Link href="/contact">
              <Button
                variant={isActive("/contact") ? "default" : "ghost"}
                size="sm"
              >
                تواصل
              </Button>
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            
            {/* VIP Button */}
            {user && (user.role === "buyer" || user.role === "seller") && (
              <Link href="/vip-packages">
                <Button
                  variant={isActive("/vip-packages") || isActive("/vip-upgrade") ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "gap-2 transition-all duration-300",
                    (isActive("/vip-packages") || isActive("/vip-upgrade")) && "bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white"
                  )}
                >
                  <Crown className="h-5 w-5" />
                  <span className="hidden sm:inline">VIP</span>
                </Button>
              </Link>
            )}

            {/* Profile Dropdown (Desktop) */}
            {user && (
              <div className="relative group hidden md:block">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  <User className="h-5 w-5" />
                  <span className="hidden lg:inline text-sm">الحساب</span>
                </Button>
                
                {/* Dropdown Menu */}
                <div className={cn(
                  "absolute top-full right-0 mt-2 w-40 bg-background border rounded-lg shadow-lg transition-all duration-200 origin-top",
                  profileOpen ? "opacity-100 visible scale-y-100" : "opacity-0 invisible scale-y-95"
                )}>
                  <Link href="/seller/profile">
                    <button 
                      onClick={() => setProfileOpen(false)}
                      className="w-full text-right px-4 py-2 hover:bg-accent/10 rounded-t-lg text-sm transition-colors flex items-center justify-end gap-2 border-b"
                    >
                      <User className="h-4 w-4" />
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

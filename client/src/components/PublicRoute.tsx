import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface PublicRouteProps {
  children: React.ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      // إذا كان المستخدم مسجل دخول بالفعل، أعده إلى dashboard حسب الدور
      if (user.role === "admin") {
        setLocation("/admin");
      } else if (user.role === "seller") {
        setLocation("/seller");
      } else {
        setLocation("/browse");
      }
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // إذا كان المستخدم مسجل دخول، لا تظهر الصفحة
  if (user) {
    return null;
  }

  return <>{children}</>;
}

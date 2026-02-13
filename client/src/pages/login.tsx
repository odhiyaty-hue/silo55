import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth as firebaseAuth, db } from "@/lib/firebase";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";
import loginBgGif from "@assets/images/login-bg.gif";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(1, "يرجى إدخال كلمة المرور"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, signInAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    setLoading(true);
    try {
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        firebaseAuth,
        data.email,
        data.password
      );

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      if (!userDoc.exists()) {
        // Sign out immediately if no user data found
        await firebaseAuth.signOut();
        throw new Error("User data not found");
      }

      const userData = userDoc.data();

      // Check if email is verified
      if (!userData.emailVerified) {
        // Sign out immediately
        await firebaseAuth.signOut();
        
        toast({
          title: "البريد غير مؤكد",
          description: "يرجى تأكيد بريدك الإلكتروني أولاً",
          variant: "destructive",
        });
        
        // Redirect to verification page
        setLocation(`/verify?email=${encodeURIComponent(data.email)}`);
        return;
      }
      
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: `مرحباً بك ${userData.email}`,
      });

      // Redirect based on role
      if (userData.role === "admin") {
        setLocation("/admin");
      } else if (userData.role === "seller") {
        setLocation("/seller");
      } else {
        setLocation("/browse");
      }
    } catch (error: any) {
      let errorMessage = "حدث خطأ أثناء تسجيل الدخول";
      
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found") {
        errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "تم تجاوز عدد المحاولات، يرجى المحاولة لاحقاً";
      } else if (error.message === "User data not found") {
        errorMessage = "لم يتم العثور على بيانات الحساب";
      }

      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div 
      className="min-h-screen w-full flex flex-col"
      style={{
        backgroundImage: `url('${loginBgGif}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-bold">تسجيل الدخول</CardTitle>
            <CardDescription>
              سجل دخولك للوصول إلى حسابك في أضحيتي
            </CardDescription>
          </CardHeader>
          <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@domain.com"
                data-testid="input-email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label htmlFor="password">كلمة المرور</Label>
                <button
                  type="button"
                  onClick={() => setLocation("/forgot-password")}
                  className="text-sm text-primary hover:underline"
                  data-testid="link-forgot-password"
                >
                  نسيت كلمة السر؟
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                data-testid="input-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="button-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  تسجيل الدخول
                </>
              )}
            </Button>

            {/* Separator */}
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                أو
              </span>
            </div>

            {/* Guest Login Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full text-amber-700 border-amber-700/30 hover:bg-amber-700/5"
              onClick={async () => {
                setGuestLoading(true);
                const result = await signInAsGuest();
                setGuestLoading(false);
                
                if (result.success) {
                  toast({
                    title: "مرحباً بك كزائر",
                    description: "يمكنك الآن تصفح الأغنام المتاحة",
                  });
                  setLocation("/browse");
                } else {
                  toast({
                    title: "خطأ",
                    description: result.error,
                    variant: "destructive",
                  });
                }
              }}
              disabled={loading || guestLoading}
              data-testid="button-guest-login"
            >
              {guestLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  جاري...
                </>
              ) : (
                "الدخول كزائر"
              )}
            </Button>

            {/* Register Link */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">ليس لديك حساب؟ </span>
              <button
                type="button"
                onClick={() => setLocation("/register")}
                className="text-primary hover:underline font-medium"
                data-testid="link-register"
              >
                إنشاء حساب جديد
              </button>
            </div>

            {/* Admin Login Toggle */}
            <div className="text-center pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowAdminLogin(!showAdminLogin)}
                className="text-xs text-muted-foreground hover:underline"
              >
                {showAdminLogin ? "إخفاء تسجيل دخول الإدارة" : "هل أنت مدير؟"}
              </button>
            </div>

            {showAdminLogin && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs">
                <p className="text-yellow-700 dark:text-yellow-400 font-semibold mb-1">
                  تنبيه: تسجيل دخول الإدارة
                </p>
                <p className="text-yellow-600 dark:text-yellow-500">
                  استخدم بيانات حسابك الإداري فقط. تسجيل الدخول هنا سيمنحك صلاحيات إدارية على المنصة.
                </p>
              </div>
            )}
          </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="relative z-10 py-8 text-center">
        <p className="text-sm font-semibold text-gray-700 tracking-wider">
          Developed by <a href="https://www.novawebdv.com" target="_blank" rel="noopener noreferrer" className="text-amber-700 font-bold hover:text-amber-600 transition-colors duration-300 cursor-pointer">NovaWeb</a>
        </p>
      </div>
    </div>
  );
}

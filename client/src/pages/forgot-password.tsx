import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, KeyRound, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import loginBgGif from "@assets/images/login-bg.gif";

const emailSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
});

const resetSchema = z.object({
  newPassword: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string().min(6, "يرجى تأكيد كلمة المرور"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type EmailData = z.infer<typeof emailSchema>;
type ResetData = z.infer<typeof resetSchema>;

type Step = "email" | "code" | "password" | "success";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailForm = useForm<EmailData>({
    resolver: zodResolver(emailSchema),
  });

  const resetForm = useForm<ResetData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleEmailSubmit = async (data: EmailData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (result.success) {
        setEmail(data.email);
        setStep("code");
        toast({
          title: "تم الإرسال",
          description: "تم إرسال كود التحقق إلى بريدك الإلكتروني",
        });
      } else {
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeComplete = (value: string) => {
    setCode(value);
    if (value.length === 6) {
      setStep("password");
    }
  };

  const handlePasswordSubmit = async (data: ResetData) => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStep("success");
        toast({
          title: "تم بنجاح",
          description: "تم تغيير كلمة المرور بنجاح",
        });
      } else {
        toast({
          title: "خطأ",
          description: result.error || "حدث خطأ",
          variant: "destructive",
        });
        if (result.error?.includes("كود")) {
          setStep("code");
          setCode("");
        }
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "تم الإرسال",
          description: "تم إرسال كود جديد",
        });
        setCode("");
      } else {
        toast({
          title: "خطأ",
          description: result.error || "فشل في إعادة الإرسال",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ في الاتصال",
        variant: "destructive",
      });
    } finally {
      setResending(false);
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
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-bold">
              {step === "email" && "نسيت كلمة السر"}
              {step === "code" && "أدخل كود التحقق"}
              {step === "password" && "كلمة المرور الجديدة"}
              {step === "success" && "تم بنجاح"}
            </CardTitle>
            <CardDescription>
              {step === "email" && "أدخل بريدك الإلكتروني لاستلام كود التحقق"}
              {step === "code" && `تم إرسال كود التحقق إلى ${email}`}
              {step === "password" && "أدخل كلمة المرور الجديدة"}
              {step === "success" && "تم تغيير كلمة المرور بنجاح"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "email" && (
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@domain.com"
                      className="pr-10"
                      data-testid="input-email"
                      {...emailForm.register("email")}
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="button-send-code"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    "إرسال كود التحقق"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setLocation("/login")}
                  data-testid="button-back-login"
                >
                  <ArrowLeft className="ml-2 h-4 w-4" />
                  العودة لتسجيل الدخول
                </Button>
              </form>
            )}

            {step === "code" && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={handleCodeComplete}
                    data-testid="input-otp"
                  >
                    <InputOTPGroup className="gap-2" dir="ltr">
                      <InputOTPSlot index={0} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={1} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={2} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={3} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={4} className="w-12 h-12 text-xl" />
                      <InputOTPSlot index={5} className="w-12 h-12 text-xl" />
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-sm text-muted-foreground">
                    أدخل الكود المكون من 6 أرقام
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResendCode}
                  disabled={resending}
                  data-testid="button-resend-code"
                >
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    "إعادة إرسال الكود"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                  data-testid="button-change-email"
                >
                  <ArrowLeft className="ml-2 h-4 w-4" />
                  تغيير البريد الإلكتروني
                </Button>
              </div>
            )}

            {step === "password" && (
              <form onSubmit={resetForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10 text-right"
                      data-testid="input-new-password"
                      {...resetForm.register("newPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-toggle-new-password"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {resetForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">{resetForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10 text-right"
                      data-testid="input-confirm-password"
                      {...resetForm.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-toggle-confirm-password"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{resetForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="button-reset-password"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري التحديث...
                    </>
                  ) : (
                    "تحديث كلمة المرور"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("code");
                    setCode("");
                  }}
                  data-testid="button-back-code"
                >
                  <ArrowLeft className="ml-2 h-4 w-4" />
                  العودة لإدخال الكود
                </Button>
              </form>
            )}

            {step === "success" && (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <p className="text-muted-foreground">
                  يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة
                </p>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setLocation("/login")}
                  data-testid="button-go-login"
                >
                  الذهاب لتسجيل الدخول
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="relative z-10 py-8 text-center">
        <p className="text-sm font-semibold text-gray-700 tracking-wider">
          Developed by <a href="https://www.novawebdv.com" target="_blank" rel="noopener noreferrer" className="text-amber-700 font-bold hover:text-amber-600 transition-colors duration-300 cursor-pointer">NovaWeb</a>
        </p>
      </div>
    </div>
  );
}

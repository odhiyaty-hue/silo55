import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'input' | 'loading' | 'success' | 'error'>('input');
  const [message, setMessage] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Get email from URL parameters
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');

    if (!emailParam) {
      setStatus('error');
      setMessage('رابط التحقق غير صحيح. يرجى التحقق من الرابط المرسل إلى بريدك.');
      return;
    }

    setEmail(emailParam);
  }, []);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال كود مكون من 6 أرقام',
        variant: 'destructive',
      });
      return;
    }

    setStatus('loading');
    setMessage('جاري التحقق من الكود وإنشاء حسابك...');

    try {
      console.log('🔐 Starting verification and account creation...');
      console.log('Email:', email);
      console.log('Code:', code);

      const response = await fetch('/api/auth/complete-registration', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, email }),
      });

      const data = await response.json();

      console.log('📬 Response status:', response.status);
      console.log('📋 Response data:', data);

      if (!response.ok || !data.success) {
        const errorMsg = data.error === 'Pending registration not found' 
          ? 'لم يتم العثور على طلب التسجيل. يرجى إعادة التسجيل.'
          : data.error === 'Invalid verification code'
          ? 'رمز التحقق غير صحيح. يرجى التحقق من الرمز المرسل.'
          : data.error === 'Verification code expired'
          ? 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.'
          : data.error || 'حدث خطأ أثناء التحقق';

        setMessage(errorMsg);
        console.log('❌ Verification failed:', data.error);
        setStatus('error');
        toast({
          title: 'فشل التحقق',
          description: errorMsg,
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Verification successful, account created');
      setStatus('success');
      setMessage('تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول.');
      toast({
        title: 'تم إنشاء الحساب',
        description: 'تم تفعيل حسابك بنجاح',
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        console.log('🔄 Redirecting to login...');
        setLocation('/login');
      }, 3000);
    } catch (error: any) {
      console.error('❌ Verification error:', error);
      setStatus('error');
      setMessage('حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
      toast({
        title: 'خطأ في الاتصال',
        description: 'تعذر الاتصال بالخادم',
        variant: 'destructive',
      });
    }
  };

  const handleResendCode = async () => {
    try {
      const response = await fetch('/api/auth/resend-pending-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: 'تم الإرسال',
          description: 'تم إرسال كود جديد إلى بريدك الإلكتروني',
        });
        setStatus('input');
        setCode('');
      } else {
        toast({
          title: 'خطأ',
          description: result.error || 'فشل إعادة إرسال الكود',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في إعادة إرسال الكود',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-primary">
            التحقق من البريد الإلكتروني
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'input' && (
            <>
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  أدخل الكود المكون من 6 أرقام المرسل إلى
                </p>
                <p className="text-sm font-medium text-primary">
                  {email}
                </p>
              </div>

              <div className="flex justify-center" dir="ltr">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => setCode(value)}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleVerify}
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={code.length !== 6}
                >
                  تحقق من الكود
                </Button>

                <div className="text-center">
                  <button
                    onClick={handleResendCode}
                    className="text-sm text-primary hover:underline"
                  >
                    لم يصلك الكود؟ إعادة الإرسال
                  </button>
                </div>
              </div>
            </>
          )}

          {status === 'loading' && (
            <>
              <div className="flex justify-center">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              </div>
              <p className="text-center text-lg text-gray-700 font-medium">
                {message}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-center text-lg text-gray-700 font-medium">
                {message}
              </p>
              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  سيتم توجيهك تلقائياً لصفحة تسجيل الدخول...
                </p>
                <Button 
                  onClick={() => setLocation('/login')}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  الذهاب لتسجيل الدخول الآن
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              <p className="text-center text-lg text-gray-700 font-medium">
                {message}
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setStatus('input');
                    setCode('');
                    setMessage('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  المحاولة مرة أخرى
                </Button>
                <Button 
                  onClick={handleResendCode}
                  variant="outline"
                  className="w-full"
                >
                  إرسال كود جديد
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      console.log('🗑️ Canceling pending registration...');
                      const response = await fetch('/api/auth/cancel-pending-registration', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                      });

                      const result = await response.json();
                      console.log('🗑️ Cancel result:', result);

                      toast({
                        title: 'تم الإلغاء',
                        description: 'يمكنك الآن إنشاء حساب جديد',
                      });

                      setLocation('/register');
                    } catch (error) {
                      console.error('❌ Cancel error:', error);
                      toast({
                        title: 'خطأ',
                        description: 'فشل إلغاء التسجيل',
                        variant: 'destructive',
                      });
                    }
                  }}
                  variant="outline"
                  className="w-full"
                >
                  إلغاء والعودة للتسجيل
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
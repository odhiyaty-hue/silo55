import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, Zap, Crown, ArrowRight } from "lucide-react";

export default function VIPUpgrade() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    }
  }, [user, setLocation]);

  if (!user) return null;

  const isVIP = user.vipStatus !== "none" && user.vipStatus !== undefined;

  const handleUpgradeToVIP = async () => {
    setLocation("/vip-packages");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation(user.role === "seller" ? "/seller" : "/browse")}
          className="mb-8"
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة
        </Button>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">ترقية الحساب إلى VIP</h1>
          <p className="text-lg text-muted-foreground">
            {user.role === "seller"
              ? "احصل على أولوية عرض منتجاتك والوصول إلى ميزات حصرية"
              : "استمتع بتخفيضات خاصة على الأسعار وميزات حصرية"}
          </p>
        </div>

        {/* Current Status */}
        <Card className="mb-12 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">حالة الحساب الحالية</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    {isVIP ? "VIP" : "عادي"}
                  </span>
                  {isVIP && (
                    <Badge className="bg-amber-500 text-white">
                      <Crown className="h-3 w-3 mr-1" />
                      نشط
                    </Badge>
                  )}
                </div>
              </div>
              {isVIP && user.vipUpgradedAt && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">تاريخ الترقية</p>
                  <p className="font-semibold">
                    {new Date(user.vipUpgradedAt).toLocaleDateString("ar-DZ")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* VIP Plans */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Current Plan */}
          <Card className={isVIP ? "border-primary/50" : ""}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>الحساب العادي</CardTitle>
                {!isVIP && <Badge>حالي</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">
                    {user.role === "seller"
                      ? "عرض المنتجات في النتائج العادية"
                      : "تصفح جميع الأغنام المتاحة"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">
                    {user.role === "seller"
                      ? "وصول محدود للتحليلات"
                      : "الأسعار العادية"}
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* VIP Plan */}
          <Card className="border-2 border-amber-500 relative">
            <div className="absolute -top-3 right-4">
              <Badge className="bg-amber-500 text-white">
                <Zap className="h-3 w-3 mr-1" />
                الأفضل
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  VIP
                </CardTitle>
                {isVIP && <Badge className="bg-green-500">نشط</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                {user.role === "seller" ? (
                  <>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-amber-500 mt-0.5" />
                      <span>
                        <strong>أولوية عرض</strong> - منتجاتك تظهر في أعلى النتائج
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-amber-500 mt-0.5" />
                      <span>
                        <strong>شارة VIP</strong> - تميز في الملف الشخصي
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-amber-500 mt-0.5" />
                      <span>
                        <strong>تحليلات متقدمة</strong> - عرض تفصيلي للزيارات
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-amber-500 mt-0.5" />
                      <span>
                        <strong>دعم أولوية</strong> - الرد السريع على الاستفسارات
                      </span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-amber-500 mt-0.5" />
                      <span>
                        <strong>تخفيف 10%</strong> على جميع الأسعار
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-amber-500 mt-0.5" />
                      <span>
                        <strong>عروض حصرية</strong> - منتجات خاصة للأعضاء VIP
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-amber-500 mt-0.5" />
                      <span>
                        <strong>ضمان آمن</strong> - ضمان المشتري محسّن
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-amber-500 mt-0.5" />
                      <span>
                        <strong>دعم أولوية</strong> - الرد السريع على الاستفسارات
                      </span>
                    </li>
                  </>
                )}
              </ul>

              <div className="pt-4">
                {isVIP ? (
                  <Button disabled className="w-full">
                    <Check className="mr-2 h-4 w-4" />
                    حسابك VIP مفعّل
                  </Button>
                ) : (
                  <Button
                    onClick={handleUpgradeToVIP}
                    disabled={upgrading}
                    className="w-full bg-amber-500 hover:bg-amber-600"
                  >
                    {upgrading ? "جاري الترقية..." : "ترقية الآن"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Explanation */}
        <Card>
          <CardHeader>
            <CardTitle>كيف يعمل البرنامج؟</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                {user.role === "seller" ? (
                  <>
                    <Zap className="h-4 w-4 text-amber-500" />
                    البائعون VIP
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-amber-500" />
                    المشترون VIP
                  </>
                )}
              </h3>
              <p className="text-muted-foreground">
                {user.role === "seller"
                  ? "عندما تكون بائع VIP، تظهر منتجاتك في أعلى قائمة النتائج أولاً، مما يزيد من فرص البيع بشكل كبير. كما تحصل على دعم أولوي وتحليلات متقدمة لتتبع أداء منتجاتك."
                  : "عندما تكون مشتري VIP، تحصل على تخفيض 10% على جميع الأسعار، مما يوفر لك أموالاً على كل عملية شراء. كما تحصل على عروض حصرية وضمان محسّن."}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">الترقية فورية</h3>
              <p className="text-muted-foreground">
                تصبح عضو VIP على الفور بعد الترقية. جميع المميزات تفعّل فوراً دون انتظار.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">إلغاء في أي وقت</h3>
              <p className="text-muted-foreground">
                يمكنك إلغاء اشتراكك VIP في أي وقت. لا توجد تعاقدات طويلة أو رسوم إضافية.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

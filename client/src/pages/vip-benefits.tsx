import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Gift, Users, TrendingUp, Clock, Star } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function VIPBenefits() {
  const [, setLocation] = useLocation();

  const buyerBenefits = [
    { icon: Zap, title: "تخفيضات حصرية", desc: "خصومات تصل إلى 15% حسب الباقة" },
    { icon: Star, title: "عروض أولوية", desc: "الوصول الأول للعروض والمنتجات الحصرية" },
    { icon: Gift, title: "نقاط مكافآت", desc: "اكسب نقاط عند كل عملية شراء" },
    { icon: Clock, title: "توصيل مجاني", desc: "توصيل سريع ومجاني لبعض الطلبات" },
    { icon: Users, title: "دعم 24/7", desc: "دعم فني مخصص وسريع الرد" },
    { icon: TrendingUp, title: "شارة VIP", desc: "شارة مميزة بجانب اسمك في الموقع" },
  ];

  const sellerBenefits = [
    { icon: TrendingUp, title: "أولوية العرض", desc: "منتجاتك تظهر أولاً في البحث" },
    { icon: Zap, title: "عروض حصرية", desc: "أضف منتجاتك في عروض خاصة للـ VIP" },
    { icon: Clock, title: "إشعارات فورية", desc: "تنبيهات فورية عن الطلبات الجديدة" },
    { icon: Star, title: "لوحة تحكم موسعة", desc: "إحصائيات وتحليلات تفصيلية للمبيعات" },
    { icon: Gift, title: "تخفيض العمولة", desc: "تقليل رسوم العمولة للبائعين VIP" },
    { icon: Users, title: "دعم ممتاز", desc: "أولوية في الدعم الفني والاستشارات" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <Button variant="ghost" onClick={() => setLocation("/vip-upgrade")} className="mb-8">
          ← العودة
        </Button>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">مزايا عضوية VIP</h1>
          <p className="text-lg text-muted-foreground">
            اكتشف جميع الامتيازات التي تنتظرك عند الاشتراك في VIP
          </p>
        </div>

        {/* Buyer Benefits */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="h-8 w-8 text-yellow-500" />
            <h2 className="text-3xl font-bold">مزايا المشترين VIP</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {buyerBenefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Icon className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold mb-2">{benefit.title}</h3>
                        <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-semibold mb-3">📊 أمثلة على التخفيفات:</h3>
            <ul className="space-y-2 text-sm">
              <li>✓ <strong>الفضية:</strong> تخفيف 5% + نقاط مكافآت</li>
              <li>✓ <strong>الذهبية:</strong> تخفيف 10% + عروض حصرية + دعم ممتاز</li>
              <li>✓ <strong>البلاتينيوم:</strong> تخفيف 15% + توصيل مجاني + دعم 24/7 + نقاط مضاعفة</li>
            </ul>
          </div>
        </div>

        {/* Seller Benefits */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="h-8 w-8 text-green-500" />
            <h2 className="text-3xl font-bold">مزايا البائعين VIP</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sellerBenefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Icon className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold mb-2">{benefit.title}</h3>
                        <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-6 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold mb-3">📈 تأثير VIP على المبيعات:</h3>
            <ul className="space-y-2 text-sm">
              <li>✓ <strong>الفضية:</strong> أولوية بسيطة + تقليل 2% من العمولة</li>
              <li>✓ <strong>الذهبية:</strong> أولوية متوسطة + تقليل 5% من العمولة + لوحة تحكم موسعة</li>
              <li>✓ <strong>البلاتينيوم:</strong> أولوية عليا + تقليل 10% من العمولة + دعم 24/7 + أولوية في صرف الأموال</li>
            </ul>
          </div>
        </div>

        {/* Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle>مقارنة كاملة بين الباقات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-right py-3 px-4">المميزة</th>
                    <th className="text-center py-3 px-4">🥈 فضية</th>
                    <th className="text-center py-3 px-4">🥇 ذهبية</th>
                    <th className="text-center py-3 px-4">🏆 بلاتينيوم</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-semibold">تخفيف المشتري</td>
                    <td className="text-center py-3 px-4">5%</td>
                    <td className="text-center py-3 px-4">10%</td>
                    <td className="text-center py-3 px-4">15%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-semibold">نقاط المكافآت</td>
                    <td className="text-center py-3 px-4"><Check className="h-5 w-5 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="h-5 w-5 mx-auto" /></td>
                    <td className="text-center py-3 px-4"><Check className="h-5 w-5 mx-auto text-yellow-500" /> مضاعفة</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-semibold">أولوية العرض</td>
                    <td className="text-center py-3 px-4">أساسية</td>
                    <td className="text-center py-3 px-4">متوسطة</td>
                    <td className="text-center py-3 px-4">عليا</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-semibold">تقليل العمولة</td>
                    <td className="text-center py-3 px-4">2%</td>
                    <td className="text-center py-3 px-4">5%</td>
                    <td className="text-center py-3 px-4">10%</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-semibold">دعم فني</td>
                    <td className="text-center py-3 px-4">بريد</td>
                    <td className="text-center py-3 px-4">ممتاز</td>
                    <td className="text-center py-3 px-4">24/7</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold">السعر/المدة</td>
                    <td className="text-center py-3 px-4">2,999 د.ج<br/>شهر</td>
                    <td className="text-center py-3 px-4">7,999 د.ج<br/>3 أشهر</td>
                    <td className="text-center py-3 px-4">19,999 د.ج<br/>سنة</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

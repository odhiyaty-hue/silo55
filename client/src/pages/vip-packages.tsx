import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Crown, Zap } from "lucide-react";
import { VIP_PACKAGES, VIPPackage } from "@shared/schema";

export default function VIPPackages() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) return null;

  const handleSelectPackage = (packageId: VIPPackage) => {
    const pkg = VIP_PACKAGES[packageId];
    localStorage.setItem("pendingVIPUpgrade", "true");
    localStorage.setItem("vipPackage", packageId);
    localStorage.setItem("vipAmount", pkg.price.toString());
    setLocation("/checkout/vip");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <Button variant="ghost" onClick={() => setLocation(user.role === "seller" ? "/seller" : "/browse")} className="mb-8">
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة
        </Button>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">اختر باقة VIP المناسبة</h1>
          <p className="text-lg text-muted-foreground">
            {user.role === "seller"
              ? "احصل على أولوية عرض منتجاتك وميزات حصرية"
              : "استمتع بتخفيضات خاصة وعروض حصرية"}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {Object.entries(VIP_PACKAGES).map(([key, pkg]) => (
            <Card
              key={key}
              className={`relative transition-all hover:shadow-lg ${
                key === "platinum" ? "border-2 border-amber-500 md:scale-105" : ""
              }`}
            >
              {key === "platinum" && (
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-amber-500 text-white">
                    <Zap className="h-3 w-3 mr-1" />
                    الأفضل
                  </Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className={`h-5 w-5 ${key === "platinum" ? "text-amber-500" : key === "gold" ? "text-yellow-500" : "text-gray-400"}`} />
                      {pkg.nameAr}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{pkg.name}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">{pkg.price.toLocaleString()} د.ج</div>
                  <p className="text-sm text-muted-foreground">{pkg.duration} يوم</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="font-semibold mb-2">التخفيفات والمزايا:</p>
                    <ul className="space-y-2">
                      {pkg.featuresAr.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm">
                    <strong>للمشترين:</strong> تخفيف {pkg.buyerDiscount}% على جميع الأسعار
                  </p>
                  <p className="text-sm mt-2">
                    <strong>للبائعين:</strong> أولوية{" "}
                    {pkg.sellerPriority === "low"
                      ? "أساسية"
                      : pkg.sellerPriority === "medium"
                      ? "متوسطة"
                      : "عليا"}{" "}
                    في عرض المنتجات
                  </p>
                </div>

                <Button onClick={() => handleSelectPackage(key as VIPPackage)} className="w-full">
                  اختيار هذه الباقة
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>المقارنة بين الباقات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2">المميزة</th>
                    {Object.values(VIP_PACKAGES).map((pkg) => (
                      <th key={pkg.id} className="text-center py-2 px-4">
                        {pkg.nameAr}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-3">السعر</td>
                    {Object.values(VIP_PACKAGES).map((pkg) => (
                      <td key={pkg.id} className="text-center py-3 px-4 font-bold">
                        {pkg.price.toLocaleString()} د.ج
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">المدة</td>
                    {Object.values(VIP_PACKAGES).map((pkg) => (
                      <td key={pkg.id} className="text-center py-3 px-4">
                        {pkg.duration === 30 ? "شهر" : pkg.duration === 90 ? "3 أشهر" : "سنة"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b">
                    <td className="py-3">تخفيف المشتري</td>
                    {Object.values(VIP_PACKAGES).map((pkg) => (
                      <td key={pkg.id} className="text-center py-3 px-4">
                        {pkg.buyerDiscount}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3">أولوية البائع</td>
                    {Object.values(VIP_PACKAGES).map((pkg) => (
                      <td key={pkg.id} className="text-center py-3 px-4">
                        {pkg.sellerPriority === "low"
                          ? "أساسية"
                          : pkg.sellerPriority === "medium"
                          ? "متوسطة"
                          : "عليا"}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
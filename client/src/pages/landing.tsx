import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ShieldCheck, 
  Search, 
  MessageSquare, 
  CheckCircle2, 
  Star,
  TrendingUp,
  Users,
  Award
} from "lucide-react";
import heroImage from "@assets/generated_images/arabic_sheep_farm_hero.png";
import trustImage from "@assets/generated_images/trust_verification_illustration.png";

export default function LandingPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    usersCount: 1000,
    salesCount: 500,
    localSheepCount: 0,
    importedSheepCount: 0
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats({
            usersCount: 1000 + (data.usersCount || 0),
            salesCount: 500 + (data.salesCount || 0),
            localSheepCount: 4 + (data.localSheepCount || 0),
            importedSheepCount: 1 + (data.importedSheepCount || 0)
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="bg-background w-full">
      <Header />

      {/* Hero Section */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        {/* Hero Image with Dark Overlay */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="مزرعة أغنام"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/30" />
        </div>

        {/* Hero Content */}
        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 w-full">
            <div className="max-w-3xl text-white">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                منصة موثوقة لبيع وشراء الأغنام
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-white/90">
                تواصل آمن بين البائعين والمشترين مع إشراف إداري كامل
              </p>
              <div className="flex flex-wrap gap-4">
                {/* Show "ابدأ الشراء" for buyers and sellers, hide for admins */}
                {(!user || user.role === "buyer" || user.role === "seller") && (
                  <Link href="/register" data-testid="button-register-buyer">
                    <Button size="lg" className="text-lg">
                      ابدأ الشراء
                    </Button>
                  </Link>
                )}
                
                {/* Show "ابدأ البيع" only for sellers, hide for buyers and admins */}
                {(!user || user.role === "seller") && (
                  <Link href="/register" data-testid="button-register-seller">
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="text-lg bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                    >
                      ابدأ البيع
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-16 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-3 text-primary" />
                <p className="text-3xl font-bold mb-1">+{stats.usersCount}</p>
                <p className="text-sm text-muted-foreground">عدد المستخدمين</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-3 text-primary" />
                <p className="text-3xl font-bold mb-1">+{stats.salesCount}</p>
                <p className="text-sm text-muted-foreground">عملية بيع</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <ShieldCheck className="h-8 w-8 mx-auto mb-3 text-primary" />
                <p className="text-3xl font-bold mb-1">{stats.localSheepCount}</p>
                <p className="text-sm text-muted-foreground">عدد الأضاحي المحلية</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Star className="h-8 w-8 mx-auto mb-3 text-primary" />
                <p className="text-3xl font-bold mb-1">{stats.importedSheepCount}</p>
                <p className="text-sm text-muted-foreground">عدد الأضاحي المستوردة</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              كيف يعمل أضحيتي؟
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ثلاث خطوات بسيطة للبدء في بيع أو شراء الأغنام بأمان
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">
                <Search className="inline-block h-5 w-5 ml-2" />
                تصفح واختر
              </h3>
              <p className="text-muted-foreground">
                تصفح مئات القوائم من الأغنام المعتمدة من قبل الإدارة واختر ما يناسبك
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">
                <ShieldCheck className="inline-block h-5 w-5 ml-2" />
                مراجعة إدارية
              </h3>
              <p className="text-muted-foreground">
                جميع القوائم تمر بمراجعة دقيقة من فريق الإدارة لضمان الجودة والمصداقية
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">
                <MessageSquare className="inline-block h-5 w-5 ml-2" />
                تواصل آمن
              </h3>
              <p className="text-muted-foreground">
                قدم طلب الشراء وسيتم التواصل معك من خلال الإدارة لإتمام العملية بأمان
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 md:py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4">لماذا نحن؟</Badge>
              <h2 className="text-3xl md:text-4xl font-semibold mb-6">
                منصة موثوقة مع إشراف كامل
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">مراجعة شاملة</h3>
                    <p className="text-muted-foreground">
                      كل قائمة تمر بمراجعة دقيقة من فريقنا للتأكد من جودة المحتوى والمصداقية
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">معاملات آمنة</h3>
                    <p className="text-muted-foreground">
                      نحن نشرف على جميع المعاملات لضمان حقوق البائع والمشتري
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">دعم مستمر</h3>
                    <p className="text-muted-foreground">
                      فريقنا متواجد دائماً لمساعدتك في أي استفسار أو مشكلة
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src={trustImage}
                alt="ثقة وأمان"
                className="max-w-md w-full rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              من نحن؟
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              نحن منصة متخصصة في خدمة سوق الأغنام الجزائري
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">رؤيتنا</h3>
                <p className="text-muted-foreground">
                  نسعى إلى بناء سوق آمن وموثوق لبيع وشراء الأغنام في الجزائر، حيث يمكن للبائعين والمشترين التواصل بسهولة وثقة مع ضمان جودة عالية في كل معاملة.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">مهمتنا</h3>
                <p className="text-muted-foreground">
                  توفير منصة سهلة الاستخدام وآمنة تربط بين البائعين والمشترين مع إشراف إداري شامل لضمان سلامة جميع المعاملات وحقوق الجميع.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">قيمنا</h3>
                <p className="text-muted-foreground">
                  الشفافية والأمان والموثوقية هي أساس عملنا. نعتقد أن الثقة هي أساس أي معاملة ناجحة.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-8 border border-primary/20">
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-primary mb-2">1000+</h3>
                  <p className="text-muted-foreground">مستخدم نشط يثق بنا</p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-primary mb-2">500+</h3>
                  <p className="text-muted-foreground">معاملة تمت بنجاح</p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-primary mb-2">24/7</h3>
                  <p className="text-muted-foreground">دعم فني متواجد دائماً</p>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-primary mb-2">100%</h3>
                  <p className="text-muted-foreground">معاملات آمنة وموثوقة</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      </div>
  );
}

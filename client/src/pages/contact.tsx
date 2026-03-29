import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MessageCircle, Facebook, Linkedin, MessageSquare } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">تواصل معنا</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              نحن هنا لمساعدتك. استخدم أحد طرق التواصل التالية للتواصل معنا
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Primary Email */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <Mail className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-3">البريد الإلكتروني الرئيسي</h3>
                <p className="text-muted-foreground mb-4">
                  للاستفسارات والطلبات العامة.
                </p>
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=odhiyaty@gmail.com" target="_blank" rel="noopener noreferrer" className="text-primary font-bold text-lg hover:underline break-all">
                  odhiyaty@gmail.com
                </a>
              </CardContent>
            </Card>

            {/* Secondary Email */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <Mail className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-3">البريد الإلكتروني الثانوي</h3>
                <p className="text-muted-foreground mb-4">
                  للمشاكل والشكاوى الخاصة.
                </p>
                <a href="https://mail.google.com/mail/?view=cm&fs=1&to=habiratabderazek@gmail.com" target="_blank" rel="noopener noreferrer" className="text-primary font-bold text-lg hover:underline break-all">
                  habiratabderazek@gmail.com
                </a>
              </CardContent>
            </Card>

            {/* Phone */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <Phone className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-3">رقم الهاتف</h3>
                <p className="text-muted-foreground mb-4">
                  اتصل بنا مباشرة للحصول على الدعم الفوري.
                </p>
                <a href="tel:+213794769766" className="text-primary font-bold text-lg hover:underline">
                  0794769766
                </a>
              </CardContent>
            </Card>

            {/* WhatsApp */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <MessageCircle className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-3">WhatsApp</h3>
                <p className="text-muted-foreground mb-4">
                  للمحادثة الفورية والرد السريع.
                </p>
                <a href="https://wa.me/213794769766" target="_blank" rel="noopener noreferrer" className="text-primary font-bold text-lg hover:underline">
                  0794769766
                </a>
              </CardContent>
            </Card>

            {/* Facebook */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <Facebook className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-3">Facebook</h3>
                <p className="text-muted-foreground mb-4">
                  تابعنا على الفيسبوك لآخر المستجدات.
                </p>
                <a href="https://web.facebook.com/abderazak.habirat.2025" target="_blank" rel="noopener noreferrer" className="text-primary font-bold text-lg hover:underline">
                  Facebook الملف الشخصي
                </a>
              </CardContent>
            </Card>

            {/* LinkedIn */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <Linkedin className="h-12 w-12 mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-3">LinkedIn</h3>
                <p className="text-muted-foreground mb-4">
                  اتصل بنا عبر LinkedIn للفرص العملية.
                </p>
                <a href="https://www.linkedin.com/in/habirat-abderazek-3a7b3b219/" target="_blank" rel="noopener noreferrer" className="text-primary font-bold text-lg hover:underline">
                  LinkedIn الملف الشخصي
                </a>
              </CardContent>
            </Card>

          </div>

          {/* Summary Card */}
          <Card className="mt-12 bg-gradient-to-r from-primary/10 to-primary/5">
            <CardHeader>
              <CardTitle className="text-2xl">معلومات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">الدعم الفني</h3>
                <p className="text-muted-foreground">
                  فريقنا الفني مختص وجاهز للرد على جميع استفساراتك واستشاراتك المتعلقة بالمنصة.
                </p>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">الرد السريع</h3>
                <p className="text-muted-foreground">
                  نعمل على رد جميع الاستفسارات في غضون 24 ساعة، ومعظمها يتم الرد عليه في أقل من ساعات معدودة.
                </p>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">التواصل المباشر</h3>
                <p className="text-muted-foreground">
                  يمكنك استخدام أي من الطرق المذكورة أعلاه للتواصل المباشر معنا بدون وسيط.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 md:py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>&copy; 2025 أضحيتي. جميع الحقوق محفوظة.</p>
            <p className="mt-2">Developed by <a href="https://www.novawebdv.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">NovaWeb</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}

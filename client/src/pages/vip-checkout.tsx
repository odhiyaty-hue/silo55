import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Banknote, Check, Upload } from "lucide-react";
import { addDoc, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { uploadToImgBB } from "@/lib/imgbb";
import { VIP_PACKAGES, VIPPackage } from "@shared/schema";

export default function VIPCheckout() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash">("card");
  const [processing, setProcessing] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [vipPackage, setVipPackage] = useState<VIPPackage | null>(null);
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const vipUpgrade = localStorage.getItem("pendingVIPUpgrade");
    const pkg = localStorage.getItem("vipPackage") as VIPPackage | null;
    const amt = localStorage.getItem("vipAmount");
    
    if (!vipUpgrade || !pkg) {
      setLocation("/vip-packages");
      return;
    }
    
    setVipPackage(pkg);
    setAmount(parseInt(amt || "0"));
  }, [setLocation]);

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setReceiptPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePayment = async () => {
    if (!user) {
      setLocation("/login");
      return;
    }

    if (paymentMethod === "card" && !receiptFile) {
      toast({
        title: "تنبيه",
        description: "يجب رفع صورة الوصل",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      let receiptUrl = "";
      
      if (paymentMethod === "card" && receiptFile) {
        receiptUrl = await uploadToImgBB(receiptFile);
      }

      if (!vipPackage) return;
      
      const pkg = VIP_PACKAGES[vipPackage];
      const expiresAt = Date.now() + pkg.duration * 24 * 60 * 60 * 1000;
      
      const paymentData = {
        userId: user.uid,
        userEmail: user.email,
        amount: amount,
        method: paymentMethod,
        status: paymentMethod === "cash" ? "pending" : "pending",
        orderId: undefined,
        vipUpgrade: true,
        vipPackage: vipPackage,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const paymentRef = await addDoc(collection(db, "payments"), paymentData);

      if (paymentMethod === "card") {
        await addDoc(collection(db, "cibReceipts"), {
          paymentId: paymentRef.id,
          userId: user.uid,
          userEmail: user.email,
          receiptImageUrl: receiptUrl,
          amount: amount,
          orderId: undefined,
          vipUpgrade: true,
          vipPackage: vipPackage,
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // إذا كان التحويل البنكي، يتم التفعيل بعد التحقق من قبل الإدارة
      if (paymentMethod === "card") {
        toast({
          title: "تم استلام الوصل",
          description: "سيتم تفعيل VIP الخاص بك خلال ساعات بعد التحقق من الوصل",
        });
      } else {
        // للدفع النقدي، يتم التفعيل مباشرة
        await updateDoc(doc(db, "users", user.uid), {
          vipStatus: vipPackage,
          vipPackage: vipPackage,
          vipUpgradedAt: Date.now(),
          vipExpiresAt: expiresAt,
          rewardPoints: (user.rewardPoints || 0) + 100,
          updatedAt: Date.now(),
        });
        await refreshUser();
        toast({
          title: "مبروك!",
          description: `تم تفعيل باقة ${pkg.nameAr} بنجاح حتى ${new Date(expiresAt).toLocaleDateString("ar-DZ")}`,
        });
      }

      localStorage.removeItem("pendingVIPUpgrade");
      localStorage.removeItem("vipAmount");

      setLocation(user?.role === "seller" ? "/seller" : "/browse");
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "خطأ في الدفع",
        description: "حدث خطأ أثناء معالجة الدفع",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">ترقية VIP - باقة {vipPackage && VIP_PACKAGES[vipPackage]?.nameAr}</h1>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className={`cursor-pointer transition ${paymentMethod === "card" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => setPaymentMethod("card")}>
            <CardContent className="p-6 text-center">
              <CreditCard className="h-8 w-8 mx-auto mb-3 text-blue-500" />
              <h3 className="font-semibold mb-2">بطاقة CIB</h3>
              <p className="text-sm text-muted-foreground">دفع فوري آمن</p>
              {paymentMethod === "card" && <Check className="h-5 w-5 mx-auto mt-2 text-green-500" />}
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition ${paymentMethod === "cash" ? "border-primary bg-primary/5" : "hover:border-primary/50"}`} onClick={() => setPaymentMethod("cash")}>
            <CardContent className="p-6 text-center">
              <Banknote className="h-8 w-8 mx-auto mb-3 text-green-500" />
              <h3 className="font-semibold mb-2">دفع نقدي</h3>
              <p className="text-sm text-muted-foreground">الدفع عند التفعيل</p>
              {paymentMethod === "cash" && <Check className="h-5 w-5 mx-auto mt-2 text-green-500" />}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>تفاصيل الدفع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentMethod === "card" && (
              <>
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-2">🏦 تحويل بنكي:</p>
                  <p className="text-sm text-blue-900 dark:text-blue-100">رقم الحساب: <strong>123 456 789</strong></p>
                  <p className="text-sm text-blue-900 dark:text-blue-100">البنك: CIB الجزائر</p>
                  <p className="text-sm text-blue-900 dark:text-blue-100 mt-2">حوّل المبلغ ثم ارفع صورة الوصل أدناه</p>
                </div>

                <div>
                  <Label>صورة الوصل</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition">
                    <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" id="receipt-input" />
                    <label htmlFor="receipt-input" className="cursor-pointer block">
                      {receiptPreview ? (
                        <div>
                          <img src={receiptPreview} alt="Preview" className="h-32 mx-auto mb-2 rounded" />
                          <p className="text-sm text-green-600">✓ تم تحديد الصورة</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm">اضغط لرفع صورة الوصل</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </>
            )}

            {paymentMethod === "cash" && (
              <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg text-sm">
                <p className="text-amber-900 dark:text-amber-100">✓ سيتم تفعيل VIP الخاص بك فوراً بعد تأكيد الدفع.</p>
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-lg font-bold">
                <span>المبلغ:</span>
                <span className="text-primary">{amount.toLocaleString()} د.ج</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setLocation("/vip-upgrade")} disabled={processing}>إلغاء</Button>
          <Button onClick={handlePayment} disabled={processing} className="flex-1">
            {processing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            {paymentMethod === "card" ? "إرسال الوصل" : "تفعيل VIP"}
          </Button>
        </div>
      </div>
    </div>
  );
}

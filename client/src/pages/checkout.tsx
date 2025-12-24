import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Banknote, Percent, Check, Upload } from "lucide-react";
import { doc, addDoc, collection, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { uploadToImgBB } from "@/lib/imgbb";

export default function Checkout() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "installment">("card");
  const [processing, setProcessing] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>("");
  const [installmentMonths, setInstallmentMonths] = useState(3);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [isVIPUpgrade, setIsVIPUpgrade] = useState(false);
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const pending = localStorage.getItem("pendingOrderId");
    const vipUpgrade = localStorage.getItem("pendingVIPUpgrade");
    
    if (pending) {
      setOrderId(pending);
      const orderAmount = localStorage.getItem("pendingOrderAmount");
      setAmount(parseInt(orderAmount || "0"));
    } else if (vipUpgrade) {
      setIsVIPUpgrade(true);
      setAmount(9999);
      setPaymentMethod("card"); // VIP لا يدعم التقسيط
    }
  }, []);

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setReceiptPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  const downPayment = Math.ceil(amount * 0.3);
  const monthlyPayment = Math.ceil((amount - downPayment) / installmentMonths);

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
      
      // رفع الوصل على imgBB إذا كان CIB
      if (paymentMethod === "card" && receiptFile) {
        receiptUrl = await uploadToImgBB(receiptFile);
      }

      // إنشاء سجل الدفع
      const paymentData = {
        userId: user.uid,
        userEmail: user.email,
        amount: amount,
        method: paymentMethod,
        status: paymentMethod === "cash" ? "pending" : paymentMethod === "card" ? "pending" : "completed",
        orderId: orderId || undefined,
        vipUpgrade: isVIPUpgrade,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const paymentRef = await addDoc(collection(db, "payments"), paymentData);

      // إذا كان CIB، أنشئ سجل الوصل
      if (paymentMethod === "card") {
        await addDoc(collection(db, "cibReceipts"), {
          paymentId: paymentRef.id,
          userId: user.uid,
          userEmail: user.email,
          receiptImageUrl: receiptUrl,
          amount: amount,
          orderId: orderId || undefined,
          vipUpgrade: isVIPUpgrade,
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // إذا كان VIP upgrade
      if (isVIPUpgrade && paymentMethod !== "cash") {
        await updateDoc(doc(db, "users", user.uid), {
          vipStatus: "vip",
          vipUpgradedAt: Date.now(),
          updatedAt: Date.now(),
        });
        await refreshUser();
      }

      // إذا كان تقسيط
      if (paymentMethod === "installment") {
        await addDoc(collection(db, "installments"), {
          paymentId: paymentRef.id,
          userId: user.uid,
          totalAmount: amount,
          downPayment: downPayment,
          remainingAmount: amount - downPayment,
          monthlyInstallment: monthlyPayment,
          numberOfMonths: installmentMonths,
          paidInstallments: 1,
          nextDueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
          status: "active",
          createdAt: Date.now(),
        });
      }

      // تنظيف localStorage
      localStorage.removeItem("pendingOrderId");
      localStorage.removeItem("pendingOrderAmount");
      localStorage.removeItem("pendingVIPUpgrade");
      localStorage.removeItem("vipAmount");

      toast({
        title: paymentMethod === "card" ? "تم استلام الوصل" : "نجح الدفع",
        description: paymentMethod === "card" ? "سيتم التحقق من الوصل خلال ساعات" : paymentMethod === "cash" ? "تسجيل الطلب للدفع عند الاستلام" : "تسجيل الأقساط",
      });

      setLocation(isVIPUpgrade ? (user?.role === "seller" ? "/seller" : "/browse") : "/orders");
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
      <div className="max-w-2xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">الدفع</h1>

        <div className={`grid ${localStorage.getItem("pendingOrderId") ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4 mb-8`}>
          {/* بطاقة CIB */}
          <Card
            className={`cursor-pointer transition ${
              paymentMethod === "card"
                ? "border-primary bg-primary/5"
                : "hover:border-primary/50"
            }`}
            onClick={() => setPaymentMethod("card")}
          >
            <CardContent className="p-6 text-center">
              <CreditCard className="h-8 w-8 mx-auto mb-3 text-blue-500" />
              <h3 className="font-semibold mb-2">بطاقة CIB</h3>
              <p className="text-sm text-muted-foreground">دفع فوري آمن</p>
              {paymentMethod === "card" && (
                <Check className="h-5 w-5 mx-auto mt-2 text-green-500" />
              )}
            </CardContent>
          </Card>

          {/* دفع نقدي */}
          <Card
            className={`cursor-pointer transition ${
              paymentMethod === "cash"
                ? "border-primary bg-primary/5"
                : "hover:border-primary/50"
            }`}
            onClick={() => setPaymentMethod("cash")}
          >
            <CardContent className="p-6 text-center">
              <Banknote className="h-8 w-8 mx-auto mb-3 text-green-500" />
              <h3 className="font-semibold mb-2">دفع نقدي</h3>
              <p className="text-sm text-muted-foreground">{localStorage.getItem("pendingVIPUpgrade") ? "الدفع عند التفعيل" : "عند الاستلام"}</p>
              {paymentMethod === "cash" && (
                <Check className="h-5 w-5 mx-auto mt-2 text-green-500" />
              )}
            </CardContent>
          </Card>

          {/* تقسيط - يظهر فقط عند شراء الاضاحي وليس VIP */}
          {localStorage.getItem("pendingOrderId") && !localStorage.getItem("pendingVIPUpgrade") && (
            <Card
              className={`cursor-pointer transition ${
                paymentMethod === "installment"
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => setPaymentMethod("installment")}
            >
              <CardContent className="p-6 text-center">
                <Percent className="h-8 w-8 mx-auto mb-3 text-orange-500" />
                <h3 className="font-semibold mb-2">تقسيط</h3>
                <p className="text-sm text-muted-foreground">أقساط مرنة</p>
                {paymentMethod === "installment" && (
                  <Check className="h-5 w-5 mx-auto mt-2 text-green-500" />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* تفاصيل الدفع */}
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
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      className="hidden"
                      id="receipt-input"
                    />
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

            {paymentMethod === "installment" && (
              <>
                <div>
                  <Label>عدد الأقساط</Label>
                  <select
                    value={installmentMonths}
                    onChange={(e) => setInstallmentMonths(parseInt(e.target.value))}
                    className="w-full p-2 border rounded-md"
                  >
                    {[3, 6, 9, 12].map((month) => (
                      <option key={month} value={month}>
                        {month} أشهر
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>الدفعة الأولى:</span>
                    <Badge>{downPayment.toLocaleString()} د.ج</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>القسط الشهري:</span>
                    <Badge variant="outline">{monthlyPayment.toLocaleString()} د.ج</Badge>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>إجمالي الأقساط:</span>
                    <span>{installmentMonths}</span>
                  </div>
                </div>
              </>
            )}

            {paymentMethod === "cash" && (
              <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg text-sm">
                <p className="text-amber-900 dark:text-amber-100">
                  ✓ سيتم تسجيل طلبك كـ "قيد الانتظار" حتى يتم تأكيد الدفع من قبل الإدارة عند استلامك للمنتج.
                </p>
              </div>
            )}

            {/* ملخص الدفع */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-lg font-bold">
                <span>المبلغ الإجمالي:</span>
                <span className="text-primary">{amount.toLocaleString()} د.ج</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* أزرار الإجراء */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/browse")}
            disabled={processing}
          >
            إلغاء
          </Button>
          <Button onClick={handlePayment} disabled={processing} className="flex-1">
            {processing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
            {paymentMethod === "card"
              ? "إرسال الوصل"
              : paymentMethod === "cash"
              ? "تأكيد الدفع عند الاستلام"
              : "تطبيق الأقساط"}
          </Button>
        </div>
      </div>
    </div>
  );
}

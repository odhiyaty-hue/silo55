import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Order {
  id: string;
  sheepId: string;
  sellerId: string;
  buyerId: string;
  totalPrice: number;
  paymentMethod: "cash" | "card" | "installment";
  paymentStatus: "pending" | "verified" | "rejected" | "completed";
  orderStatus: "new" | "preparing" | "shipping" | "delivered" | "cancelled";
  createdAt: number;
  sheepPrice?: number;
  sheepAge?: number;
  sheepWeight?: number;
  sheepImages?: string[];
  sheepType?: string;
  sheepDescription?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerAddress?: string;
  sellerCity?: string;
  buyerName?: string;
  buyerEmail?: string;
  notes?: string;
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const orderId = params?.id || new URL(window.location.href).pathname.split("/").pop();

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    const fetchOrder = async () => {
      try {
        const orderRef = doc(db, "orders", orderId || "");
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
          setLocation("/orders");
          toast({
            title: "خطأ",
            description: "الطلب غير موجود",
            variant: "destructive",
          });
          return;
        }

        const orderData = orderSnap.data() as Order;

        // التحقق من صلاحية العرض
        if (user.uid !== orderData.buyerId && user.uid !== orderData.sellerId && user.role !== "admin") {
          setLocation("/orders");
          toast({
            title: "خطأ",
            description: "لا توجد صلاحيات لعرض هذا الطلب",
            variant: "destructive",
          });
          return;
        }

        // جلب بيانات الأغنم
        if (orderData.sheepId) {
          try {
            const sheepRef = doc(db, "sheep", orderData.sheepId);
            const sheepSnap = await getDoc(sheepRef);
            if (sheepSnap.exists()) {
              const sheepData = sheepSnap.data();
              orderData.sheepImages = sheepData.images || [];
              orderData.sheepType = sheepData.type || "غنم";
              orderData.sheepAge = sheepData.age;
              orderData.sheepWeight = sheepData.weight;
              orderData.sheepDescription = sheepData.description;
            }
          } catch (err) {
            console.error("Error fetching sheep details:", err);
          }
        }

        // جلب بيانات البائع
        if (orderData.sellerId) {
          try {
            const sellerRef = doc(db, "users", orderData.sellerId);
            const sellerSnap = await getDoc(sellerRef);
            if (sellerSnap.exists()) {
              const sellerData = sellerSnap.data();
              orderData.sellerName = sellerData.fullName || sellerData.email;
              orderData.sellerPhone = sellerData.phone;
              orderData.sellerAddress = sellerData.address;
              orderData.sellerCity = sellerData.city;
            }
          } catch (err) {
            console.error("Error fetching seller details:", err);
          }
        }

        // جلب بيانات المشتري
        if (orderData.buyerId) {
          try {
            const buyerRef = doc(db, "users", orderData.buyerId);
            const buyerSnap = await getDoc(buyerRef);
            if (buyerSnap.exists()) {
              const buyerData = buyerSnap.data();
              orderData.buyerName = buyerData.fullName || buyerData.email;
              orderData.buyerEmail = buyerData.email;
            }
          } catch (err) {
            console.error("Error fetching buyer details:", err);
          }
        }

        setOrder({
          ...orderData,
          id: orderSnap.id,
        } as Order);
      } catch (error) {
        console.error("Error fetching order:", error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تحميل الطلب",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, user, setLocation, toast]);

  const handleCancelOrder = async () => {
    if (!order) return;

    setCancelling(true);
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, {
        orderStatus: "cancelled",
        updatedAt: Date.now(),
      });

      toast({
        title: "تم الإلغاء",
        description: "تم إلغاء الطلب بنجاح",
      });

      setOrder({ ...order, orderStatus: "cancelled" });
      setCancelDialogOpen(false);
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast({
        title: "خطأ",
        description: "فشل إلغاء الطلب",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
      <Header />
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12">
          <p className="text-center text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
      <Header />
        <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12">
          <p className="text-center text-muted-foreground">الطلب غير موجود</p>
        </div>
      </div>
    );
  }

  const canCancel =
    user?.uid === order.buyerId && ["new", "preparing"].includes(order.orderStatus);
  const isShipping = order.orderStatus === "shipping";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        {/* الزر الخلفي */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setLocation("/orders")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          العودة للطلبات
        </Button>

        {/* عنوان الطلب */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">طلب #{order.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground">
              {format(new Date(order.createdAt), "EEEE, dd MMM yyyy", { locale: ar })}
            </p>
          </div>
          <Badge className="bg-primary text-white py-2 px-4 text-base">
            {order.orderStatus === "new" && "🆕 جديد"}
            {order.orderStatus === "preparing" && "⚙️ قيد التحضير"}
            {order.orderStatus === "shipping" && "🚚 في الطريق"}
            {order.orderStatus === "delivered" && "✅ مكتمل"}
            {order.orderStatus === "cancelled" && "❌ ملغى"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* العمود الرئيسي */}
          <div className="lg:col-span-2 space-y-6">
            {/* تفاصيل الأضحية */}
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل الأضحية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* الصور */}
                {order.sheepImages && order.sheepImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">الصور</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {order.sheepImages.map((image, idx) => (
                        <img
                          key={idx}
                          src={image}
                          alt={`صورة الأضحية ${idx + 1}`}
                          className="w-full h-32 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* المواصفات */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">النوع</p>
                    <p className="font-semibold">{order.sheepType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">العمر</p>
                    <p className="font-semibold">{order.sheepAge} شهر</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الوزن</p>
                    <p className="font-semibold">{order.sheepWeight} كغ</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">السعر</p>
                    <p className="font-semibold text-primary">{order.sheepPrice} د.ج</p>
                  </div>
                </div>

                {order.sheepDescription && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">الوصف</p>
                    <p className="text-sm">{order.sheepDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* حالة الطلب - Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>حالة الطلب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Timeline */}
                  <div className="space-y-3">
                    {[
                      { status: "new", label: "تم استلام الطلب", icon: CheckCircle },
                      { status: "preparing", label: "قيد التجهيز", icon: Clock },
                      { status: "shipping", label: "في الطريق", icon: Truck },
                      { status: "delivered", label: "مكتمل", icon: CheckCircle },
                    ].map((step) => {
                      const stepIndex = ["new", "preparing", "shipping", "delivered"].indexOf(
                        step.status
                      );
                      const currentIndex = ["new", "preparing", "shipping", "delivered"].indexOf(
                        order.orderStatus
                      );
                      const isCompleted = stepIndex <= currentIndex;
                      const isCurrent = stepIndex === currentIndex;

                      return (
                        <div key={step.status} className="flex items-start gap-4">
                          <div
                            className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isCompleted
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <step.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p
                              className={`font-semibold ${
                                isCurrent ? "text-primary" : ""
                              }`}
                            >
                              {step.label}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* رسالة في الطريق */}
                  {isShipping && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                      <Truck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-900">طلبك في الطريق</p>
                        <p className="text-sm text-blue-700">
                          سيصل إليك قريباً. يمكنك التواصل مع البائع للاستفسار عن التفاصيل
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* معلومات الدفع */}
            <Card>
              <CardHeader>
                <CardTitle>معلومات الدفع</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">طريقة الدفع</p>
                    <p className="font-semibold">
                      {order.paymentMethod === "card"
                        ? "💳 تحويل بنكي"
                        : order.paymentMethod === "cash"
                        ? "💵 دفع عند الاستلام"
                        : "📅 تقسيط"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">حالة الدفع</p>
                    <div className="flex items-center gap-2">
                      {order.paymentStatus === "completed" ||
                      order.paymentStatus === "verified" ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <p className="font-semibold text-green-600">✅ مدفوع</p>
                        </>
                      ) : order.paymentStatus === "pending" ? (
                        <>
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <p className="font-semibold text-yellow-600">⏳ قيد التحقق</p>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <p className="font-semibold text-red-600">❌ مرفوض</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {order.paymentMethod === "cash" && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      💵 الدفع عند الاستلام: ستدفع المبلغ الكامل عند استقبال الأضحية
                    </p>
                  </div>
                )}

                {order.paymentMethod === "card" && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-semibold text-purple-900 mb-2">
                      💳 تحويل بنكي CIB
                    </p>
                    <p className="text-xs text-purple-700">
                      يرجى التحويل إلى حساب البائع ورفع الإيصال للتحقق من الدفع
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* العمود الجانبي */}
          <div className="space-y-6">
            {/* معلومات الملخص */}
            <Card>
              <CardHeader>
                <CardTitle>ملخص الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-t pt-4">
                  <div className="flex justify-between mb-2">
                    <p className="text-muted-foreground">السعر</p>
                    <p className="font-semibold">{order.sheepPrice?.toLocaleString()} د.ج</p>
                  </div>
                  <div className="flex justify-between mb-2">
                    <p className="text-muted-foreground">الخصم</p>
                    <p className="font-semibold">0 د.ج</p>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between">
                    <p className="font-bold">الإجمالي</p>
                    <p className="font-bold text-lg text-primary">
                      {order.totalPrice?.toLocaleString()} د.ج
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* معلومات البائع */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">بيانات البائع</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">الاسم</p>
                  <p className="font-semibold text-sm">{order.sellerName}</p>
                </div>
                {order.sellerPhone && (
                  <div>
                    <p className="text-xs text-muted-foreground">الهاتف</p>
                    <p className="font-semibold text-sm">{order.sellerPhone}</p>
                  </div>
                )}
                {order.sellerCity && (
                  <div>
                    <p className="text-xs text-muted-foreground">المدينة</p>
                    <p className="font-semibold text-sm">{order.sellerCity}</p>
                  </div>
                )}
                <div className="space-y-2 pt-2 border-t">
                  {order.sellerPhone && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => window.open(`tel:${order.sellerPhone}`, "_blank")}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      اتصال
                    </Button>
                  )}
                  {order.sellerPhone && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        window.open(
                          `https://wa.me/${order.sellerPhone!.replace(/\D/g, "")}?text=السلام عليكم، أتواصل معك بخصوص الطلب ${order.id}`,
                          "_blank"
                        );
                      }}
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      واتساب
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* الإجراءات */}
            {canCancel && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    إلغاء الطلب
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog تأكيد الإلغاء */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إلغاء الطلب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ لن يمكن التراجع عن هذا الإجراء إذا بدأ
              البائع في التحضير.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              الإلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={cancelling}
            >
              {cancelling ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

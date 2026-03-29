import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import PrintInvoice from "@/components/PrintInvoice";
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
  XCircle,
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
  status: "pending" | "confirmed" | "rejected" | "delivered";
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

    if (!orderId) return;

    const orderRef = doc(db, "orders", orderId);

    // الاستماع للتغييرات في الوقت الفعلي
    const unsubscribe = onSnapshot(
      orderRef,
      async (orderSnap) => {
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
            title: "غير مسموح",
            description: "ليس لديك صلاحية لعرض هذا الطلب",
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
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to order:", error);
        toast({
          title: "خطأ",
          description: "حدث خطأ في تحميل الطلب",
          variant: "destructive",
        });
        setLoading(false);
      }
    );

    // إلغاء الاشتراك عند مغادرة الصفحة
    return () => unsubscribe();
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

      // تحديث حالة الأضحية لتصبح متاحة مجدداً
      if (order.sheepId) {
        const sheepRef = doc(db, "sheep", order.sheepId);
        await updateDoc(sheepRef, { isSold: false });
      }

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
          {order.status === "confirmed" && (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => window.print()}
            >
              <CheckCircle className="ml-2 h-4 w-4" />
              طباعة فاتورة الشراء
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* العمود الرئيسي */}
          <div className="lg:col-span-2 space-y-6">
            {/* تفاصيل الأضحية */}
            <Card>
              <CardHeader>
                <CardTitle className="text-right">تفاصيل الأضحية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* الصور */}
                {order.sheepImages && order.sheepImages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-right">الصور</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {order.sheepImages.map((image, idx) => (
                        <div key={idx} className="aspect-video sm:aspect-square relative rounded-lg overflow-hidden border">
                          <img
                            src={image}
                            alt={`صورة الأضحية ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* المواصفات */}
                <div className="grid grid-cols-2 gap-4 text-right">
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
                    <p className="font-semibold text-primary">{order.sheepPrice?.toLocaleString()} د.ج</p>
                  </div>
                </div>

                {order.sheepDescription && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-2">الوصف</p>
                    <p className="text-sm">{order.sheepDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* حالة الطلب */}
            <Card>
              <CardHeader>
                <CardTitle>حالة الطلب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                    order.status === "confirmed" ? "bg-green-100 text-green-600" :
                    order.status === "rejected" ? "bg-red-100 text-red-600" :
                    "bg-yellow-100 text-yellow-600"
                  }`}>
                    {order.status === "confirmed" ? <CheckCircle className="h-10 w-10" /> :
                     order.status === "rejected" ? <XCircle className="h-10 w-10" /> :
                     <Clock className="h-10 w-10" />}
                  </div>
                  <div className="text-center">
                    <p className={`text-xl font-bold ${
                      order.status === "confirmed" ? "text-green-600" :
                      order.status === "rejected" ? "text-red-600" :
                      "text-yellow-600"
                    }`}>
                      {order.status === "confirmed" ? "تم تأكيد الطلب" :
                       order.status === "rejected" ? "تم رفض الطلب" :
                       "الطلب قيد المراجعة"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.status === "confirmed" ? "لقد تم قبول طلبك بنجاح" :
                       order.status === "rejected" ? "نعتذر، لقد تم رفض الطلب" :
                       "فريقنا يقوم حالياً بمراجعة طلبك"}
                    </p>
                  </div>
                </div>
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

            {/* معلومات البائع (تظهر للأدمن فقط) */}
            {user.role === "admin" && (
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
            )}

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
      {/* قسم الفاتورة المخفي (يظهر عند الطباعة فقط) */}
      {order.status === "confirmed" && (
        <div className="hidden print:block">
          <PrintInvoice order={order} type="buyer" />
        </div>
      )}
    </div>
  );
}

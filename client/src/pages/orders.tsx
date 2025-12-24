import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ShoppingBag, Calendar, DollarSign, Truck } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface OrderItem {
  id: string;
  sheepId: string;
  sellerId: string;
  buyerId: string;
  totalPrice: number;
  paymentMethod: "cash" | "card" | "installment";
  paymentStatus: "pending" | "verified" | "rejected" | "completed";
  orderStatus: "new" | "preparing" | "shipping" | "delivered" | "cancelled";
  createdAt: number;
  // Sheep details
  sheepPrice?: number;
  sheepAge?: number;
  sheepWeight?: number;
  sheepImages?: string[];
  sheepType?: string;
  // Seller info
  sellerName?: string;
  sellerPhone?: string;
  // Buyer info
  buyerName?: string;
  buyerEmail?: string;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    const fetchOrders = async () => {
      try {
        const ordersData: OrderItem[] = [];

        // جلب الطلبات التي يكون المستخدم هو المشتري فيها
        const buyerQuery = query(collection(db, "orders"), where("buyerId", "==", user.uid));
        const buyerSnapshot = await getDocs(buyerQuery);

        const processOrder = async (orderDoc: any) => {
          const orderData = orderDoc.data();

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
              }
            } catch (err) {
              console.error("Error fetching seller details:", err);
            }
          }

          ordersData.push({
            id: orderDoc.id,
            ...orderData,
          } as OrderItem);
        };

        // معالجة جميع الطلبات
        for (const orderDoc of buyerSnapshot.docs) {
          await processOrder(orderDoc);
        }

        setOrders(ordersData.sort((a, b) => b.createdAt - a.createdAt));
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, setLocation]);

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "preparing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "shipping":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-50 text-green-700";
      case "verified":
        return "bg-green-50 text-green-700";
      case "pending":
        return "bg-yellow-50 text-yellow-700";
      case "rejected":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case "new":
        return "🆕 جديد";
      case "preparing":
        return "⚙️ قيد التحضير";
      case "shipping":
        return "🚚 في الطريق";
      case "delivered":
        return "✅ مكتمل";
      case "cancelled":
        return "❌ ملغى";
      default:
        return status;
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "قيد التحقق";
      case "verified":
        return "✅ مدفوع";
      case "completed":
        return "✅ مدفوع";
      case "rejected":
        return "❌ مرفوض";
      default:
        return status;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "card":
        return "💳 تحويل بنكي";
      case "cash":
        return "💵 دفع عند الاستلام";
      case "installment":
        return "📅 تقسيط";
      default:
        return method;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">طلباتي</h1>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-lg text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg text-muted-foreground mb-4">لم تقم بأي طلبات حتى الآن</p>
              <Button onClick={() => setLocation("/browse")}>تصفح الأضاحي</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* صورة الأغنم */}
                    <div className="flex-shrink-0">
                      {order.sheepImages && order.sheepImages.length > 0 ? (
                        <img
                          src={order.sheepImages[0]}
                          alt="الأضحية"
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* معلومات الطلب الأساسية */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">رقم الطلب</p>
                          <p className="font-mono text-sm font-semibold">{order.id.slice(0, 8)}</p>
                        </div>
                        <Badge className={getOrderStatusColor(order.orderStatus)}>
                          {getOrderStatusLabel(order.orderStatus)}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">نوع الأضحية</p>
                        <p className="text-sm font-medium">{order.sheepType}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(order.createdAt), "dd MMM yyyy", { locale: ar })}
                      </div>
                    </div>

                    {/* معلومات السعر والدفع */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">السعر الإجمالي</p>
                        <p className="font-bold text-lg text-primary">
                          {order.totalPrice.toLocaleString()} د.ج
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">طريقة الدفع</p>
                        <p className="text-sm">{getPaymentMethodLabel(order.paymentMethod)}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={getPaymentStatusColor(order.paymentStatus)}
                      >
                        {getPaymentStatusLabel(order.paymentStatus)}
                      </Badge>
                    </div>

                    {/* الإجراءات */}
                    <div className="flex flex-col gap-2 justify-start">
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => setLocation(`/order/${order.id}`)}
                      >
                        عرض التفاصيل
                      </Button>
                      {order.sellerPhone && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            window.open(
                              `https://wa.me/${order.sellerPhone.replace(/\D/g, "")}?text=السلام عليكم، أتواصل معك بخصوص الطلب ${order.id}`,
                              "_blank"
                            );
                          }}
                        >
                          واتساب البائع
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
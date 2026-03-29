import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ShoppingBag, Phone, Mail, MapPin, Tag } from "lucide-react";

interface PrintInvoiceProps {
  order: any;
  type: "admin" | "buyer" | "seller";
  sellerData?: any;
}

export default function PrintInvoice({ order, type, sellerData }: PrintInvoiceProps) {
  const isBuyer = type === "buyer";
  const isSeller = type === "seller";
  const isAdmin = type === "admin";

  // معلومات البائع حسب نوع الفاتورة
  const displaySellerName = isBuyer ? "odhiyaty" : (sellerData?.fullName || order.sellerName || "البائع");
  const displaySellerEmail = isBuyer ? "odhiyaty@gmail.com" : (sellerData?.email || order.sellerEmail || "-");
  
  // معلومات المشتري حسب نوع الفاتورة
  const displayBuyerName = isSeller ? "odhiyaty" : (order.buyerName || "المشتري");
  const displayBuyerEmail = isSeller ? "odhiyaty@gmail.com" : (order.buyerEmail || "-");

  const formatDate = (timestamp: number) => {
    try {
      return format(new Date(timestamp), "dd/MM/yyyy", { locale: ar });
    } catch {
      return "-";
    }
  };

  return (
    <div className="bg-white text-black p-8 font-sans w-full min-h-screen printable-area" dir="rtl">
      {/* هيدر الفاتورة */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900">
            {isBuyer ? "فاتورة شراء" : isSeller ? "فاتورة بيع" : "فاتورة طلب (إدارة)"}
          </h1>
          <p className="text-lg text-slate-600 mt-2 font-medium">تاريخ الفاتورة: {formatDate(Date.now())}</p>
        </div>
        <div className="text-left bg-slate-100 p-4 rounded-lg">
          <p className="text-sm text-slate-500 font-bold mb-1">رقم الطلب</p>
          <p className="text-xl font-bold font-mono">#{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-10">
        {/* قسم المشتري */}
        <div className="border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-bold bg-slate-100 p-2 rounded mb-4 text-slate-800 border-r-4 border-primary">
            معلومات المشتري
          </h3>
          <div className="space-y-3 text-lg">
            <p className="flex justify-between">
              <span className="text-slate-500 font-medium">الاسم الكامل:</span> 
              <span className="font-semibold">{displayBuyerName}</span>
            </p>
            {!isSeller && (
              <>
                <p className="flex justify-between">
                  <span className="text-slate-500 font-medium">الهاتف:</span> 
                  <span className="font-semibold">{order.buyerPhone || "-"}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500 font-medium">المدينة:</span> 
                  <span className="font-semibold">{order.buyerCity || "-"}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500 font-medium">العنوان:</span> 
                  <span className="font-semibold truncate max-w-[200px]">{order.buyerAddress || "-"}</span>
                </p>
              </>
            )}
            <p className="flex justify-between">
              <span className="text-slate-500 font-medium">البريد:</span> 
              <span className="font-semibold">{displayBuyerEmail}</span>
            </p>
          </div>
        </div>

        {/* قسم البائع - يظهر بشكل مختصر جداً للمشتري */}
        <div className="border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-bold bg-slate-100 p-2 rounded mb-4 text-slate-800 border-r-4 border-primary">
            معلومات البائع
          </h3>
          <div className="space-y-3 text-lg">
            <p className="flex justify-between">
              <span className="text-slate-500 font-medium">الاسم:</span> 
              <span className="font-semibold">{displaySellerName}</span>
            </p>
            {!isBuyer && (
              <>
                <p className="flex justify-between">
                  <span className="text-slate-500 font-medium">الهاتف:</span> 
                  <span className="font-semibold">{sellerData?.phone || order.sellerPhone || "-"}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500 font-medium">المدينة:</span> 
                  <span className="font-semibold">{sellerData?.city || order.sellerCity || "-"}</span>
                </p>
                {sellerData?.address && (
                  <p className="flex justify-between">
                    <span className="text-slate-500 font-medium">العنوان:</span> 
                    <span className="font-semibold">{sellerData.address}</span>
                  </p>
                )}
                <p className="flex justify-between">
                  <span className="text-slate-500 font-medium">البريد:</span> 
                  <span className="font-semibold">{sellerData?.email || order.sellerEmail || "-"}</span>
                </p>
              </>
            )}
            {isBuyer && (
              <p className="flex justify-between">
                <span className="text-slate-500 font-medium">البريد:</span> 
                <span className="font-semibold">{displaySellerEmail}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* تفاصيل المنتج */}
      <div className="border border-slate-200 rounded-xl p-6 mb-10 shadow-sm">
        <h3 className="text-xl font-bold bg-slate-100 p-2 rounded mb-4 text-slate-800 border-r-4 border-primary">
          تفاصيل الأضحية
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-lg">
          <div className="flex flex-col">
            <span className="text-slate-500 font-medium">النوع</span>
            <span className="font-semibold">{order.sheepType || "-"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 font-medium">الوزن</span>
            <span className="font-semibold">{order.sheepWeight || "-"} كجم</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 font-medium">العمر</span>
            <span className="font-semibold">{order.sheepAge || "-"} شهر</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 font-medium">رقم الطلب المختصر</span>
            <span className="font-semibold">{order.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      {/* الخلاصة المبلغ */}
      <div className="flex justify-end pt-6 mt-12 border-t border-slate-300">
        <div className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl p-8">
          <div className="flex justify-between items-center text-2xl font-black text-slate-900 border-b border-slate-200 pb-4 mb-4">
            <span>المبلغ الإجمالي</span>
            <span className="text-primary">{order.totalPrice.toLocaleString()} د.ج</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold text-slate-800">
            <span>الحالة</span>
            <span className="text-green-600 bg-green-100 px-4 py-1 rounded-full">
              {order.status === "confirmed" ? "مؤكد" : "مكتمل"}
            </span>
          </div>
          <div className="text-center mt-8 text-slate-500 font-medium text-sm">
            <p>تم استخراج هذه الفاتورة آلياً من منصة odhiyaty</p>
            <p className="mt-1">جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: A4;
          margin: 10mm;
        }
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: 100%;
            overflow: hidden;
            padding: 20px !important;
            margin: 0 !important;
          }
          /* تصغير حجم الخط لضمان احتواء الفاتورة في صفحة واحدة */
          h1 { font-size: 24pt !important; }
          h3 { font-size: 16pt !important; }
          p, span { font-size: 12pt !important; }
          .shadow-sm { box-shadow: none !important; }
          .rounded-xl { border-radius: 4px !important; }
        }
      `}} />
    </div>
  );
}

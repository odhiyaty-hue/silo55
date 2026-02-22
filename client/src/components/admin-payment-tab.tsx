import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CIBReceipt, Payment, VIP_PACKAGES } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Loader2, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminPaymentTab() {
  const { toast } = useToast();
  const [cibReceipts, setCIBReceipts] = useState<CIBReceipt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<CIBReceipt | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      const [receiptsSnapshot, paymentsSnapshot] = await Promise.all([
        getDocs(collection(db, "cibReceipts")),
        getDocs(collection(db, "payments")),
      ]);

      const receiptsData = receiptsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CIBReceipt[];

      const paymentsData = paymentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Payment[];

      setCIBReceipts(receiptsData.sort((a, b) => b.createdAt - a.createdAt));
      setPayments(paymentsData.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Error fetching payment data:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل بيانات الدفع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReceipt = async () => {
    if (!selectedReceipt) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, "cibReceipts", selectedReceipt.id), {
        status: "verified",
        verifiedBy: "admin",
        verifiedAt: Date.now(),
        updatedAt: Date.now(),
      });

      if (selectedReceipt.vipUpgrade) {
        const vipPackage = selectedReceipt.vipPackage || "silver";
        const pkg = VIP_PACKAGES[vipPackage as keyof typeof VIP_PACKAGES];
        const expiresAt = Date.now() + pkg.duration * 24 * 60 * 60 * 1000;

        await updateDoc(doc(db, "users", selectedReceipt.userId), {
          vipStatus: vipPackage,
          vipPackage: vipPackage,
          vipUpgradedAt: Date.now(),
          vipExpiresAt: expiresAt,
          rewardPoints: 100,
          updatedAt: Date.now(),
        });
      }

      toast({
        title: "تم التحقق من الوصل",
        description: "تم تفعيل الترقية VIP بنجاح",
      });

      setSelectedReceipt(null);
      fetchPaymentData();
    } catch (error) {
      console.error("Error verifying receipt:", error);
      toast({
        title: "خطأ",
        description: "فشل التحقق من الوصل",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectReceipt = async () => {
    if (!selectedReceipt) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, "cibReceipts", selectedReceipt.id), {
        status: "rejected",
        rejectionReason: rejectionReason,
        verifiedBy: "admin",
        verifiedAt: Date.now(),
        updatedAt: Date.now(),
      });

      toast({
        title: "تم رفض الوصل",
        description: "تم إخطار المستخدم برفض الوصل",
      });

      setSelectedReceipt(null);
      setRejectionReason("");
      fetchPaymentData();
    } catch (error) {
      console.error("Error rejecting receipt:", error);
      toast({
        title: "خطأ",
        description: "فشل رفض الوصل",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const pendingReceipts = cibReceipts.filter((r) => r.status === "pending");
  const verifiedReceipts = cibReceipts.filter((r) => r.status === "verified");
  const rejectedReceipts = cibReceipts.filter((r) => r.status === "rejected");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            في الانتظار
          </Badge>
        );
      case "verified":
        return (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
            <CheckCircle className="h-3 w-3 mr-1" />
            تم التحقق
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            مرفوض
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/30 dark:bg-yellow-900/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{pendingReceipts.length}</div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mt-2">وصلات في الانتظار</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-900/50 bg-green-50/30 dark:bg-green-900/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-500">{verifiedReceipts.length}</div>
              <p className="text-sm font-medium text-green-800 dark:text-green-400 mt-2">وصلات موثقة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-500">{rejectedReceipts.length}</div>
              <p className="text-sm font-medium text-red-800 dark:text-red-400 mt-2">وصلات مرفوضة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">وصلات التحويل البنكي (CIB)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[150px]">البريد الإلكتروني</TableHead>
                    <TableHead className="min-w-[100px]">المبلغ</TableHead>
                    <TableHead className="min-w-[120px]">النوع</TableHead>
                    <TableHead className="min-w-[120px]">التاريخ</TableHead>
                    <TableHead className="min-w-[100px]">الحالة</TableHead>
                    <TableHead className="text-left min-w-[100px]">الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cibReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        لا توجد وصلات حالياً
                      </TableCell>
                    </TableRow>
                  ) : (
                    cibReceipts.map((receipt) => (
                      <TableRow key={receipt.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium truncate max-w-[150px]">{receipt.userEmail}</TableCell>
                        <TableCell className="font-bold">{receipt.amount.toLocaleString()} د.ج</TableCell>
                        <TableCell>
                          {receipt.vipUpgrade ? (
                            <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800">
                              ترقية VIP
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                              طلب شراء
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{new Date(receipt.createdAt).toLocaleDateString("ar-DZ")}</TableCell>
                        <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                        <TableCell className="text-left">
                          {receipt.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1"
                              onClick={() => setSelectedReceipt(receipt)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">مراجعة</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">إجمالي المدفوعات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="min-w-[150px]">البريد الإلكتروني</TableHead>
                    <TableHead className="min-w-[100px]">المبلغ</TableHead>
                    <TableHead className="min-w-[120px]">طريقة الدفع</TableHead>
                    <TableHead className="min-w-[100px]">الحالة</TableHead>
                    <TableHead className="min-w-[120px]">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        لا توجد مدفوعات حالياً
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.slice(0, 10).map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium truncate max-w-[150px]">{payment.userEmail}</TableCell>
                        <TableCell className="font-bold">{payment.amount.toLocaleString()} د.ج</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.method === "card"
                              ? "تحويل بنكي"
                              : payment.method === "cash"
                              ? "دفع نقدي"
                              : "تقسيط"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString("ar-DZ")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-2xl w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">مراجعة وصل التحويل</DialogTitle>
            <DialogDescription>
              تحقق من تفاصيل الوصل المرفق قبل اتخاذ القرار
            </DialogDescription>
          </DialogHeader>

          {selectedReceipt && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">المستخدم</p>
                  <p className="font-semibold break-all">{selectedReceipt.userEmail}</p>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-xs text-primary/70 uppercase tracking-wider mb-1">المبلغ المطلوب</p>
                  <p className="font-bold text-2xl text-primary">{selectedReceipt.amount.toLocaleString()} د.ج</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm font-medium">سبب الرفض (في حالة الرفض)</Label>
                  <Input
                    id="reason"
                    className="h-12"
                    placeholder="مثال: الصورة غير واضحة"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium mb-1">صورة الوصل</p>
                <div className="relative aspect-[3/4] rounded-lg border-2 border-dashed overflow-hidden group">
                  <img
                    src={selectedReceipt.receiptImageUrl}
                    alt="Receipt"
                    className="w-full h-full object-contain bg-black/5"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <Eye className="text-white h-8 w-8" />
                  </div>
                </div>
                <a 
                  href={selectedReceipt.receiptImageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center justify-center gap-1 mt-2"
                >
                  فتح الصورة في نافذة جديدة
                </a>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setSelectedReceipt(null)}
              disabled={processing}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-12 gap-2"
              onClick={handleRejectReceipt}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-5 w-5" />}
              رفض الوصل
            </Button>
            <Button
              className="flex-[2] h-12 gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleVerifyReceipt}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
              تأكيد وتفعيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

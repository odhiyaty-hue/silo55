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
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{pendingReceipts.length}</div>
              <p className="text-sm text-muted-foreground mt-2">وصلات في الانتظار</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{verifiedReceipts.length}</div>
              <p className="text-sm text-muted-foreground mt-2">وصلات موثقة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{rejectedReceipts.length}</div>
              <p className="text-sm text-muted-foreground mt-2">وصلات مرفوضة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>وصلات التحويل البنكي (CIB)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cibReceipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.userEmail}</TableCell>
                    <TableCell>{receipt.amount.toLocaleString()} د.ج</TableCell>
                    <TableCell>
                      {receipt.vipUpgrade ? (
                        <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400">
                          ترقية VIP
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                          طلب شراء
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(receipt.createdAt).toLocaleDateString("ar-DZ")}</TableCell>
                    <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                    <TableCell>
                      {receipt.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedReceipt(receipt)}
                        >
                          <Eye className="h-4 w-4" />
                          مراجعة
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إجمالي المدفوعات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 10).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.userEmail}</TableCell>
                    <TableCell>{payment.amount.toLocaleString()} د.ج</TableCell>
                    <TableCell>
                      {payment.method === "card"
                        ? "تحويل بنكي"
                        : payment.method === "cash"
                        ? "دفع نقدي"
                        : "تقسيط"}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>{new Date(payment.createdAt).toLocaleDateString("ar-DZ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>مراجعة وصل التحويل</DialogTitle>
            <DialogDescription>
              تحقق من الوصل وقرر ما إذا كان صحيحًا
            </DialogDescription>
          </DialogHeader>

          {selectedReceipt && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">المستخدم</p>
                <p className="font-semibold">{selectedReceipt.userEmail}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المبلغ</p>
                <p className="font-semibold text-lg">{selectedReceipt.amount.toLocaleString()} د.ج</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">صورة الوصل</p>
                <img
                  src={selectedReceipt.receiptImageUrl}
                  alt="Receipt"
                  className="w-full h-auto rounded-lg border"
                />
              </div>

              <div>
                <Label htmlFor="reason">سبب الرفض (اختياري)</Label>
                <Input
                  id="reason"
                  placeholder="أدخل سبب الرفض إذا لزم الأمر"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={handleRejectReceipt}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              رفض
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleVerifyReceipt}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              قبول وتفعيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

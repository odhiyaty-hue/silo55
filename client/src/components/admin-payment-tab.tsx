import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc, getDoc, query, where, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CIBReceipt, Payment, VIP_PACKAGES } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, XCircle, Clock, Loader2, Eye, Trash2, ShieldCheck, CreditCard, Crown } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminPaymentTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [cibReceipts, setCIBReceipts] = useState<CIBReceipt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<CIBReceipt | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // Selection states
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);

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

      setCIBReceipts(receiptsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      setPayments(paymentsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
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
      console.log("🔍 Verifying receipt:", selectedReceipt.id);
      
      // Check for user ID
      if (!selectedReceipt.userId) {
        throw new Error("لم يتم العثور على معرّف المستخدم في الإيصال");
      }

      // 1. Handle VIP Upgrade if applicable
      if (selectedReceipt.vipUpgrade) {
        console.log("👑 Handling VIP upgrade for user:", selectedReceipt.userId);
        
        const vipPackage = selectedReceipt.vipPackage || "silver";
        const pkg = VIP_PACKAGES[vipPackage as keyof typeof VIP_PACKAGES];
        
        if (!pkg) {
          throw new Error(`باقة VIP غير صالحة: ${vipPackage}`);
        }

        // Verify user exists before updating
        const userRef = doc(db, "users", selectedReceipt.userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          console.error("❌ User document not found for UID:", selectedReceipt.userId);
          throw new Error(`حساب المستخدم غير موجود (UID: ${selectedReceipt.userId}). يرجى التأكد من أن المستخدم قد أكمل تسجيله.`);
        }

        // Calculate expiration date: Now + duration (in days)
        const expiresAt = Date.now() + (pkg.duration * 24 * 60 * 60 * 1000);

        console.log("📝 Updating user document...");
        await updateDoc(userRef, {
          vipStatus: vipPackage as any,
          vipPackage: vipPackage as any,
          vipUpgradedAt: Date.now(),
          vipExpiresAt: expiresAt,
          rewardPoints: 100, // Small welcome bonus
          updatedAt: Date.now(),
        });
        console.log("✅ User VIP status updated successfully");

        // 2. Update the associated payment record
        if (selectedReceipt.paymentId) {
          console.log("💰 Updating payment status...");
          await updateDoc(doc(db, "payments", selectedReceipt.paymentId), {
            status: "completed",
            updatedAt: Date.now(),
          });
          console.log("✅ Payment marked as completed");
        }

        // 3. Mark Receipt as Verified (Last step for full success)
        const receiptRef = doc(db, "cibReceipts", selectedReceipt.id);
        await updateDoc(receiptRef, {
          status: "verified",
          verifiedBy: user?.email || "admin",
          verifiedAt: Date.now(),
          updatedAt: Date.now(),
        });
        console.log("✅ Receipt marked as verified");

        toast({
          title: "تم التحقق وتفعيل الباقة",
          description: `تم تفعيل باقة ${pkg.nameAr} بنجاح لـ ${selectedReceipt.userEmail}. تنتهي في ${new Date(expiresAt).toLocaleDateString("ar-DZ")}`,
        });
      } else {
        // Normal payment (order)
        const receiptRef = doc(db, "cibReceipts", selectedReceipt.id);
        await updateDoc(receiptRef, {
          status: "verified",
          verifiedBy: user?.email || "admin",
          verifiedAt: Date.now(),
          updatedAt: Date.now(),
        });

        if (selectedReceipt.paymentId) {
          await updateDoc(doc(db, "payments", selectedReceipt.paymentId), {
            status: "completed",
            updatedAt: Date.now(),
          });
        }
        toast({
          title: "تم التحقق",
          description: "تم تأكيد الوصل بنجاح.",
        });
      }

      setSelectedReceipt(null);
      fetchPaymentData();
    } catch (error: any) {
      console.error("🔥 Error verifying receipt:", error);
      toast({
        title: "فشل في تأكيد الدفع",
        description: error.message || "فشل التحقق من الوصل، يرجى التأكد من بيانات المستخدم والمحاولة لاحقاً",
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

  // Deletion logic
  const handleDeleteReceipt = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الوصل؟")) return;
    try {
      await deleteDoc(doc(db, "cibReceipts", id));
      toast({ title: "تم الحذف", description: "تم حذف الوصل بنجاح" });
      fetchPaymentData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف الوصل", variant: "destructive" });
    }
  };

  const handleDeleteSelectedReceipts = async () => {
    if (!selectedReceiptIds.length || !confirm(`هل أنت متأكد من حذف ${selectedReceiptIds.length} وصل؟`)) return;
    setProcessing(true);
    try {
      for (const id of selectedReceiptIds) {
        await deleteDoc(doc(db, "cibReceipts", id));
      }
      toast({ title: "تم الحذف", description: `تم حذف ${selectedReceiptIds.length} وصل بنجاح` });
      setSelectedReceiptIds([]);
      fetchPaymentData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف الوصلات المختارة", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا السجل؟")) return;
    try {
      await deleteDoc(doc(db, "payments", id));
      toast({ title: "تم الحذف", description: "تم حذف سجل الدفع بنجاح" });
      fetchPaymentData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف سجل الدفع", variant: "destructive" });
    }
  };

  const handleDeleteSelectedPayments = async () => {
    if (!selectedPaymentIds.length || !confirm(`هل أنت متأكد من حذف ${selectedPaymentIds.length} سجل؟`)) return;
    setProcessing(true);
    try {
      for (const id of selectedPaymentIds) {
        await deleteDoc(doc(db, "payments", id));
      }
      toast({ title: "تم الحذف", description: `تم حذف ${selectedPaymentIds.length} سجل بنجاح` });
      setSelectedPaymentIds([]);
      fetchPaymentData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف السجلات المختارة", variant: "destructive" });
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
            <Clock className="h-3 w-3 ml-1" />
            في الانتظار
          </Badge>
        );
      case "verified":
        return (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
            <ShieldCheck className="h-3 w-3 ml-1" />
            تم التحقق
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-700 dark:text-red-400">
            <XCircle className="h-3 w-3 ml-1" />
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
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-bold">وصلات التحويل البنكي (CIB)</CardTitle>
            <CardDescription>إدارة وصلات الدفع وطلبات الترقية</CardDescription>
          </div>
          {selectedReceiptIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelectedReceipts} disabled={processing}>
              <Trash2 className="ml-2 h-4 w-4" />
              حذف المحدد ({selectedReceiptIds.length})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={cibReceipts.length > 0 && selectedReceiptIds.length === cibReceipts.length}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedReceiptIds(cibReceipts.map(r => r.id));
                          else setSelectedReceiptIds([]);
                        }}
                      />
                    </TableHead>
                    <TableHead className="min-w-[150px]">البريد الإلكتروني</TableHead>
                    <TableHead className="min-w-[100px]">المبلغ</TableHead>
                    <TableHead className="min-w-[120px]">النوع</TableHead>
                    <TableHead className="min-w-[120px]">التاريخ</TableHead>
                    <TableHead className="min-w-[100px]">الحالة</TableHead>
                    <TableHead className="text-left min-w-[120px]">الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cibReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        لا توجد وصلات حالياً
                      </TableCell>
                    </TableRow>
                  ) : (
                    cibReceipts.map((receipt) => (
                      <TableRow key={receipt.id} className={`hover:bg-muted/30 ${receipt.vipUpgrade ? "bg-purple-500/5" : ""}`}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedReceiptIds.includes(receipt.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedReceiptIds(prev => [...prev, receipt.id]);
                              else setSelectedReceiptIds(prev => prev.filter(id => id !== receipt.id));
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium truncate max-w-[150px]">{receipt.userEmail}</TableCell>
                        <TableCell className="font-bold">{receipt.amount.toLocaleString()} د.ج</TableCell>
                        <TableCell>
                          {receipt.vipUpgrade ? (
                            <div className="flex items-center gap-1">
                              <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 gap-1">
                                <CreditCard className="h-3 w-3" />
                                ترقية VIP
                              </Badge>
                            </div>
                          ) : (
                            <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                              طلب شراء
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{new Date(receipt.createdAt).toLocaleDateString("ar-DZ")}</TableCell>
                        <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center justify-end gap-2">
                            {receipt.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 bg-primary/5 hover:bg-primary/10 border-primary/20"
                                onClick={() => setSelectedReceipt(receipt)}
                              >
                                <Eye className="h-3.5 w-3.5 text-primary" />
                                <span className="hidden sm:inline">مراجعة</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteReceipt(receipt.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
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
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-bold">إجمالي المدفوعات</CardTitle>
            <CardDescription>سجل كافة المعاملات المالية في المنصة</CardDescription>
          </div>
          {selectedPaymentIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelectedPayments} disabled={processing}>
              <Trash2 className="ml-2 h-4 w-4" />
              حذف المحدد ({selectedPaymentIds.length})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={payments.length > 0 && selectedPaymentIds.length === payments.length}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedPaymentIds(payments.map(p => p.id));
                          else setSelectedPaymentIds([]);
                        }}
                      />
                    </TableHead>
                    <TableHead className="min-w-[150px]">البريد الإلكتروني</TableHead>
                    <TableHead className="min-w-[100px]">المبلغ</TableHead>
                    <TableHead className="min-w-[120px]">طريقة الدفع</TableHead>
                    <TableHead className="min-w-[100px]">الحالة</TableHead>
                    <TableHead className="min-w-[120px]">التاريخ</TableHead>
                    <TableHead className="text-left w-[80px]">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        لا توجد مدفوعات حالياً
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.slice(0, 15).map((payment) => (
                      <TableRow key={payment.id} className={`hover:bg-muted/30 ${payment.vipUpgrade ? "bg-purple-500/5 outline outline-1 outline-purple-500/10" : ""}`}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedPaymentIds.includes(payment.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedPaymentIds(prev => [...prev, payment.id]);
                              else setSelectedPaymentIds(prev => prev.filter(id => id !== payment.id));
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium truncate max-w-[150px]">{payment.userEmail}</TableCell>
                        <TableCell className="font-bold">{payment.amount.toLocaleString()} د.ج</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {payment.method === "card"
                              ? "تحويل بنكي"
                              : payment.method === "cash"
                              ? "دفع نقدي"
                              : "تقسيط"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString("ar-DZ")}</TableCell>
                        <TableCell className="text-left">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeletePayment(payment.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-2xl w-[95vw] rounded-xl overflow-hidden border-none shadow-2xl p-0 text-right" dir="rtl">
          <div className="bg-primary py-6 px-8 text-white relative">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">مراجعة وصل التحويل</DialogTitle>
              <DialogDescription className="text-primary-foreground/80">
                تحقق من تفاصيل الوصل المرفق قبل اتخاذ القرار
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8">
            {selectedReceipt && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex flex-col gap-4">
                    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-bold">المستخدم</p>
                      <p className="font-semibold break-all text-sm md:text-base">{selectedReceipt.userEmail}</p>
                    </div>
                    
                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="flex justify-between items-center mb-2">
                        <Badge variant="outline" className="bg-white/50 border-primary/20">
                          {selectedReceipt.vipUpgrade ? "ترقية VIP" : "طلب شراء"}
                        </Badge>
                        <p className="text-xs text-primary/70 uppercase tracking-wider font-bold">المبلغ المطلوب</p>
                      </div>
                      <p className="font-bold text-2xl md:text-3xl text-primary">{selectedReceipt.amount.toLocaleString()} د.ج</p>
                    </div>

                    {selectedReceipt.vipUpgrade && selectedReceipt.vipPackage && (
                      <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
                        <p className="text-xs text-purple-700 uppercase tracking-wider mb-2 font-bold">الباقة المختارة</p>
                        <div className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-purple-600" />
                          <p className="font-bold text-lg text-purple-800">
                            {VIP_PACKAGES[selectedReceipt.vipPackage as keyof typeof VIP_PACKAGES]?.nameAr}
                          </p>
                        </div>
                        <p className="text-[10px] text-purple-600/70 mt-1">
                          المدة: {VIP_PACKAGES[selectedReceipt.vipPackage as keyof typeof VIP_PACKAGES]?.duration} يوم
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="reason" className="text-sm font-bold flex items-center gap-2">
                       سبب الرفض <span className="text-xs font-normal text-muted-foreground">(يظهر للمستخدم)</span>
                    </Label>
                    <Input
                      id="reason"
                      className="h-12 border-muted-foreground/20 focus:border-primary"
                      placeholder="مثال: صورة الوصل غير واضحة..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold mb-1 flex items-center gap-2">
                    صورة الوصل المرفقة
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </p>
                  <div className="relative aspect-[3/4] rounded-2xl border-4 border-muted overflow-hidden group bg-muted/20 shadow-inner">
                    <img
                      src={selectedReceipt.receiptImageUrl}
                      alt="Receipt"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <Button 
                    variant="link"
                    className="w-full text-xs text-primary gap-1 font-bold h-auto py-0"
                    onClick={() => window.open(selectedReceipt.receiptImageUrl, '_blank')}
                  >
                    فتح الصورة بجودة عالية
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-8 mt-8 border-t">
              <Button
                className="flex-[2] h-12 gap-2 bg-green-600 hover:bg-green-700 text-white w-full rounded-xl shadow-lg shadow-green-500/20 text-lg transition-all active:scale-95"
                onClick={handleVerifyReceipt}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-6 w-6" />}
                تأكيد وتفعيل الباقة
              </Button>
              <Button
                variant="destructive"
                className="flex-1 h-12 gap-2 w-full rounded-xl transition-all active:scale-95"
                onClick={handleRejectReceipt}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-5 w-5" />}
                رفض الوصل
              </Button>
              <Button
                variant="ghost"
                className="flex-1 h-12 w-full rounded-xl border border-muted"
                onClick={() => setSelectedReceipt(null)}
                disabled={processing}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

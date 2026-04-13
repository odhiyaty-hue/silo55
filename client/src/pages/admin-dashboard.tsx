import Header from "@/components/Header";
import React, { useState, useEffect } from "react";
import { collection, query, getDocs, doc, updateDoc, deleteDoc, where, orderBy, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Sheep, Order, User, VIPStatus, VIP_PACKAGES, CIBReceipt } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import AdminPaymentTab from "@/components/admin-payment-tab";
import PrintInvoice from "@/components/PrintInvoice";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Package,
  Users,
  ShoppingBag,
  Clock,
  Loader2,
  Trash2,
  Crown,
  Edit2,
  CreditCard,
  Upload,
  Printer,
  Search,
  PieChart as ChartPie,
  TrendingUp,
  DollarSign,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
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
import placeholderImage from "@assets/generated_images/sheep_product_placeholder.png";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sheep, setSheep] = useState<Sheep[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSheep, setSelectedSheep] = useState<Sheep | null>(null);
  const [addImportedDialogOpen, setAddImportedDialogOpen] = useState(false);
  const [isAddingImported, setIsAddingImported] = useState(false);
  const [newSheep, setNewSheep] = useState({
    price: "",
    age: "",
    weight: "",
    city: "الجزائر",
    municipality: "",
    description: "",
    images: [] as string[]
  });
  const [selectedImportedImages, setSelectedImportedImages] = useState<File[]>([]);
  const [importedImagePreviews, setImportedImagePreviews] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedUserVIP, setSelectedUserVIP] = useState<User | null>(null);
  const [vipExpiryDate, setVipExpiryDate] = useState("");
  const [vipStatus, setVipStatus] = useState<VIPStatus>("none");
  const [updatingVIP, setUpdatingVIP] = useState(false);
  const [orderReceipt, setOrderReceipt] = useState<CIBReceipt | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [sheepStatusFilter, setSheepStatusFilter] = useState<string>("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userVipFilter, setUserVipFilter] = useState<string>("all");
  const [updatingRole, setUpdatingRole] = useState(false);

  // Helper function to format date as Gregorian (Miladi)
  const formatGregorianDate = (date: any) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };


  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      const fetchReceipt = async () => {
        const q = query(collection(db, "cibReceipts"), where("orderId", "==", (selectedOrder as any).id));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setOrderReceipt(snapshot.docs[0].data() as CIBReceipt);
        } else {
          setOrderReceipt(null);
        }
      };
      fetchReceipt();
    } else {
      setOrderReceipt(null);
    }
  }, [selectedOrder]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSheep(),
        fetchOrders(),
        fetchUsers(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSheep = async () => {
    const snapshot = await getDocs(collection(db, "sheep"));
    const sheepData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Sheep[];
    setSheep(sheepData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  };

  const fetchOrders = async () => {
    try {
      const snapshot = await getDocs(collection(db, "orders"));
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      console.log("🔍 عدد الطلبات المجلوبة:", ordersData.length);
      console.log("📋 الطلبات:", ordersData);
      setOrders(ordersData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    } catch (error) {
      console.error("❌ خطأ في جلب الطلبات:", error);
    }
  };

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const usersData = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as User[];
    setUsers(usersData);
  };

  const handleReview = async (sheepId: string, approved: boolean, rejectionReason?: string) => {
    setReviewing(true);
    try {
      const updateData: any = {
        status: approved ? "approved" : "rejected",
        updatedAt: Date.now(),
      };
      
      if (!approved && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
      
      await updateDoc(doc(db, "sheep", sheepId), updateData);

      toast({
        title: approved ? "تم قبول الخروف" : "تم رفض الخروف",
        description: approved ? "الخروف الآن متاح للمشترين" : "تم رفض القائمة بسبب: " + (rejectionReason || "أسباب إدارية"),
      });

      setSelectedSheep(null);
      fetchSheep();
    } catch (error) {
      console.error("Error reviewing sheep:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء المراجعة",
        variant: "destructive",
      });
    } finally {
      setReviewing(false);
    }
  };

  const handleToggleSoldStatus = async (sheepId: string, currentStatus: boolean) => {
    setReviewing(true);
    try {
      await updateDoc(doc(db, "sheep", sheepId), {
        isSold: !currentStatus,
        updatedAt: Date.now(),
      });
      toast({
        title: "تم التحديث",
        description: !currentStatus ? "تم تعيين الخروف كمباع": "تم إرجاع الخروف كغير مباع",
      });
      fetchSheep();
    } catch (error) {
      console.error("Error toggling sold status:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة البيع",
        variant: "destructive",
      });
    } finally {
      setReviewing(false);
    }
  };

  const handleOrderReview = async (orderId: string, approved: boolean) => {
    setReviewing(true);
    try {
      await updateDoc(doc(db, "orders", orderId), {
        status: approved ? "confirmed" : "rejected",
        updatedAt: Date.now(),
      });

      if (!approved) {
        const order = orders.find(o => o.id === orderId);
        if (order?.sheepId) {
          await updateDoc(doc(db, "sheep", order.sheepId), {
            isSold: false,
            updatedAt: Date.now(),
          });
        }
      }

      toast({
        title: approved ? "تم قبول الطلب" : "تم رفض الطلب",
        description: approved ? "تم تأكيد الطلب بنجاح" : "تم رفض الطلب",
      });

      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      console.error("Error reviewing order:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء المراجعة",
        variant: "destructive",
      });
    } finally {
      setReviewing(false);
    }
  };

  const handleDeleteSelectedOrders = async () => {
    if (!selectedOrderIds.length) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedOrderIds.length} طلب؟`)) return;
    
    setLoading(true);
    try {
      let deletedCount = 0;
      for (const id of selectedOrderIds) {
        await deleteDoc(doc(db, "orders", id));
        deletedCount++;
      }
      toast({ title: "تم", description: `تم حذف ${deletedCount} طلب بنجاح.` });
      setSelectedOrderIds([]);
      fetchOrders();
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllOrders = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleOrderToggle = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, orderId]);
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };

  const handlePrintInvoice = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
    }, 500); // Allow react to render the invoice before triggering print dialog
  };

  const handleDeleteSheep = async (sheepId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العرض؟")) return;
    
    setReviewing(true);
    try {
      await deleteDoc(doc(db, "sheep", sheepId));

      toast({
        title: "تم حذف العرض",
        description: "تم حذف الخروف بنجاح",
      });

      fetchSheep();
    } catch (error) {
      console.error("Error deleting sheep:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الحذف",
        variant: "destructive",
      });
    } finally {
      setReviewing(false);
    }
  };

  const pendingSheep = sheep.filter((s: Sheep) => s.status === "pending");
  const stats = {
    totalSheep: sheep.length,
    pendingSheep: pendingSheep.length,
    totalOrders: orders.length,
    totalUsers: users.length,
  };

  const totalRevenue = orders
    .filter((o: Order) => o.status === "confirmed")
    .reduce((sum: number, o: Order) => sum + (o.totalPrice || 0), 0);
  
  const confirmedOrdersCount = orders.filter((o: Order) => o.status === "confirmed").length;

  const uniqueOrderCities = Array.from(new Set(orders.map((o: Order) => o.buyerCity || "غير محدد").filter(Boolean)));
  
  const sheepStatsData = [
    { status: "approved", count: sheep.filter((s: Sheep) => s.status === "approved" && !s.isSold).length, fill: "var(--color-approved)" },
    { status: "pending", count: sheep.filter((s: Sheep) => s.status === "pending").length, fill: "var(--color-pending)" },
    { status: "rejected", count: sheep.filter((s: Sheep) => s.status === "rejected").length, fill: "var(--color-rejected)" },
    { status: "sold", count: sheep.filter((s: Sheep) => s.isSold).length, fill: "var(--color-sold)" },
  ];

  const orderStatsData = [
    { status: "confirmed", count: orders.filter((o: Order) => o.status === "confirmed").length, fill: "var(--color-confirmed)" },
    { status: "pending", count: orders.filter((o: Order) => !o.status || o.status === "pending").length, fill: "var(--color-pending)" },
    { status: "rejected", count: orders.filter((o: Order) => o.status === "rejected").length, fill: "var(--color-rejected)" },
  ];

  const userStatsData = [
    { role: "seller", count: users.filter((u: User) => u.role === "seller").length, fill: "var(--color-seller)" },
    { role: "buyer", count: users.filter((u: User) => u.role === "buyer").length, fill: "var(--color-buyer)" },
    { role: "admin", count: users.filter((u: User) => u.role === "admin").length, fill: "var(--color-admin)" },
  ];


  const sheepChartConfig = {
    count: { label: "العدد" },
    approved: { label: "مقبول", color: "#22c55e" },
    pending: { label: "قيد المراجعة", color: "#eab308" },
    rejected: { label: "مرفوض", color: "#ef4444" },
    sold: { label: "مباع", color: "#64748b" },
  } satisfies ChartConfig;

  const orderChartConfig = {
    count: { label: "العدد" },
    confirmed: { label: "مؤكد", color: "#22c55e" },
    pending: { label: "قيد المراجعة", color: "#eab308" },
    rejected: { label: "مرفوض", color: "#ef4444" },
  } satisfies ChartConfig;

  const userChartConfig = {
    count: { label: "العدد" },
    seller: { label: "بائع", color: "#3b82f6" },
    buyer: { label: "مشتري", color: "#16a34a" },
    admin: { label: "مدير", color: "#9333ea" },
  } satisfies ChartConfig;

  const handleStatClick = (type: 'sheep' | 'order' | 'user', value: string) => {
    if (type === 'sheep') {
      if (value === 'pending') {
        setActiveTab("pending");
      } else {
        setActiveTab("all");
        setSheepStatusFilter(value === 'approved' ? 'approved' : value === 'sold' ? 'sold' : value === 'rejected' ? 'rejected' : 'all');
      }
    } else if (type === 'order') {
      setActiveTab("orders");
      setStatusFilter(value);
    } else if (type === 'user') {
      if (value === 'seller') setActiveTab("sellers");
      else if (value === 'buyer' || value === 'admin') setActiveTab("users");
    }
  };


  const filteredUsers = users.filter((u: User) => {
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    const matchesVip = userVipFilter === "all" || (u.vipStatus || "none") === userVipFilter;
    const searchStr = userSearchQuery.toLowerCase();
    const matchesSearch = !userSearchQuery || 
      u.email.toLowerCase().includes(searchStr) || 
      (u.fullName && u.fullName.toLowerCase().includes(searchStr)) ||
      (u.phone && u.phone.includes(searchStr));
    return matchesRole && matchesVip && matchesSearch;
  });

  const filteredSheep = sheep.filter((s: Sheep) => {
    if (sheepStatusFilter === "all") return true;
    if (sheepStatusFilter === "approved") return s.status === "approved" && !s.isSold;
    if (sheepStatusFilter === "pending") return s.status === "pending";
    if (sheepStatusFilter === "rejected") return s.status === "rejected";
    if (sheepStatusFilter === "sold") return !!s.isSold;
    return true;
  });

  const filteredOrders = orders.filter((o: Order) => {
    let statusMatch = true;
    if (statusFilter === "pending") statusMatch = (!o.status || o.status === "pending");
    else if (statusFilter === "confirmed") statusMatch = o.status === "confirmed";
    else if (statusFilter === "rejected") statusMatch = o.status === "rejected";
    
    let cityMatch = true;
    if (cityFilter !== "all") {
      cityMatch = (o.buyerCity || "غير محدد") === cityFilter;
    }

    const searchLower = orderSearchQuery.toLowerCase();
    const searchMatch =
      o.id.toLowerCase().includes(searchLower) ||
      (o.buyerEmail || "").toLowerCase().includes(searchLower) ||
      (o.sellerEmail || "").toLowerCase().includes(searchLower);

    return statusMatch && cityMatch && searchMatch;
  });

  const handleImportedImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImportedImages.length > 5) {
      toast({
        title: "تنبيه",
        description: "يمكنك رفع 5 صور كحد أقصى",
        variant: "destructive",
      });
      return;
    }

    const newFiles = files as File[];
    setSelectedImportedImages(prev => [...prev, ...newFiles]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImportedImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImportedImage = (index: number) => {
    setSelectedImportedImages(prev => prev.filter((_, i) => i !== index));
    setImportedImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddImportedSheep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheep.price || !newSheep.age || !newSheep.weight || !newSheep.city || !newSheep.municipality || !newSheep.description) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }

    if (selectedImportedImages.length < 2) {
      toast({ title: "خطأ", description: "يجب رفع صورتين على الأقل", variant: "destructive" });
      return;
    }

    setIsAddingImported(true);
    setIsUploadingImages(true);
    try {
      const { uploadMultipleImagesToImgBB } = await import("@/lib/imgbb");
      const imageUrls = await uploadMultipleImagesToImgBB(selectedImportedImages);

      await addDoc(collection(db, "sheep"), {
        ...newSheep,
        price: parseInt(newSheep.price),
        age: parseInt(newSheep.age),
        weight: parseInt(newSheep.weight),
        sellerId: user?.uid || "admin",
        sellerEmail: user?.email || "admin@odhiyati.com",
        status: "approved",
        isImported: true,
        images: imageUrls,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      toast({ title: "تم الإضافة", description: "تم إضافة الأضحية المستوردة بنجاح" });
      setAddImportedDialogOpen(false);
      setNewSheep({
        price: "",
        age: "",
        weight: "",
        city: "الجزائر",
        municipality: "",
        description: "",
        images: []
      });
      setSelectedImportedImages([]);
      setImportedImagePreviews([]);
      fetchSheep();
    } catch (error) {
      console.error(error);
      toast({ title: "خطأ", description: "فشل في إضافة الأضحية", variant: "destructive" });
    } finally {
      setIsAddingImported(false);
      setIsUploadingImages(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "مدير";
      case "seller": return "بائع";
      case "buyer": return "مشتري";
      default: return role;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400">مدير</Badge>;
      case "seller":
        return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">بائع</Badge>;
      case "buyer":
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">مشتري</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const handleRoleUpdate = async (userUid: string, newRole: string) => {
    setUpdatingRole(true);
    try {
      await updateDoc(doc(db, "users", userUid), {
        role: newRole,
        updatedAt: Date.now(),
      });
      toast({
        title: "تم تحديث الرتبة",
        description: `تم تغيير رتبة المستخدم بنجاح إلى ${getRoleLabel(newRole)}`,
      });
      fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الرتبة",
        variant: "destructive",
      });
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleVIPUpdate = async () => {
    if (!selectedUserVIP) return;
    
    setUpdatingVIP(true);
    try {
      const updateData: any = {
        vipStatus: vipStatus,
        updatedAt: Date.now(),
      };

      if (vipStatus !== "none") {
        updateData.vipUpgradedAt = selectedUserVIP.vipUpgradedAt || Date.now();
        if (vipExpiryDate) {
          const expiryTime = new Date(vipExpiryDate).getTime();
          updateData.vipExpiresAt = expiryTime;
        }
      } else {
        updateData.vipExpiresAt = null;
      }

      await updateDoc(doc(db, "users", selectedUserVIP.uid), updateData);

      toast({
        title: "تم التحديث بنجاح",
        description: `تم تحديث حالة VIP للمستخدم ${selectedUserVIP.email}`,
      });

      setSelectedUserVIP(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating VIP:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث حالة VIP",
        variant: "destructive",
      });
    } finally {
      setUpdatingVIP(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-background print:hidden">
      <Header />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-2">لوحة تحكم الإدارة</h1>
            <p className="text-muted-foreground">إدارة شاملة للمنصة</p>
          </div>
          <Button onClick={() => setAddImportedDialogOpen(true)} className="bg-primary">
            إضافة أضحية مستوردة +
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {loading ? (
            <>
              <Card className="p-6 h-[400px] flex flex-col items-center justify-center space-y-4">
                <Skeleton className="h-48 w-48 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </Card>
              <Card className="p-6 h-[400px] flex flex-col items-center justify-center space-y-4">
                <Skeleton className="h-48 w-48 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </Card>
              <Card className="p-6 h-[400px] flex flex-col items-center justify-center space-y-4">
                <Skeleton className="h-48 w-48 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </Card>
            </>
          ) : (
            <>
          {/* Sheep Stats Chart */}
          <Card className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader className="items-center pb-0">
              <CardTitle>الأضاحي</CardTitle>
              <CardDescription>توزيع حالة الأضاحي في المنصة</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={sheepChartConfig}
                className="mx-auto aspect-square max-h-64"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={sheepStatsData}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {sheepStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
            <div className="flex flex-wrap gap-2 justify-center pb-4 px-4">
              {sheepStatsData.map((s) => (
                <button
                  key={s.status}
                  className="flex items-center gap-1 hover:bg-muted/50 p-1.5 rounded-md transition-colors cursor-pointer border border-transparent hover:border-border group"
                  onClick={() => handleStatClick('sheep', s.status)}
                >
                  <div className="h-3 w-3 rounded-full" style={{ background: (sheepChartConfig[s.status as keyof typeof sheepChartConfig] as any)?.color }} />
                  <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    {(sheepChartConfig[s.status as keyof typeof sheepChartConfig] as any)?.label}: {s.count}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Orders Stats Chart */}
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle>الطلبات</CardTitle>
              <CardDescription>توزيع حالة الطلبات الحالية</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={orderChartConfig}
                className="mx-auto aspect-square max-h-64"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={orderStatsData}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {orderStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
            <div className="flex flex-wrap gap-2 justify-center pb-4 px-4">
              {orderStatsData.map((o) => (
                <button
                  key={o.status}
                  className="flex items-center gap-1 hover:bg-muted/50 p-1.5 rounded-md transition-colors cursor-pointer border border-transparent hover:border-border group"
                  onClick={() => handleStatClick('order', o.status)}
                >
                  <div className="h-3 w-3 rounded-full" style={{ background: (orderChartConfig[o.status as keyof typeof orderChartConfig] as any)?.color }} />
                  <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    {(orderChartConfig[o.status as keyof typeof orderChartConfig] as any)?.label}: {o.count}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* Users Distribution Chart */}
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle>المستخدمون</CardTitle>
              <CardDescription>توزيع أدوار المستخدمين</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={userChartConfig}
                className="mx-auto aspect-square max-h-64"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={userStatsData}
                    dataKey="count"
                    nameKey="role"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {userStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
            <div className="flex flex-wrap gap-2 justify-center pb-4 px-4">
              {userStatsData.map((u) => (
                <button
                  key={u.role}
                  className="flex items-center gap-1 hover:bg-muted/50 p-1.5 rounded-md transition-colors cursor-pointer border border-transparent hover:border-border group"
                  onClick={() => handleStatClick('user', u.role)}
                >
                  <div className="h-3 w-3 rounded-full" style={{ background: (userChartConfig[u.role as keyof typeof userChartConfig] as any)?.color }} />
                  <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    {(userChartConfig[u.role as keyof typeof userChartConfig] as any)?.label}: {u.count}
                  </span>
                </button>
              ))}
            </div>
          </Card>
          </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="relative">
            <div className="overflow-x-auto pb-2 scrollbar-hide">
              <TabsList className="inline-flex w-auto min-w-full justify-start md:justify-center gap-1 p-1 bg-muted/50">
                <TabsTrigger value="pending" className="whitespace-nowrap px-4 py-2" data-testid="tab-pending">
                  قيد المراجعة ({pendingSheep.length})
                </TabsTrigger>
                <TabsTrigger value="all" className="whitespace-nowrap px-4 py-2" data-testid="tab-all">
                  جميع الأغنام
                </TabsTrigger>
                <TabsTrigger value="users" className="whitespace-nowrap px-4 py-2" data-testid="tab-users">
                  المستخدمون ({users.length})
                </TabsTrigger>
                <TabsTrigger value="finances" className="whitespace-nowrap px-4 py-2" data-testid="tab-finances">
                  المالية
                </TabsTrigger>
                <TabsTrigger value="orders" className="whitespace-nowrap px-4 py-2" data-testid="tab-orders">
                  الطلبات
                </TabsTrigger>
                <TabsTrigger value="payments" className="whitespace-nowrap px-4 py-2" data-testid="tab-payments">
                  <CreditCard className="h-4 w-4 ml-2" />
                  الدفع
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Payments Management Tab */}
          <TabsContent value="payments">
            <AnimatePresence mode="wait">
              <motion.div
                key="payments-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <AdminPaymentTab />
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* VIP Management Tab (Removed - Integrated into Users Detail) */}

          {/* Pending Reviews Tab */}
          <TabsContent value="pending">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading-pending"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden border-muted/60">
                      <Skeleton className="aspect-[4/3] w-full" />
                      <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-6 w-20" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              ) : pendingSheep.length === 0 ? (
                <motion.div
                  key="empty-pending"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card>
                    <CardContent className="p-12 text-center">
                      <CheckCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground">
                        لا توجد قوائم قيد المراجعة
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="content-pending"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingSheep.map((s: Sheep) => (
                      <Card key={s.id} className="overflow-hidden" data-testid={`card-pending-${s.id}`}>
                        <div className="aspect-[4/3] overflow-hidden bg-muted">
                          <img
                            src={s.images?.[0] || placeholderImage}
                            alt="خروف"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <Badge>{s.price.toLocaleString()} د.ج</Badge>
                            <Badge variant="secondary">{s.city}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                            {s.description}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => setSelectedSheep(s)}
                              data-testid={`button-review-${s.id}`}
                            >
                              مراجعة
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* All Sheep Tab */}
          <TabsContent value="all">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading-all"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <Card className="p-8">
                    <div className="space-y-6">
                      <div className="flex justify-between">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-10 w-32" />
                      </div>
                      <Skeleton className="h-[400px] w-full" />
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="content-all"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4 space-y-0">
                      <CardTitle>جميع الأغنام ({filteredSheep.length})</CardTitle>
                      <div className="flex gap-2 items-center">
                        <Select value={sheepStatusFilter} onValueChange={setSheepStatusFilter}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="الحالة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">كل الحالات</SelectItem>
                            <SelectItem value="approved">مقبول</SelectItem>
                            <SelectItem value="pending">قيد الانتظار</SelectItem>
                            <SelectItem value="rejected">مرفوض</SelectItem>
                            <SelectItem value="sold">مباع</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>الصورة</TableHead>
                            <TableHead>السعر</TableHead>
                            <TableHead>المدينة</TableHead>
                            <TableHead>البائع</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSheep.map(s => (
                            <TableRow key={s.id} className="hover:bg-muted/20 transition-colors">
                              <TableCell>
                                <img
                                  src={s.images?.[0] || placeholderImage}
                                  alt="خروف"
                                  className="h-12 w-12 rounded-lg object-cover shadow-sm border border-border/50"
                                />
                              </TableCell>
                              <TableCell className="font-bold">{s.price.toLocaleString()} د.ج</TableCell>
                              <TableCell>{s.city}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {s.sellerEmail || s.sellerId.slice(0, 8)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1 items-start">
                                  {s.isSold && (
                                    <Badge className="bg-slate-500/10 text-slate-700 border-slate-500/20">
                                      مباعة
                                    </Badge>
                                  )}
                                  <Badge
                                    className={
                                      s.status === "approved"
                                        ? "bg-green-500/10 text-green-700 border-green-500/20"
                                        : s.status === "pending"
                                        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                        : "bg-red-500/10 text-red-700 border-red-500/20"
                                    }
                                  >
                                    {s.status === "approved" ? "مقبول" : s.status === "pending" ? "قيد المراجعة" : "مرفوض"}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  {(s.status === "approved" || s.status === "rejected") && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteSheep(s.id)}
                                      disabled={reviewing}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                      title="حذف الخروف"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleSoldStatus(s.id, !!s.isSold)}
                                    disabled={reviewing}
                                    className="text-xs h-8"
                                  >
                                    {s.isSold ? "إرجاع كغير مباعة" : "تحديد كمباعة"}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>


          {/* Users Tab */}
          <TabsContent value="users">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading-users"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <Card className="p-8">
                    <Skeleton className="h-[400px] w-full" />
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="content-users"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4 space-y-0">
                      <CardTitle>المستخدمون ({filteredUsers.length})</CardTitle>
                      <div className="flex gap-2 flex-wrap items-center">
                        <div className="relative w-full md:w-64">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="البحث (بالبريد أو الهاتف)"
                            className="pr-10"
                            value={userSearchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserSearchQuery(e.target.value)}
                          />
                        </div>
                        <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                          <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="الرتبة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">كل الرتب</SelectItem>
                            <SelectItem value="admin">مدير</SelectItem>
                            <SelectItem value="seller">بائع</SelectItem>
                            <SelectItem value="buyer">مشتري</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={userVipFilter} onValueChange={setUserVipFilter}>
                          <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="حالة VIP" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">كل الحالات</SelectItem>
                            <SelectItem value="none">عادي</SelectItem>
                            <SelectItem value="silver">فضية</SelectItem>
                            <SelectItem value="gold">ذهبية</SelectItem>
                            <SelectItem value="platinum">بلاتينيوم</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>البريد الإلكتروني</TableHead>
                            <TableHead>الاسم</TableHead>
                            <TableHead>الدور</TableHead>
                            <TableHead>المدينة</TableHead>
                            <TableHead>تاريخ التسجيل</TableHead>
                            <TableHead>الإجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((u: User) => (
                            <TableRow key={u.uid} className="hover:bg-muted/10 transition-colors">
                              <TableCell className="font-medium">{u.email}</TableCell>
                              <TableCell>{u.fullName || "-"}</TableCell>
                              <TableCell>{getRoleBadge(u.role)}</TableCell>
                              <TableCell>{u.city || "-"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatGregorianDate(u.createdAt)}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-8 text-xs"
                                  onClick={() => {
                                    setSelectedUserVIP(u);
                                    setVipStatus(u.vipStatus || "none");
                                    setVipExpiryDate(u.vipExpiresAt ? new Date(u.vipExpiresAt).toISOString().split("T")[0] : "");
                                  }}
                                >
                                  عرض التفاصيل
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading-orders"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <Card className="p-8">
                    <Skeleton className="h-[500px] w-full" />
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="content-orders"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardHeader className="flex flex-col md:flex-row justify-between md:items-center gap-4 space-y-0">
                      <CardTitle>الطلبات ({filteredOrders.length})</CardTitle>
                      <div className="flex gap-2 flex-wrap items-center">
                        {selectedOrderIds.length > 0 && (
                          <Button variant="destructive" size="sm" onClick={handleDeleteSelectedOrders} disabled={loading}>
                            <Trash2 className="ml-2 h-4 w-4" />
                            حذف المحدد ({selectedOrderIds.length})
                          </Button>
                        )}
                        <div className="relative w-full md:w-64">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="البحث (رقم، بريد...)"
                            className="pr-10"
                            value={orderSearchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderSearchQuery(e.target.value)}
                          />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="الحالة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">كل الحالات</SelectItem>
                            <SelectItem value="pending">قيد المراجعة</SelectItem>
                            <SelectItem value="confirmed">مؤكد</SelectItem>
                            <SelectItem value="rejected">مرفوض</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={cityFilter} onValueChange={setCityFilter}>
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="المدينة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">كل المدن</SelectItem>
                            {uniqueOrderCities.map(city => (
                              <SelectItem key={city} value={city}>{city}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {orders.length === 0 ? (
                        <Card className="border-dashed">
                          <CardContent className="p-12 text-center">
                            <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <p className="text-lg text-muted-foreground">
                              لا توجد طلبات حتى الآن
                            </p>
                          </CardContent>
                        </Card>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="w-[50px]">
                                <Checkbox 
                                  checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                                  onCheckedChange={handleSelectAllOrders}
                                />
                              </TableHead>
                              <TableHead>المشتري</TableHead>
                              <TableHead>البائع</TableHead>
                              <TableHead>السعر</TableHead>
                              <TableHead>الحالة</TableHead>
                              <TableHead>التاريخ</TableHead>
                              <TableHead>الإجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredOrders.map((o: Order) => (
                              <TableRow key={o.id} className="hover:bg-muted/10 transition-colors">
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedOrderIds.includes(o.id)}
                                    onCheckedChange={(checked) => handleOrderToggle(o.id, !!checked)}
                                  />
                                </TableCell>
                                <TableCell className="text-sm font-medium">{o.buyerEmail || o.buyerId.slice(0, 8)}</TableCell>
                                <TableCell className="text-sm">{o.sellerEmail || o.sellerId.slice(0, 8)}</TableCell>
                                <TableCell className="font-bold">{o.totalPrice.toLocaleString()} د.ج</TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      o.status === "confirmed"
                                        ? "bg-green-500/10 text-green-700 border-green-500/20"
                                        : (!o.status || o.status === "pending")
                                        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                                        : "bg-red-500/10 text-red-700 border-red-500/20"
                                    }
                                  >
                                    {!o.status || o.status === "pending" ? "قيد المراجعة" : o.status === "confirmed" ? "مؤكد" : "مرفوض"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatGregorianDate(o.createdAt)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                  {(!o.status || o.status === "pending") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs"
                                      onClick={() => setSelectedOrder(o)}
                                    >
                                      مراجعة
                                    </Button>
                                  )}
                                  {o.status === "confirmed" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-xs bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 border-blue-200"
                                      onClick={() => handlePrintInvoice(o)}
                                    >
                                      <Printer className="ml-1 h-3.5 w-3.5" />
                                      الفاتورة
                                    </Button>
                                  )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="finances">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">إجمالي المبيعات المؤكدة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-500">{totalRevenue.toLocaleString()} د.ج</div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                      من {confirmedOrdersCount} طلب مكتمل
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">الطلبات المكتملة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">{confirmedOrdersCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">بمتوسط {(confirmedOrdersCount > 0 ? (totalRevenue / confirmedOrdersCount).toFixed(0) : 0).toLocaleString()} د.ج لكل طلب</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">نشاط المنصة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">{orders.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">إجمالي كافة الطلبات</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                    المعاملات الأخيرة
                  </CardTitle>
                  <CardDescription>أحدث عمليات البيع المؤكدة في النظام</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الطلب</TableHead>
                        <TableHead className="text-right">المبلغ</TableHead>
                        <TableHead className="text-right">المشتري</TableHead>
                        <TableHead className="text-right">البائع</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.filter((o: Order) => o.status === "confirmed").slice(0, 5).map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs">{o.id.substring(0, 8)}</TableCell>
                          <TableCell className="font-bold text-emerald-600">{(o.totalPrice || 0).toLocaleString()} د.ج</TableCell>
                          <TableCell className="text-xs">{o.buyerEmail}</TableCell>
                          <TableCell className="text-xs">{o.sellerEmail}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatGregorianDate(o.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

        </Tabs>
      </div>

      {/* User Management Dialog */}
      {selectedUserVIP && (
        <Dialog open={!!selectedUserVIP} onOpenChange={() => setSelectedUserVIP(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل وإدارة المستخدم</DialogTitle>
              <DialogDescription>
                {selectedUserVIP.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Details Section */}
              <div className="space-y-4">
                <h3 className="font-bold border-b pb-2">تفاصيل التواصل والعنوان</h3>
                <div className="space-y-2 text-sm text-right">
                  <p><span className="text-muted-foreground">الاسم الكامل:</span> {selectedUserVIP.fullName || "-"}</p>
                  <p><span className="text-muted-foreground">رقم الهاتف:</span> {selectedUserVIP.phone || "-"}</p>
                  <p><span className="text-muted-foreground">المدينة:</span> {selectedUserVIP.city || "-"}</p>
                  <p><span className="text-muted-foreground">البلدية:</span> {selectedUserVIP.municipality || "-"}</p>
                  <p><span className="text-muted-foreground">العنوان الكامل:</span> {selectedUserVIP.address || "-"}</p>
                  <p><span className="text-muted-foreground">تاريخ الانضمام:</span> {formatGregorianDate(selectedUserVIP.createdAt)}</p>
                </div>

                <div className="pt-4 border-t">
                  <Label className="block mb-2 font-semibold">تغيير رتبة المستخدم</Label>
                  <div className="flex gap-2">
                    <Select 
                      defaultValue={selectedUserVIP.role} 
                      onValueChange={(val) => handleRoleUpdate(selectedUserVIP.uid, val)}
                      disabled={updatingRole}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر الرتبة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">مشتري</SelectItem>
                        <SelectItem value="seller">بائع</SelectItem>
                        <SelectItem value="admin">مدير</SelectItem>
                      </SelectContent>
                    </Select>
                    {updatingRole && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    * سيتم منح المستخدم صلاحيات الرتبة الجديدة فور الحفظ.
                  </p>
                </div>
              </div>

              {/* VIP Management Section */}
              <div className="space-y-4 bg-muted/30 p-4 rounded-lg border">
                <h3 className="font-bold flex items-center gap-2 border-b pb-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  إدارة حالة VIP
                </h3>
                
                <div>
                  <Label className="block mb-2 text-sm">باقة VIP الحالية</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["none", "silver", "gold", "platinum"] as const).map(status => (
                      <Button
                        key={status}
                        variant={vipStatus === status ? "default" : "outline"}
                        onClick={() => setVipStatus(status)}
                        className="text-[10px] h-8"
                      >
                        {status === "none" 
                          ? "عادي" 
                          : VIP_PACKAGES[status as keyof typeof VIP_PACKAGES]?.nameAr}
                      </Button>
                    ))}
                  </div>
                </div>

                {vipStatus !== "none" && (
                  <div>
                    <Label htmlFor="vip-expiry" className="block mb-2 text-sm">
                      تاريخ انتهاء الاشتراك
                    </Label>
                    <Input
                      id="vip-expiry"
                      type="date"
                      value={vipExpiryDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVipExpiryDate(e.target.value)}
                      className="w-full h-9"
                    />
                  </div>
                )}

                <Button
                  onClick={handleVIPUpdate}
                  disabled={updatingVIP}
                  className="w-full mt-4"
                >
                  {updatingVIP ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle className="ml-2 h-4 w-4" />}
                  تحديث حالة VIP
                </Button>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedUserVIP(null)}
              >
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Order Review Dialog */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>مراجعة الطلب</DialogTitle>
              <DialogDescription>
                قم بمراجعة تفاصيل الطلب واتخاذ القرار بالقبول أو الرفض
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">السعر الإجمالي</p>
                  <p className="text-xl font-bold text-primary">{selectedOrder.totalPrice.toLocaleString()} د.ج</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الطلب</p>
                  <p className="font-semibold">{formatGregorianDate(selectedOrder.createdAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold border-b pb-2">تفاصيل المشتري</h4>
                  <div className="text-sm space-y-2">
                    <p><span className="text-muted-foreground">الاسم:</span> {selectedOrder.buyerName || "-"}</p>
                    <p><span className="text-muted-foreground">البريد:</span> {selectedOrder.buyerEmail || "-"}</p>
                    <p><span className="text-muted-foreground">الهاتف:</span> {selectedOrder.buyerPhone || "-"}</p>
                    <p><span className="text-muted-foreground">المدينة:</span> {selectedOrder.buyerCity || "-"}</p>
                    <p><span className="text-muted-foreground">العنوان:</span> {selectedOrder.buyerAddress || "-"}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold border-b pb-2">تفاصيل البائع</h4>
                  <div className="text-sm space-y-2">
                    {(() => {
                      const seller = users.find((u: User) => u.uid === selectedOrder.sellerId);
                      return seller ? (
                        <>
                          <p><span className="text-muted-foreground">الاسم:</span> {seller.fullName || "-"}</p>
                          <p><span className="text-muted-foreground">البريد:</span> {seller.email || "-"}</p>
                          <p><span className="text-muted-foreground">الهاتف:</span> {seller.phone || "-"}</p>
                          <p><span className="text-muted-foreground">المدينة:</span> {seller.city || "-"}</p>
                          <p><span className="text-muted-foreground">العنوان:</span> {seller.address || "-"}</p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">البائع غير موجود</p>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {orderReceipt && (
                <div className="space-y-3">
                  <h4 className="font-semibold border-b pb-2">وصل التوصيل / الدفع</h4>
                  <div className="rounded-lg border overflow-hidden bg-muted flex items-center justify-center max-h-64">
                    <img 
                      src={orderReceipt.receiptImageUrl} 
                      alt="وصل الدفع" 
                      className="max-h-64 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={() => handleOrderReview(selectedOrder.id, false)}
                disabled={reviewing}
              >
                {reviewing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <XCircle className="ml-2 h-4 w-4" />}
                رفض
              </Button>
              <Button
                onClick={() => handleOrderReview(selectedOrder.id, true)}
                disabled={reviewing}
              >
                {reviewing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle className="ml-2 h-4 w-4" />}
                قبول
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Sheep Review Dialog */}
      {selectedSheep && (
        <Dialog open={!!selectedSheep} onOpenChange={() => { setSelectedSheep(null); setRejectionReason(""); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>مراجعة الخروف</DialogTitle>
              <DialogDescription>
                قم بمراجعة التفاصيل واتخاذ القرار بالقبول أو الرفض
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <img
                  src={selectedSheep.images?.[0] || placeholderImage}
                  alt="خروف"
                  className="w-full aspect-square object-cover rounded-lg"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">السعر</p>
                  <p className="text-2xl font-bold">{selectedSheep.price.toLocaleString()} د.ج</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">العمر</p>
                    <p className="font-semibold">{selectedSheep.age} شهر</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الوزن</p>
                    <p className="font-semibold">{selectedSheep.weight} كجم</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المدينة</p>
                  <p className="font-semibold">{selectedSheep.city}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">البائع</p>
                  <p className="font-semibold">{selectedSheep.sellerEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الوصف</p>
                  <p className="text-sm">{selectedSheep.description}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold mb-2">إذا كنت ستقوم برفض، أضف سبب الرفض:</p>
                <textarea
                  placeholder="مثال: الصور غير واضحة، أو السعر غير مناسب، إلخ..."
                  className="w-full p-3 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={() => handleReview(selectedSheep.id, false, rejectionReason || "لم يتم تحديد سبب")}
                disabled={reviewing}
                data-testid="button-reject"
              >
                {reviewing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <XCircle className="ml-2 h-4 w-4" />}
                رفض
              </Button>
              <Button
                onClick={() => handleReview(selectedSheep.id, true)}
                disabled={reviewing}
                data-testid="button-approve"
              >
                {reviewing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle className="ml-2 h-4 w-4" />}
                قبول
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Imported Sheep Dialog */}
      <Dialog open={addImportedDialogOpen} onOpenChange={setAddImportedDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة أضحية مستوردة</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e: React.FormEvent) => handleAddImportedSheep(e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>السعر (د.ج)</Label>
                <Input type="number" value={newSheep.price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSheep({...newSheep, price: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>الوزن (كجم)</Label>
                <Input type="number" value={newSheep.weight} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSheep({...newSheep, weight: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>العمر (شهر)</Label>
                <Input type="number" value={newSheep.age} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSheep({...newSheep, age: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>الولاية</Label>
                <Input value={newSheep.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSheep({...newSheep, city: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>البلدية</Label>
              <Input value={newSheep.municipality} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSheep({...newSheep, municipality: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Input value={newSheep.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSheep({...newSheep, description: e.target.value})} required />
            </div>
            <div className="space-y-3">
              <Label>الصور (2-5 صور من الجهاز) *</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImportedImageSelect}
                  className="hidden"
                  id="admin-image-upload"
                  disabled={selectedImportedImages.length >= 5}
                />
                <label htmlFor="admin-image-upload">
                  <div className="flex flex-col items-center justify-center gap-2 cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      انقر لرفع الصور ({selectedImportedImages.length}/5)
                    </p>
                  </div>
                </label>

                {importedImagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {importedImagePreviews.map((preview: string, idx: number) => (
                      <div key={idx} className="relative group">
                        <img
                          src={preview}
                          alt={`معاينة ${idx + 1}`}
                          className="w-full aspect-square object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => removeImportedImage(idx)}
                          className="absolute top-1 left-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAddImportedDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={isAddingImported}>
                {isAddingImported ? <Loader2 className="animate-spin ml-2 h-4 w-4" /> : "إضافة"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>

      {/* Printable Invoice Section */}
      {printingOrder && (
        <PrintInvoice 
          order={printingOrder} 
          type="admin" 
          sellerData={users.find((u: User) => u.uid === printingOrder.sellerId)} 
        />
      )}
    </>
  );
}

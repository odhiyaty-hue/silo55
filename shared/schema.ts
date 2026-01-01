import { z } from "zod";

// User roles
export const userRoles = ["buyer", "seller", "admin"] as const;
export type UserRole = typeof userRoles[number];

// Sheep status
export const sheepStatuses = ["pending", "approved", "rejected"] as const;
export type SheepStatus = typeof sheepStatuses[number];

// Order status  
export const orderStatuses = ["pending", "confirmed", "rejected", "delivered"] as const;
export type OrderStatus = typeof orderStatuses[number];

// VIP status type
export const vipStatuses = ["none", "silver", "gold", "platinum"] as const;
export type VIPStatus = typeof vipStatuses[number];

// VIP Package types
export const vipPackages = ["silver", "gold", "platinum"] as const;
export type VIPPackage = typeof vipPackages[number];

export interface VIPPackageDetails {
  id: VIPPackage;
  name: string;
  nameAr: string;
  price: number;
  duration: number; // in days
  buyerDiscount: number; // percentage
  sellerPriority: "low" | "medium" | "high";
  features: string[];
  featuresAr: string[];
  color: string;
}

export const VIP_PACKAGES: Record<VIPPackage, VIPPackageDetails> = {
  silver: {
    id: "silver",
    name: "Silver",
    nameAr: "فضية",
    price: 2999,
    duration: 30,
    buyerDiscount: 5,
    sellerPriority: "low",
    color: "silver",
    features: ["5% discount on all purchases", "Basic seller priority", "Email support"],
    featuresAr: ["تخفيف 5% على جميع المشتريات", "أولوية أساسية للبائع", "دعم عبر البريد الإلكتروني"],
  },
  gold: {
    id: "gold",
    name: "Gold",
    nameAr: "ذهبية",
    price: 7999,
    duration: 90,
    buyerDiscount: 10,
    sellerPriority: "medium",
    color: "amber",
    features: ["10% discount on all purchases", "Medium seller priority", "Premium support", "Exclusive deals"],
    featuresAr: ["تخفيف 10% على جميع المشتريات", "أولوية متوسطة للبائع", "دعم ممتاز", "عروض حصرية"],
  },
  platinum: {
    id: "platinum",
    name: "Platinum",
    nameAr: "بلاتينيوم",
    price: 19999,
    duration: 365,
    buyerDiscount: 15,
    sellerPriority: "high",
    color: "slate",
    features: ["15% discount on all purchases", "Top seller priority", "24/7 priority support", "Exclusive deals", "Reward points", "Special events access"],
    featuresAr: ["تخفيف 15% على جميع المشتريات", "أولوية عليا للبائع", "دعم 24/7", "عروض حصرية", "نقاط مكافآت", "الوصول إلى أحداث خاصة"],
  },
};

// User schema (Firestore)
export interface User {
  uid: string;
  email: string;
  role: UserRole;
  phone?: string;
  // Email verification
  emailVerified?: boolean; // هل تم التحقق من البريد الإلكتروني
  emailVerificationToken?: string; // توكن التحقق
  emailVerificationTokenExpiry?: number; // انتهاء توكن التحقق
  // Seller-specific fields
  fullName?: string;
  address?: string;
  city?: string;
  municipality?: string; // البلدية/الحي
  profileComplete?: boolean; // هل ملأ البائع بيانات كاملة
  // VIP fields
  vipStatus?: VIPStatus; // none | silver | gold | platinum
  vipPackage?: VIPPackage; // نوع الباقة
  vipUpgradedAt?: number; // تاريخ الترقية إلى VIP
  vipExpiresAt?: number; // تاريخ انتهاء الاشتراك VIP
  rewardPoints?: number; // نقاط المكافآت
  createdAt: number;
  updatedAt?: number;
}

export const insertUserSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  role: z.enum(userRoles, { required_error: "يجب اختيار نوع الحساب" }),
  phone: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Seller profile update schema
export const updateSellerProfileSchema = z.object({
  fullName: z.string().min(3, "الاسم الكامل يجب أن يكون 3 أحرف على الأقل"),
  phone: z.string().min(7, "رقم الهاتف يجب أن يكون صحيح"),
  address: z.string().min(5, "العنوان يجب أن يكون 5 أحرف على الأقل"),
  city: z.string().min(2, "يجب اختيار المدينة"),
  municipality: z.string().min(2, "يجب إدخال البلدية"),
});

export type UpdateSellerProfile = z.infer<typeof updateSellerProfileSchema>;

// Sheep schema (Firestore)
export interface Sheep {
  id: string;
  sellerId: string;
  sellerEmail?: string;
  sellerVIPStatus?: VIPStatus; // Seller's VIP status (for sorting/display)
  images: string[]; // URLs from ImgBB
  price: number;
  age: number; // in months
  weight: number; // in kg
  city: string;
  municipality?: string; // البلدية/الحي
  description: string;
  status: SheepStatus;
  isImported?: boolean; // هل هي أضاحي مستوردة
  rejectionReason?: string; // سبب الرفض (إن وجد)
  createdAt: number;
  updatedAt?: number;
}

export const insertSheepSchema = z.object({
  price: z.number().min(1, "السعر يجب أن يكون أكبر من صفر"),
  age: z.number().min(1, "العمر يجب أن يكون أكبر من صفر"),
  weight: z.number().min(1, "الوزن يجب أن يكون أكبر من صفر"),
  city: z.string().min(2, "يجب اختيار الولاية"),
  municipality: z.string().min(2, "يجب اختيار البلدية"),
  description: z.string().min(10, "الوصف يجب أن يكون 10 أحرف على الأقل"),
  isImported: z.boolean().optional(),
});

export type InsertSheep = z.infer<typeof insertSheepSchema>;

// Order schema (Firestore)
export interface Order {
  id: string;
  buyerId: string;
  buyerEmail?: string;
  sellerId: string;
  sellerEmail?: string;
  sheepId: string;
  sheepData?: Partial<Sheep>; // Snapshot of sheep data at order time
  totalPrice: number;
  status: OrderStatus;
  nationalId?: string; // رقم التعريف الوطني (للأضاحي المستوردة)
  createdAt: number;
  updatedAt?: number;
}

export const insertOrderSchema = z.object({
  sheepId: z.string().min(1, "يجب اختيار الخروف"),
  totalPrice: z.number().min(1, "السعر غير صالح"),
  nationalId: z.string().optional(),
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Payment method type
export const paymentMethods = ["card", "cash", "installment"] as const;
export type PaymentMethod = typeof paymentMethods[number];

// Payment status type
export const paymentStatuses = ["pending", "completed", "failed", "cancelled"] as const;
export type PaymentStatus = typeof paymentStatuses[number];

// Payment schema (Firestore)
export interface Payment {
  id: string;
  orderId?: string;
  userId: string;
  userEmail: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  vipUpgrade?: boolean; // whether this is for VIP upgrade
  stripePaymentIntentId?: string;
  createdAt: number;
  updatedAt?: number;
}

// Installment schema
export interface Installment {
  id: string;
  paymentId: string;
  userId: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  monthlyInstallment: number;
  numberOfMonths: number;
  paidInstallments: number;
  nextDueDate: number;
  status: "active" | "completed" | "defaulted";
  createdAt: number;
  updatedAt?: number;
}

// CIB Receipt schema
export interface CIBReceipt {
  id: string;
  paymentId: string;
  userId: string;
  userEmail: string;
  receiptImageUrl: string;
  amount: number;
  orderId?: string;
  vipUpgrade?: boolean;
  vipPackage?: VIPPackage;
  status: "pending" | "verified" | "rejected";
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: number;
  createdAt: number;
  updatedAt?: number;
}

// Checkout form schema
export const checkoutFormSchema = z.object({
  paymentMethod: z.enum(paymentMethods),
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCVC: z.string().optional(),
  installmentMonths: z.number().min(1).max(12).optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

// Filter schema for sheep browsing
export const sheepFilterSchema = z.object({
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minAge: z.number().optional(),
  maxAge: z.number().optional(),
  minWeight: z.number().optional(),
  maxWeight: z.number().optional(),
  cities: z.array(z.string()).optional(),
  status: z.enum(sheepStatuses).optional(),
});

export type SheepFilter = z.infer<typeof sheepFilterSchema>;

// Algerian provinces (Wilayat) - 58 provinces from official data - sorted alphabetically
export const algeriaCities = [
  "أدرار",
  "أم البواقي",
  "أولاد جلال",
  "إليزي",
  "الأغواط",
  "الجزائر",
  "الجلفة",
  "الشلف",
  "الطارف",
  "الوادي",
  "النعامة",
  "البليدة",
  "البويرة",
  "البيض",
  "المدية",
  "المسيلة",
  "المغير",
  "المنيعة",
  "باتنة",
  "بجاية",
  "برج باجي مختار",
  "برج بوعريريج",
  "بسكرة",
  "بشار",
  "بني عباس",
  "بومرداس",
  "تبسة",
  "تقرت",
  "تلمسان",
  "تمنراست",
  "تندوف",
  "تيارت",
  "تيبازة",
  "تيزي وزو",
  "تيسمسيلت",
  "تيميمون",
  "جانت",
  "جيجل",
  "خنشلة",
  "سطيف",
  "سعيدة",
  "سكيكدة",
  "سوق أهراس",
  "سيدي بلعباس",
  "عنابة",
  "عين الدفلة",
  "عين تيموشنت",
  "عين صالح",
  "عين قزام",
  "غرداية",
  "غليزان",
  "قالمة",
  "قسنطينة",
  "مستغانم",
  "معسكر",
  "ميلة",
  "ورقلة",
  "وهران",
] as const;

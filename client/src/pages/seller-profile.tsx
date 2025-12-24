import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UpdateSellerProfile, updateSellerProfileSchema, algeriaCities } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SellerProfile() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UpdateSellerProfile>({
    resolver: zodResolver(updateSellerProfileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      address: user?.address || "",
      city: user?.city || "",
      municipality: user?.municipality || "",
    },
  });

  const selectedCity = watch("city");
  const selectedMunicipality = watch("municipality");

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    if (user) {
      setValue("fullName", user.fullName || "");
      setValue("phone", user.phone || "");
      setValue("address", user.address || "");
      setValue("city", user.city || "");
      setValue("municipality", user.municipality || "");
    }
  }, [user, setValue]);

  const onSubmit = async (data: UpdateSellerProfile) => {
    if (!user) return;

    setSubmitting(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        ...data,
        profileComplete: true,
        updatedAt: Date.now(),
      });

      await refreshUser();

      toast({
        title: "✅ تم حفظ البيانات",
        description: "تم تحديث بيانات الملف الشخصي بنجاح",
      });

      setTimeout(() => {
        setLocation("/seller");
      }, 1000);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "❌ خطأ",
        description: "فشل تحديث البيانات. حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "seller") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-950 dark:to-slate-900">
      <div className="container max-w-2xl mx-auto p-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-right mb-2">
            📋 إكمال البيانات الشخصية
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-right">
            يرجى إكمال جميع البيانات الشخصية والاتصال لتفعيل حسابك كبائع
          </p>
        </div>

        {/* Alert */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="pt-6 flex gap-4 text-right">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                البيانات مطلوبة
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                يجب إكمال جميع البيانات الشخصية والعنوان ورقم الهاتف
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-right">معلومات البائع</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-right block">
                  الاسم الكامل *
                </Label>
                <Input
                  id="fullName"
                  placeholder="مثال: أحمد محمد السلمي"
                  dir="rtl"
                  {...register("fullName")}
                  className="text-right"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm text-right">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-right block">
                  رقم الهاتف *
                </Label>
                <Input
                  id="phone"
                  placeholder="مثال: 0771234567"
                  dir="ltr"
                  {...register("phone")}
                  className="text-left"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm text-right">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city" className="text-right block">
                  المدينة *
                </Label>
                <Select value={selectedCity} onValueChange={(value) => setValue("city", value)}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر المدينة" />
                  </SelectTrigger>
                  <SelectContent>
                    {algeriaCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.city && (
                  <p className="text-red-500 text-sm text-right">
                    {errors.city.message}
                  </p>
                )}
              </div>

              {/* Municipality */}
              <div className="space-y-2">
                <Label htmlFor="municipality" className="text-right block">
                  البلدية / الحي *
                </Label>
                <Input
                  id="municipality"
                  placeholder="مثال: بن عكنون، الحي الإداري، الوادي"
                  dir="rtl"
                  {...register("municipality")}
                  className="text-right"
                />
                {errors.municipality && (
                  <p className="text-red-500 text-sm text-right">
                    {errors.municipality.message}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-right block">
                  العنوان التفصيلي *
                </Label>
                <Input
                  id="address"
                  placeholder="مثال: شارع محمد علي الذهبي، عمارة 15، بجوار السوق المركزي"
                  dir="rtl"
                  {...register("address")}
                  className="text-right"
                />
                {errors.address && (
                  <p className="text-red-500 text-sm text-right">
                    {errors.address.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg font-semibold text-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جاري الحفظ...
                  </>
                ) : (
                  "✅ حفظ البيانات والمتابعة"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

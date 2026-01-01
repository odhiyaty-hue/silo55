import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadMultipleImagesToImgBB } from "@/lib/imgbb";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Sheep, insertSheepSchema, InsertSheep, algeriaCities } from "@shared/schema";
import { getMunicipalitiesForWilaya, getMunicipalitiesForWilayaSync } from "@shared/algeriaMunicipalities";
import SheepCard from "@/components/SheepCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Clock, CheckCircle2, XCircle, Loader2, Upload, X, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import placeholderImage from "@assets/generated_images/sheep_product_placeholder.png";

export default function SellerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [sheep, setSheep] = useState<Sheep[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [municipalities, setMunicipalities] = useState<string[]>([]);

  // Check if user profile is complete
  useEffect(() => {
    if (user && !user.profileComplete) {
      setLocation("/seller/profile");
    }
  }, [user, setLocation]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<InsertSheep>({
    resolver: zodResolver(insertSheepSchema),
  });

  const selectedCity = watch("city");

  useEffect(() => {
    if (user) {
      fetchSheep();
    }
  }, [user]);

  // Load municipalities when selected city changes
  useEffect(() => {
    if (selectedCity) {
      const muni = getMunicipalitiesForWilayaSync(selectedCity);
      if (muni.length > 0) {
        setMunicipalities(muni);
      } else {
        // Try async loading if sync doesn't have data yet
        getMunicipalitiesForWilaya(selectedCity).then(setMunicipalities);
      }
    } else {
      setMunicipalities([]);
    }
  }, [selectedCity]);

  const fetchSheep = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const sheepQuery = query(
        collection(db, "sheep"),
        where("sellerId", "==", user.uid)
      );
      
      const snapshot = await getDocs(sheepQuery);
      const sheepData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Sheep[];
      
      setSheep(sheepData);
    } catch (error) {
      console.error("Error fetching sheep:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 5) {
      toast({
        title: "تنبيه",
        description: "يمكنك رفع 5 صور كحد أقصى",
        variant: "destructive",
      });
      return;
    }

    setSelectedImages(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    try {
      // Upload images to ImgBB
      const imageUrls = await uploadMultipleImagesToImgBB(selectedImages);
      return imageUrls;
    } catch (error) {
      console.error("Error uploading images to ImgBB:", error);
      throw new Error("فشل رفع الصور. تأكد من وجود API key صحيح");
    }
  };

  const onSubmit = async (data: InsertSheep) => {
    if (!user) return;
    if (selectedImages.length === 0) {
      toast({
        title: "خطأ",
        description: "يجب رفع صورة واحدة على الأقل",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Upload images
      const imageUrls = await uploadImages();

      // Create sheep document
      const sheepData = {
        ...data,
        sellerId: user.uid,
        sellerEmail: user.email,
        images: imageUrls,
        status: "pending",
        isImported: !!data.isImported, // Ensure boolean
        createdAt: Date.now(),
      };

      await addDoc(collection(db, "sheep"), sheepData);

      toast({
        title: "تم إضافة الخروف بنجاح",
        description: "سيتم مراجعة القائمة من قبل الإدارة",
      });

      setAddDialogOpen(false);
      reset();
      setSelectedImages([]);
      setImagePreviews([]);
      fetchSheep();
    } catch (error) {
      console.error("Error adding sheep:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إضافة الخروف",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: sheep.length,
    pending: sheep.filter(s => s.status === "pending").length,
    approved: sheep.filter(s => s.status === "approved").length,
    rejected: sheep.filter(s => s.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-2 flex items-center gap-2">
              لوحة تحكم البائع
              {user?.vipStatus === "vip" && (
                <Crown className="h-6 w-6 text-amber-500" />
              )}
            </h1>
            <p className="text-muted-foreground">إدارة قوائم الأغنام الخاصة بك</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setLocation("/vip-upgrade")} variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50">
              <Crown className="ml-2 h-4 w-4" />
              {user?.vipStatus === "vip" ? "أنت VIP ⭐" : "ترقية إلى VIP"}
            </Button>
            <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-sheep">
              <Plus className="ml-2 h-4 w-4" />
              إضافة خروف
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">إجمالي القوائم</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">قيد المراجعة</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-sm text-muted-foreground">مقبول</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.rejected}</p>
                  <p className="text-sm text-muted-foreground">مرفوض</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sheep Grid */}
        {loading ? (
          <p className="text-center text-muted-foreground">جاري التحميل...</p>
        ) : sheep.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground mb-4">
                لم تقم بإضافة أي قوائم بعد
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة أول خروف
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sheep.map(s => (
              <SheepCard key={s.id} sheep={s} showStatus={true} />
            ))}
          </div>
        )}
      </div>

      {/* Add Sheep Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة خروف جديد</DialogTitle>
            <DialogDescription>
              املأ المعلومات التالية لإضافة خروف للبيع
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Sheep Type Selection */}
            <div className="space-y-2">
              <Label>نوع الأضحية *</Label>
              <Select onValueChange={(value) => setValue("isImported", value === "imported")}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع الأضحية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">أضحية محلية</SelectItem>
                  <SelectItem value="imported">أضحية مستوردة (أجنبية)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image Upload */}
            <div className="space-y-3">
              <Label>الصور (حتى 5 صور) *</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                  disabled={selectedImages.length >= 5}
                />
                <label htmlFor="image-upload">
                  <div className="flex flex-col items-center justify-center gap-2 cursor-pointer">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      انقر لرفع الصور ({selectedImages.length}/5)
                    </p>
                  </div>
                </label>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={preview}
                          alt={`معاينة ${idx + 1}`}
                          className="w-full aspect-square object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 left-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">السعر (ر.س) *</Label>
              <Input
                id="price"
                type="number"
                placeholder="مثال: 2500"
                {...register("price", { valueAsNumber: true })}
                data-testid="input-price"
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="age">العمر (بالأشهر) *</Label>
              <Input
                id="age"
                type="number"
                placeholder="مثال: 12"
                {...register("age", { valueAsNumber: true })}
                data-testid="input-age"
              />
              {errors.age && (
                <p className="text-sm text-destructive">{errors.age.message}</p>
              )}
            </div>

            {/* Weight */}
            <div className="space-y-2">
              <Label htmlFor="weight">الوزن (كجم) *</Label>
              <Input
                id="weight"
                type="number"
                placeholder="مثال: 45"
                {...register("weight", { valueAsNumber: true })}
                data-testid="input-weight"
              />
              {errors.weight && (
                <p className="text-sm text-destructive">{errors.weight.message}</p>
              )}
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">المدينة *</Label>
              <Select onValueChange={(value) => setValue("city", value)}>
                <SelectTrigger data-testid="select-city">
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  {algeriaCities.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            {/* Municipality */}
            <div className="space-y-2">
              <Label htmlFor="municipality">البلدية *</Label>
              <Select 
                onValueChange={(value) => setValue("municipality", value)}
                disabled={!selectedCity}
              >
                <SelectTrigger data-testid="select-municipality">
                  <SelectValue placeholder={selectedCity ? "اختر البلدية" : "اختر الولاية أولاً"} />
                </SelectTrigger>
                <SelectContent>
                  {municipalities.length > 0 ? (
                    municipalities.map(municipality => (
                      <SelectItem key={municipality} value={municipality}>
                        {municipality}
                      </SelectItem>
                    ))
                  ) : selectedCity ? (
                    <div className="p-2 text-sm text-muted-foreground">جاري التحميل...</div>
                  ) : null}
                </SelectContent>
              </Select>
              {errors.municipality && (
                <p className="text-sm text-destructive">{errors.municipality.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">الوصف *</Label>
              <Textarea
                id="description"
                placeholder="اكتب وصفاً تفصيلياً للخروف..."
                rows={4}
                {...register("description")}
                data-testid="textarea-description"
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={submitting}
                className="flex-1"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1"
                data-testid="button-submit-sheep"
              >
                {submitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  "إضافة الخروف"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// VIP BADGE added to component output below

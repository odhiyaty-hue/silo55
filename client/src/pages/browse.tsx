import Header from "@/components/Header";
import { useState, useEffect } from "react";
import { Sheep, algeriaCities, User } from "@shared/schema";
import SheepCard from "@/components/SheepCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, X, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { getSellerPriority } from "@/lib/vip-benefits";
import Footer from "@/components/Footer";

export default function BrowseSheep() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [sheep, setSheep] = useState<Sheep[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 48]);
  const [weightRange, setWeightRange] = useState<[number, number]>([0, 100]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [showImportedOnly, setShowImportedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const fetchApprovedSheep = async () => {
      setLoading(true);
      try {
        console.log("🐑 Fetching approved sheep from backend...");
        const response = await fetch("/api/sheep?approved=true", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let sheepData = await response.json() as Sheep[];

        console.log("✅ Fetched", sheepData.length, "approved sheep");
        setSheep(sheepData);
      } catch (error: any) {
        console.error("❌ Error fetching sheep:", error);
        setSheep([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedSheep();
  }, []);

  const filteredSheep = sheep.filter(s => {
    if (s.price < priceRange[0] || s.price > priceRange[1]) return false;
    if (s.age < ageRange[0] || s.age > ageRange[1]) return false;
    if (s.weight < weightRange[0] || s.weight > weightRange[1]) return false;
    if (selectedCities.length > 0 && !selectedCities.includes(s.city)) return false;
    if (showImportedOnly && !s.isImported) return false;
    return true;
  }).sort((a, b) => {
    // Sort by seller VIP priority (VIP sellers appear first)
    const priorityA = a.sellerVIPStatus ? getSellerPriority({ vipStatus: a.sellerVIPStatus } as User) : 0;
    const priorityB = b.sellerVIPStatus ? getSellerPriority({ vipStatus: b.sellerVIPStatus } as User) : 0;
    if (priorityB !== priorityA) return priorityB - priorityA;
    // Secondary sort: newest first
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // Log the state for debugging
  useEffect(() => {
    console.log("🔍 Browse Page State - Loading:", loading, "Sheep:", sheep.length, "Filtered:", filteredSheep.length);
  }, [loading, sheep, filteredSheep]);

  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  const clearFilters = () => {
    setPriceRange([0, 1000000]);
    setAgeRange([0, 48]);
    setWeightRange([0, 100]);
    setSelectedCities([]);
    setShowImportedOnly(false);
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Price Filter */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">السعر (د.ج)</Label>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">من</Label>
            <Input
              type="number"
              value={priceRange[0]}
              onChange={(e) => setPriceRange([Math.max(0, parseInt(e.target.value) || 0), priceRange[1]])}
              min={0}
              max={10000}
              placeholder="0"
              data-testid="input-price-min"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">إلى</Label>
            <Input
              type="number"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], Math.min(1000000, parseInt(e.target.value) || 1000000)])}
              min={0}
              max={1000000}
              placeholder="1000000"
              data-testid="input-price-max"
            />
          </div>
        </div>
      </div>

      {/* Age Filter */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">العمر (شهر)</Label>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">من</Label>
            <Input
              type="number"
              value={ageRange[0]}
              onChange={(e) => setAgeRange([Math.max(0, parseInt(e.target.value) || 0), ageRange[1]])}
              min={0}
              max={48}
              placeholder="0"
              data-testid="input-age-min"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">إلى</Label>
            <Input
              type="number"
              value={ageRange[1]}
              onChange={(e) => setAgeRange([ageRange[0], Math.min(48, parseInt(e.target.value) || 48)])}
              min={0}
              max={48}
              placeholder="48"
              data-testid="input-age-max"
            />
          </div>
        </div>
      </div>

      {/* Weight Filter */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">الوزن (كجم)</Label>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">من</Label>
            <Input
              type="number"
              value={weightRange[0]}
              onChange={(e) => setWeightRange([Math.max(0, parseInt(e.target.value) || 0), weightRange[1]])}
              min={0}
              max={100}
              placeholder="0"
              data-testid="input-weight-min"
            />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">إلى</Label>
            <Input
              type="number"
              value={weightRange[1]}
              onChange={(e) => setWeightRange([weightRange[0], Math.min(100, parseInt(e.target.value) || 100)])}
              min={0}
              max={100}
              placeholder="100"
              data-testid="input-weight-max"
            />
          </div>
        </div>
      </div>

      {/* Imported Filter */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="imported-filter"
            checked={showImportedOnly}
            onCheckedChange={(checked) => setShowImportedOnly(!!checked)}
            data-testid="checkbox-imported-only"
          />
          <Label
            htmlFor="imported-filter"
            className="text-base font-semibold cursor-pointer"
          >
            أضاحي مستوردة فقط
          </Label>
        </div>
      </div>

      {/* Cities Filter */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">المدينة</Label>
        <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
          {algeriaCities.map(city => (
            <div key={city} className="flex items-center gap-2">
              <Checkbox
                id={`city-${city}`}
                checked={selectedCities.includes(city)}
                onCheckedChange={() => toggleCity(city)}
                data-testid={`checkbox-city-${city}`}
              />
              <Label
                htmlFor={`city-${city}`}
                className="text-sm font-normal cursor-pointer"
              >
                {city}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      <Button
        variant="outline"
        className="w-full"
        onClick={clearFilters}
        data-testid="button-clear-filters"
      >
        <X className="ml-2 h-4 w-4" />
        مسح الفلاتر
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-2 flex items-center gap-2">
              تصفح الأغنام
              {user?.vipStatus && user.vipStatus !== "none" && (
                <Crown className="h-6 w-6 text-amber-500" />
              )}
            </h1>
            <p className="text-muted-foreground">
              {loading ? "جاري التحميل..." : `${filteredSheep.length} خروف متاح`}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            {user && (
              <Button onClick={() => setLocation("/vip-upgrade")} variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50">
                <Crown className="ml-2 h-4 w-4" />
                {user?.vipStatus && user.vipStatus !== "none" ? "أنت VIP ⭐" : "ترقية إلى VIP"}
              </Button>
            )}
            {/* Mobile Filter Button */}
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden" data-testid="button-open-filters">
                  <Filter className="ml-2 h-4 w-4" />
                  الفلاتر
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>الفلاتر</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FiltersContent />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>الفلاتر</CardTitle>
              </CardHeader>
              <CardContent>
                <FiltersContent />
              </CardContent>
            </Card>
          </aside>

          {/* Sheep Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-[4/3] w-full" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredSheep.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-lg text-muted-foreground mb-4">
                    لا توجد أغنام متاحة حالياً
                  </p>
                  <Button onClick={clearFilters} variant="outline" data-testid="button-clear-filters-empty">
                    مسح الفلاتر
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSheep.map(s => (
                  <SheepCard key={s.id} sheep={s} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
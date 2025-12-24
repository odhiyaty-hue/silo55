import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheep, SheepStatus } from "@shared/schema";
import { Link } from "wouter";
import { MapPin, Calendar, Weight } from "lucide-react";
import placeholderImage from "@assets/generated_images/sheep_product_placeholder.png";

interface SheepCardProps {
  sheep: Sheep;
  showStatus?: boolean;
}

export default function SheepCard({ sheep, showStatus = false }: SheepCardProps) {
  const getStatusColor = (status: SheepStatus) => {
    switch (status) {
      case "approved":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
    }
  };

  const getStatusLabel = (status: SheepStatus) => {
    switch (status) {
      case "approved":
        return "مقبول";
      case "pending":
        return "قيد المراجعة";
      case "rejected":
        return "مرفوض";
    }
  };

  const mainImage = sheep.images && sheep.images.length > 0 ? sheep.images[0] : placeholderImage;

  return (
    <Card className="overflow-hidden hover-elevate transition-all" data-testid={`card-sheep-${sheep.id}`}>
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={mainImage}
          alt={`خروف في ${sheep.city}`}
          className="w-full h-full object-cover transition-transform hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = placeholderImage;
          }}
        />
        
        {/* Price Badge */}
        <div className="absolute top-2 right-2">
          <Badge className="text-base font-bold px-3 py-1 bg-primary/90 backdrop-blur-sm">
            {sheep.price.toLocaleString()} د.ج
          </Badge>
        </div>

        {/* Status Badge (for seller/admin) */}
        {showStatus && (
          <div className="absolute top-2 left-2">
            <div className="flex flex-col gap-1">
              <Badge className={getStatusColor(sheep.status)}>
                {getStatusLabel(sheep.status)}
              </Badge>
              {sheep.status === "rejected" && sheep.rejectionReason && (
                <div className="bg-red-500/90 backdrop-blur-sm rounded text-white text-xs p-1 max-w-[150px] line-clamp-2">
                  {sheep.rejectionReason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image Count Indicator */}
        {sheep.images && sheep.images.length > 1 && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="text-xs">
              {sheep.images.length} صور
            </Badge>
          </div>
        )}
      </div>

      {/* Card Content */}
      <CardContent className="p-4">
        {/* Metadata Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{sheep.age} شهر</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Weight className="h-4 w-4 flex-shrink-0" />
            <span>{sheep.weight} كجم</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{sheep.city}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {sheep.description}
        </p>

        {/* View Button */}
        <Link href={`/sheep/${sheep.id}`}>
          <Button className="w-full" data-testid={`button-view-${sheep.id}`}>
            عرض التفاصيل
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

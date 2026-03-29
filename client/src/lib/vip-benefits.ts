import { User, VIP_PACKAGES, Sheep } from "@shared/schema";

/**
 * Check if user has an active VIP subscription
 */
export function isVIPActive(user: User | null): boolean {
  if (!user || !user.vipStatus || user.vipStatus === "none") return false;
  
  // Check if VIP has expired
  if (user.vipExpiresAt && new Date(user.vipExpiresAt).getTime() < Date.now()) {
    return false;
  }
  
  return true;
}

/**
 * Get VIP discount percentage for buyer
 */
export function getVIPDiscount(user: User | null): number {
  if (!isVIPActive(user) || !user?.vipStatus) return 0;
  
  const pkg = VIP_PACKAGES[user.vipStatus as keyof typeof VIP_PACKAGES];
  return pkg?.buyerDiscount || 0;
}

/**
 * Calculate discounted price for buyer
 */
export function applyBuyerDiscount(price: number, user: User | null): number {
  const discount = getVIPDiscount(user);
  if (discount === 0) return price;
  
  return Math.round(price * (1 - discount / 100));
}

/**
 * Get seller priority level (for sorting listings)
 */
export function getSellerPriority(seller: User | null): number {
  if (!isVIPActive(seller) || !seller?.vipStatus) return 0;
  
  const pkg = VIP_PACKAGES[seller.vipStatus as keyof typeof VIP_PACKAGES];
  if (pkg?.sellerPriority === "high") return 3;
  if (pkg?.sellerPriority === "medium") return 2;
  if (pkg?.sellerPriority === "low") return 1;
  return 0;
}

/**
 * Sort sheep listings with VIP sellers first
 */
export async function sortByVIPPriority(
  sheep: Sheep[],
  sellersMap: Map<string, User>
): Promise<Sheep[]> {
  return sheep.sort((a, b) => {
    const sellerA = sellersMap.get(a.sellerId);
    const sellerB = sellersMap.get(b.sellerId);
    
    const priorityA = getSellerPriority(sellerA || null);
    const priorityB = getSellerPriority(sellerB || null);
    
    return priorityB - priorityA;
  });
}

/**
 * Get VIP package details for user
 */
export function getVIPPackageInfo(user: User | null) {
  if (!isVIPActive(user) || !user?.vipStatus) return null;
  
  return {
    ...VIP_PACKAGES[user.vipStatus as keyof typeof VIP_PACKAGES],
    expiresAt: user.vipExpiresAt,
    activeSince: user.vipUpgradedAt,
  };
}

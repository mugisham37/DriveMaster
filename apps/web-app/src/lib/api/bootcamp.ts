export interface BootcampData {
  hasDiscount: boolean;
  countryCode2?: string;
  countryName?: string;
  hello?: string;
  discountPercentage?: number;
  fullCompletePrice: number;
  completePrice: number;
  fullPart1Price: number;
  part1Price: number;
}

export async function getBootcampData(): Promise<BootcampData> {
  // In a real implementation, this would:
  // 1. Detect user's country from IP
  // 2. Check if country qualifies for discount
  // 3. Calculate pricing based on discount

  return {
    hasDiscount: false,
    fullCompletePrice: 997,
    completePrice: 997,
    fullPart1Price: 497,
    part1Price: 497,
  };
}

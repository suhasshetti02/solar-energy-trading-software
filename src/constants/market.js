export const BASE_RATE_PER_KWH = 10;
export const PREMIUM_THRESHOLD_KWH = 2;
export const DEFAULT_DONOR_EXTRA_RATE_PER_KWH = 0;
export const DEFAULT_RESERVE_BATTERY_PERCENT = 30;
export const DEFAULT_MAX_SHAREABLE_ENERGY_KWH = 4;

export const calculatePricing = (units, donorExtraRatePerKwh = 0) => {
  const safeUnits = Math.max(0, parseFloat(Number(units).toFixed(2)));
  const baseUnits = Math.min(safeUnits, PREMIUM_THRESHOLD_KWH);
  const premiumUnits = Math.max(0, safeUnits - PREMIUM_THRESHOLD_KWH);
  const baseAmount = parseFloat((baseUnits * BASE_RATE_PER_KWH).toFixed(2));
  const premiumAmount = parseFloat((premiumUnits * donorExtraRatePerKwh).toFixed(2));
  const totalAmount = parseFloat((baseAmount + premiumAmount).toFixed(2));

  return {
    units: safeUnits,
    baseRatePerKwh: BASE_RATE_PER_KWH,
    premiumThresholdKwh: PREMIUM_THRESHOLD_KWH,
    donorExtraRatePerKwh,
    baseUnits: parseFloat(baseUnits.toFixed(2)),
    premiumUnits: parseFloat(premiumUnits.toFixed(2)),
    baseAmount,
    premiumAmount,
    totalAmount,
    effectiveRatePerKwh: safeUnits > 0 ? parseFloat((totalAmount / safeUnits).toFixed(2)) : 0,
  };
};

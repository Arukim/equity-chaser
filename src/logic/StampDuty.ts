/**
 * Calculates NSW Transfer (Stamp) Duty for residential property.
 * Automatically applies First Home Buyers Assistance Scheme (FHBAS) if eligible.
 * Rates based on 2025-2026 Revenue NSW indexed brackets.
 * * @param propertyValue - Purchase price of the property
 * @param isFirstHomeBuyer - Toggle from the UI
 * @returns The calculated stamp duty amount in AUD
 */
export function calculateNSWStampDuty(propertyValue: number, isFirstHomeBuyer: boolean = false): number {
  if (propertyValue <= 0) return 0;

  const roundToNext100 = (amount: number) => Math.ceil(amount / 100) * 100;

  // Inner helper: Base NSW scale (indexed for 25-26 FY)
  const getStandardDuty = (val: number): number => {
    if (val <= 17000) return Math.ceil(val / 100) * 1.25;
    if (val <= 37000) return 212 + (roundToNext100(val - 17000) / 100) * 1.50;
    if (val <= 99000) return 512 + (roundToNext100(val - 37000) / 100) * 1.75;
    if (val <= 372000) return 1597 + (roundToNext100(val - 99000) / 100) * 3.50;
    if (val <= 1240000) return 11152 + (roundToNext100(val - 372000) / 100) * 4.50;
    if (val <= 3721000) return 50212 + (roundToNext100(val - 1240000) / 100) * 5.50;
    
    // Premium Property
    return 186667 + (roundToNext100(val - 3721000) / 100) * 7.00;
  };

  const standardDuty = getStandardDuty(propertyValue);

  // First Home Buyers logic
  if (isFirstHomeBuyer && propertyValue <= 1000000) {
    if (propertyValue <= 800000) {
      return 0; // Full exemption
    }
    
    // Concessional rate: Linear proportion from $800k to $1M.
    const dutyAtOneMillion = getStandardDuty(1000000); 
    const concessionProportion = (propertyValue - 800000) / 200000;
    
    return dutyAtOneMillion * concessionProportion;
  }

  return standardDuty;
}
import { describe, it, expect } from 'vitest'
import { calculateNSWStampDuty } from './StampDuty'

describe('calculateNSWStampDuty', () => {
  describe('Standard duty (non-first home buyer)', () => {
    it('returns 0 for property value of 0 or less', () => {
      expect(calculateNSWStampDuty(0, false)).toBe(0)
      expect(calculateNSWStampDuty(-1000, false)).toBe(0)
    })

    it('calculates duty for property under $17,000', () => {
      // $17,000: Math.ceil(17000/100) * 1.25 = 170 * 1.25 = 212.5
      expect(calculateNSWStampDuty(17000, false)).toBeCloseTo(212.5)
      // $16,900: Math.ceil(16900/100) * 1.25 = 169 * 1.25 = 211.25
      expect(calculateNSWStampDuty(16900, false)).toBeCloseTo(211.25)
    })

    it('calculates duty for property between $17,000 and $37,000', () => {
      // $37,000: 212 + (roundToNext100(37000 - 17000) / 100) * 1.50 = 212 + 200 * 1.50 = 512
      expect(calculateNSWStampDuty(37000, false)).toBeCloseTo(512)
      // $25,000: 212 + (roundToNext100(25000 - 17000) / 100) * 1.50 = 212 + 80 * 1.50 = 332
      expect(calculateNSWStampDuty(25000, false)).toBeCloseTo(332)
    })

    it('calculates duty for property between $37,000 and $99,000', () => {
      // $99,000: 512 + (roundToNext100(99000 - 37000) / 100) * 1.75 = 512 + 620 * 1.75 = 1597
      expect(calculateNSWStampDuty(99000, false)).toBeCloseTo(1597)
      // $70,000: 512 + (Math.ceil((70000-37000)/100) * 1.75) = 512 + 330 * 1.75 = 1089.5
      expect(calculateNSWStampDuty(70000, false)).toBeCloseTo(1089.5)
    })

    it('calculates duty for property between $99,000 and $372,000', () => {
      // $372,000: 1597 + (roundToNext100(372000 - 99000) / 100) * 3.50 = 1597 + 2730 * 3.50 = 11152
      expect(calculateNSWStampDuty(372000, false)).toBeCloseTo(11152)
      // $200,000: 1597 + (roundToNext100(200000 - 99000) / 100) * 3.50 = 1597 + 1010 * 3.50 = 5132
      expect(calculateNSWStampDuty(200000, false)).toBeCloseTo(5132)
    })

    it('calculates duty for property between $372,000 and $1,240,000', () => {
      // $1,240,000: 11152 + (roundToNext100(1240000 - 372000) / 100) * 4.50 = 11152 + 8680 * 4.50 = 50212
      expect(calculateNSWStampDuty(1240000, false)).toBeCloseTo(50212)
      // $700,000: 11152 + (roundToNext100(700000 - 372000) / 100) * 4.50 = 11152 + 3280 * 4.50 = 25912
      expect(calculateNSWStampDuty(700000, false)).toBeCloseTo(25912)
    })

    it('calculates duty for property between $1,240,000 and $3,721,000', () => {
      // $3,721,000: 50212 + (roundToNext100(3721000 - 1240000) / 100) * 5.50 = 50212 + 24810 * 5.50 = 186667
      expect(calculateNSWStampDuty(3721000, false)).toBeCloseTo(186667)
      // $2,000,000: 50212 + (Math.ceil((2000000-1240000)/100) * 5.50) = 50212 + 7600 * 5.50 = 92012
      expect(calculateNSWStampDuty(2000000, false)).toBeCloseTo(92012)
    })

    it('calculates duty for premium property over $3,721,000', () => {
      // $4,000,000: 186667 + (roundToNext100(4000000 - 3721000) / 100) * 7.00 = 186667 + 2790 * 7.00 = 206197
      expect(calculateNSWStampDuty(4000000, false)).toBeCloseTo(206197)
      // $5,000,000: 186667 + (Math.ceil((5000000-3721000)/100) * 7.00) = 186667 + 12790 * 7.00 = 276197
      expect(calculateNSWStampDuty(5000000, false)).toBeCloseTo(276197)
    })
  })

  describe('First Home Buyer Duty (FHBAS)', () => {
    it('waives duty for properties $800,000 or less', () => {
      expect(calculateNSWStampDuty(800000, true)).toBe(0)
      expect(calculateNSWStampDuty(500000, true)).toBe(0)
    })

    it('applies concession for properties between $800,000 and $1,000,000', () => {
      // getStandardDuty(1000000) = 50212
      // (1000000 - 800000) / 200000 = 1
      // dutyAtOneMillion = 50212
      // concession for 900,000 = 50212 * ( (900000 - 800000) / 200000 ) = 50212 * 0.5 = 25106
      const dutyAtOneMillion = calculateNSWStampDuty(1000000, false);
      const concessionProportion = (900000 - 800000) / 200000
      const expected = dutyAtOneMillion * concessionProportion
      expect(calculateNSWStampDuty(900000, true)).toBeCloseTo(expected)
    })

    it('applies standard duty for properties over $1,000,000 (FHBAS not applicable)', () => {
      // $1,200,000 is over FHBAS limit, so standard duty applies
      // getStandardDuty(1200000) = 11152 + (roundToNext100(1200000 - 372000) / 100) * 4.50 = 11152 + 8280 * 4.50 = 48412
      expect(calculateNSWStampDuty(1200000, true)).toBeCloseTo(48412)
    })
  })

  describe('Edge cases', () => {
    it('handles very small positive property values', () => {
      expect(calculateNSWStampDuty(1, false)).toBeCloseTo(1.25) // Math.ceil(1/100) * 1.25 = 1 * 1.25 = 1.25
    })

    it('handles large property values', () => {
      expect(calculateNSWStampDuty(10000000, false)).toBeCloseTo(626197) // 186667 + (roundToNext100(10000000 - 3721000) / 100) * 7.00 = 186667 + 62790 * 7.00 = 186667 + 439530 = 626197
    })
  })
})
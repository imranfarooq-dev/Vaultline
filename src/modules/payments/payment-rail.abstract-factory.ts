/**
 * ============================================================================
 * PATTERN: ABSTRACT FACTORY (Creational)
 * ============================================================================
 * Problem : Sending money out of the bank uses a "payment rail". A domestic
 *           RAAST payment and an international SWIFT payment each need a
 *           matching SET of parts: a validator, a fee calculator, and a message
 *           formatter. Mixing parts (a SWIFT validator with a RAAST formatter)
 *           would produce a broken payment.
 * Solution: One factory interface creates the whole FAMILY of related objects.
 *           Choose the factory once; every part it produces belongs together.
 *
 * Analogy : A furniture shop's "Modern" line and "Classic" line. Pick a line
 *           and the chair, table and sofa always match.
 *
 * Factory Method vs Abstract Factory:
 *   Factory Method   -> ONE product, subclass decides which (see accounts)
 *   Abstract Factory -> a FAMILY of products that must be used together
 * ============================================================================
 */
export interface OutboundPayment {
  amountMinor: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryIban: string;
  beneficiaryBic?: string;
  purpose?: string;
}

// ----- Abstract products -----
export interface PaymentValidator {
  validate(payment: OutboundPayment): string[];
}
export interface FeeCalculator {
  feeMinor(payment: OutboundPayment): number;
}
export interface PaymentMessageFormatter {
  format(payment: OutboundPayment, reference: string): string;
}

// ----- Abstract factory -----
export interface PaymentRailFactory {
  readonly rail: 'RAAST' | 'SWIFT';
  readonly settlementTime: string;
  createValidator(): PaymentValidator;
  createFeeCalculator(): FeeCalculator;
  createMessageFormatter(): PaymentMessageFormatter;
}

// ===== Family 1: RAAST (Pakistan's instant domestic payment system) =====
class RaastValidator implements PaymentValidator {
  validate(p: OutboundPayment): string[] {
    const errors: string[] = [];
    if (p.currency !== 'PKR') errors.push('RAAST only supports PKR');
    if (!/^PK\d{2}[A-Z]{4}\d{16}$/.test(p.beneficiaryIban)) errors.push('Beneficiary must be a valid Pakistani IBAN (24 characters)');
    if (p.amountMinor > 100_000_000) errors.push('RAAST limit is Rs 1,000,000 per payment');
    return errors;
  }
}
class RaastFeeCalculator implements FeeCalculator {
  feeMinor(): number {
    return 0; // instant domestic payments are free for customers
  }
}
class RaastMessageFormatter implements PaymentMessageFormatter {
  format(p: OutboundPayment, reference: string): string {
    return JSON.stringify({ scheme: 'RAAST', msgId: reference, amount: (p.amountMinor / 100).toFixed(2), cdtrIban: p.beneficiaryIban, cdtrName: p.beneficiaryName });
  }
}
export class RaastPaymentFactory implements PaymentRailFactory {
  readonly rail = 'RAAST' as const;
  readonly settlementTime = 'Instant (seconds)';
  createValidator() { return new RaastValidator(); }
  createFeeCalculator() { return new RaastFeeCalculator(); }
  createMessageFormatter() { return new RaastMessageFormatter(); }
}

// ===== Family 2: SWIFT (international wire) =====
class SwiftValidator implements PaymentValidator {
  validate(p: OutboundPayment): string[] {
    const errors: string[] = [];
    if (!p.beneficiaryBic || !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(p.beneficiaryBic)) errors.push('A valid BIC/SWIFT code is required');
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(p.beneficiaryIban)) errors.push('Beneficiary IBAN format is invalid');
    if (!p.purpose) errors.push('Purpose of payment is mandatory for international transfers');
    return errors;
  }
}
class SwiftFeeCalculator implements FeeCalculator {
  feeMinor(p: OutboundPayment): number {
    return 250_000 + Math.round(p.amountMinor * 0.001); // flat Rs 2,500 + 0.1%
  }
}
/** Simplified MT103-style text message. */
class SwiftMessageFormatter implements PaymentMessageFormatter {
  format(p: OutboundPayment, reference: string): string {
    return [`:20:${reference}`, `:32A:${new Date().toISOString().slice(2, 10).replace(/-/g, '')}${p.currency}${(p.amountMinor / 100).toFixed(2).replace('.', ',')}`, `:57A:${p.beneficiaryBic}`, `:59:/${p.beneficiaryIban}`, p.beneficiaryName, `:70:${p.purpose}`].join('\n');
  }
}
export class SwiftPaymentFactory implements PaymentRailFactory {
  readonly rail = 'SWIFT' as const;
  readonly settlementTime = '1-3 business days';
  createValidator() { return new SwiftValidator(); }
  createFeeCalculator() { return new SwiftFeeCalculator(); }
  createMessageFormatter() { return new SwiftMessageFormatter(); }
}

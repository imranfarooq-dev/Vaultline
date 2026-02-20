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

/**
 * ============================================================================
 * PATTERN: SINGLETON (Creational)
 * ============================================================================
 * Problem : Every transaction needs a unique, human-readable reference such as
 *           "TXN-20260917-000042". If two generator objects existed, they
 *           could hand out the same sequence number.
 * Solution: Make the constructor private and expose ONE shared instance via
 *           a static getInstance() method.
 *
 * Analogy : A country has exactly one central bank issuing currency serials.
 *
 * NestJS note: Nest providers are already singletons inside one app, so in
 * day-to-day Nest code you rarely hand-write this. We do it here so you can
 * see the classic pattern, then register the instance with `useValue`.
 * Caveat : A singleton is only unique per PROCESS. With 3 Kubernetes pods you
 *          get 3 instances, so the pod name is added to keep references unique.
 * ============================================================================
 */
export class ReferenceNumberGenerator {
  private static instance: ReferenceNumberGenerator | undefined;
  private sequence = 0;
  private readonly nodeTag: string;
}

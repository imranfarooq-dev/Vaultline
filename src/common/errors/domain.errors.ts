/**
 * Business errors are plain classes with no HTTP knowledge.
 * The DomainExceptionFilter translates them into HTTP responses.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  constructor(message: string, readonly details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;
}

export class BusinessRuleError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly httpStatus = 422;
}

export class InvalidStateTransitionError extends DomainError {
  readonly code = 'INVALID_STATE_TRANSITION';
  readonly httpStatus = 409;
}

export class FraudSuspectedError extends DomainError {
  readonly code = 'FRAUD_SUSPECTED';
  readonly httpStatus = 403;
}

export class DependencyUnavailableError extends DomainError {
  readonly code = 'DEPENDENCY_UNAVAILABLE';
  readonly httpStatus = 503;
}

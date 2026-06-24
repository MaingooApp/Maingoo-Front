export type BillingSubscriptionStatus =
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'UNPAID'
  | 'PAUSED';

export interface BillingSubscription {
  id: string;
  enterpriseId: string;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  stripeProductId: string | null;
  status: BillingSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  rawPayload: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionLimits {
  maxUsers?: number;
  maxProducts?: number;
  maxSuppliers?: number;
  maxInvoicesPerMonth?: number;
  [key: string]: string | number | boolean | null | undefined;
}

export interface CurrentSubscriptionResponse {
  subscription: BillingSubscription | null;
  hasActiveSubscription: boolean;
  limits?: SubscriptionLimits | null;
}

export interface BillingPortalResponse {
  url: string;
}

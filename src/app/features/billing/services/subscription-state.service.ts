import { Injectable, computed, signal } from '@angular/core';
import {
  BillingSubscriptionStatus,
  CurrentSubscriptionResponse
} from '../interfaces/billing-subscription.interface';

export type SubscriptionIssueKind =
  | 'missing'
  | 'paused'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'unknown';

export interface SubscriptionIssue {
  kind: SubscriptionIssueKind;
  status: BillingSubscriptionStatus | 'UNKNOWN';
}

@Injectable({ providedIn: 'root' })
export class SubscriptionStateService {
  private readonly currentState = signal<CurrentSubscriptionResponse | null>(null);
  private readonly forcedPaymentRequired = signal(false);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly current = this.currentState.asReadonly();

  readonly issue = computed<SubscriptionIssue | null>(() => {
    const state = this.currentState();

    if (state?.hasActiveSubscription) {
      return null;
    }

    if (!state) {
      return this.forcedPaymentRequired() ? { kind: 'unknown', status: 'UNKNOWN' } : null;
    }

    const status = state.subscription?.status;

    if (!status) {
      return { kind: 'missing', status: 'UNKNOWN' };
    }

    return {
      kind: this.toIssueKind(status),
      status
    };
  });

  setLoading(loading: boolean): void {
    this.loading.set(loading);
  }

  setCurrent(state: CurrentSubscriptionResponse): void {
    this.currentState.set(state);
    this.error.set(null);

    if (state.hasActiveSubscription) {
      this.forcedPaymentRequired.set(false);
    }
  }

  setError(message: string): void {
    this.error.set(message);
  }

  markPaymentRequired(): void {
    this.forcedPaymentRequired.set(true);
  }

  private toIssueKind(status: BillingSubscriptionStatus): SubscriptionIssueKind {
    const issueByStatus: Record<BillingSubscriptionStatus, SubscriptionIssueKind> = {
      INCOMPLETE: 'incomplete',
      INCOMPLETE_EXPIRED: 'incomplete',
      TRIALING: 'unknown',
      ACTIVE: 'unknown',
      PAST_DUE: 'past_due',
      CANCELED: 'canceled',
      UNPAID: 'unpaid',
      PAUSED: 'paused'
    };

    return issueByStatus[status];
  }
}

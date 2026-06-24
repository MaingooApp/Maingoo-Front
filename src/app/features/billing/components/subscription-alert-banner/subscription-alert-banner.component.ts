import { Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { IconComponent } from '@shared/components/icon/icon.component';
import { BillingService } from '../../services/billing.service';
import { SubscriptionIssue, SubscriptionStateService } from '../../services/subscription-state.service';

@Component({
  selector: 'app-subscription-alert-banner',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, IconComponent],
  templateUrl: './subscription-alert-banner.component.html'
})
export class SubscriptionAlertBannerComponent implements OnInit {
  private readonly billingService = inject(BillingService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly subscriptionState = inject(SubscriptionStateService);
  protected readonly issue = this.subscriptionState.issue;

  protected readonly title = computed(() => this.getTitle(this.issue()));
  protected readonly detail = computed(() => this.getDetail(this.issue()));
  protected readonly icon = computed(() => this.getIcon(this.issue()));
  protected readonly toneClass = computed(() => this.getToneClass(this.issue()));

  ngOnInit(): void {
    if (!this.subscriptionState.current() && !this.subscriptionState.loading()) {
      this.refresh();
    }
  }

  protected refresh(): void {
    this.billingService.getCurrentSubscription().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => undefined
    });
  }

  private getTitle(issue: SubscriptionIssue | null): string {
    if (!issue) {
      return '';
    }

    const titles: Record<SubscriptionIssue['kind'], string> = {
      missing: 'No hay una suscripcion activa',
      paused: 'Tu suscripcion esta pausada',
      past_due: 'Hay un pago pendiente',
      unpaid: 'La suscripcion esta impagada',
      canceled: 'La suscripcion esta cancelada',
      incomplete: 'La suscripcion no se completo',
      unknown: 'Hay un problema con tu suscripcion'
    };

    return titles[issue.kind];
  }

  private getDetail(issue: SubscriptionIssue | null): string {
    if (!issue) {
      return '';
    }

    const details: Record<SubscriptionIssue['kind'], string> = {
      missing: 'Activa un plan o revisa tu cuenta de facturacion para recuperar el acceso completo.',
      paused: 'Reanuda la suscripcion desde Stripe para recuperar el acceso a las funciones de Maingoo.',
      past_due: 'Actualiza el metodo de pago o completa el pago pendiente para evitar bloqueos.',
      unpaid: 'Actualiza tus datos de pago en Stripe para reactivar el servicio.',
      canceled: 'Crea o reactiva una suscripcion para volver a usar Maingoo.',
      incomplete: 'Completa el proceso de pago o revisa tus datos de facturacion.',
      unknown: 'Revisa el estado de facturacion para recuperar el acceso completo.'
    };

    return details[issue.kind];
  }

  private getIcon(issue: SubscriptionIssue | null): string {
    if (!issue) {
      return 'info';
    }

    return issue.kind === 'paused' ? 'pause_circle' : 'warning';
  }

  private getToneClass(issue: SubscriptionIssue | null): string {
    if (issue?.kind === 'paused' || issue?.kind === 'past_due' || issue?.kind === 'incomplete') {
      return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100';
    }

    return 'border-red-200 bg-red-50 text-red-900 dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-100';
  }
}

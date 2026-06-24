import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { BillingSubscriptionStatus } from '../../interfaces/billing-subscription.interface';
import { BillingService } from '../../services/billing.service';
import { SubscriptionIssue, SubscriptionStateService } from '../../services/subscription-state.service';
import { SectionHeaderService } from '@app/layout/service/section-header.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ToastService } from '@shared/services/toast.service';

@Component({
  selector: 'app-subscription-settings',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, IconComponent],
  templateUrl: './subscription-settings.component.html',
  host: {
    class: 'block h-full min-h-0'
  }
})
export class SubscriptionSettingsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('headerTpl') headerTpl!: TemplateRef<unknown>;

  private readonly billingService = inject(BillingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly headerService = inject(SectionHeaderService);
  private readonly toastService = inject(ToastService);

  protected readonly subscriptionState = inject(SubscriptionStateService);
  protected readonly openingPortal = signal(false);

  protected readonly current = this.subscriptionState.current;
  protected readonly issue = this.subscriptionState.issue;
  protected readonly subscription = computed(() => this.current()?.subscription ?? null);

  protected readonly statusLabel = computed(() => this.getStatusLabel(this.subscription()?.status));
  protected readonly statusSeverity = computed(() => this.getStatusSeverity(this.subscription()?.status));
  protected readonly issueTitle = computed(() => this.getIssueTitle(this.issue()));
  protected readonly issueDetail = computed(() => this.getIssueDetail(this.issue()));

  ngOnInit(): void {
    this.refresh();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.headerService.setContent(this.headerTpl);
    });
  }

  ngOnDestroy(): void {
    this.headerService.reset();
  }

  protected refresh(): void {
    this.billingService.getCurrentSubscription().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      error: () => this.toastService.error('No se pudo actualizar', 'Revisa tu conexion o vuelve a intentarlo.')
    });
  }

  protected openBillingPortal(): void {
    this.openingPortal.set(true);

    this.billingService
      .createPortalSession(`${window.location.origin}/suscripcion`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => {
          window.location.href = url;
        },
        error: () => {
          this.openingPortal.set(false);
          this.toastService.error('No se pudo abrir Stripe', 'Intentalo de nuevo en unos segundos.');
        }
      });
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  private getStatusLabel(status: BillingSubscriptionStatus | undefined): string {
    const labels: Record<BillingSubscriptionStatus, string> = {
      INCOMPLETE: 'Incompleta',
      INCOMPLETE_EXPIRED: 'Incompleta expirada',
      TRIALING: 'Trial activo',
      ACTIVE: 'Activa',
      PAST_DUE: 'Pago pendiente',
      CANCELED: 'Cancelada',
      UNPAID: 'Impagada',
      PAUSED: 'Pausada'
    };

    return status ? labels[status] : 'Sin suscripcion';
  }

  private getStatusSeverity(status: BillingSubscriptionStatus | undefined): 'success' | 'info' | 'warn' | 'danger' {
    if (status === 'ACTIVE' || status === 'TRIALING') {
      return 'success';
    }

    if (status === 'PAST_DUE' || status === 'PAUSED' || status === 'INCOMPLETE') {
      return 'warn';
    }

    if (!status) {
      return 'info';
    }

    return 'danger';
  }

  private getIssueTitle(issue: SubscriptionIssue | null): string {
    if (!issue) {
      return 'Tu suscripcion esta operativa';
    }

    const titles: Record<SubscriptionIssue['kind'], string> = {
      missing: 'No encontramos una suscripcion activa',
      paused: 'La suscripcion esta pausada',
      past_due: 'Hay un pago pendiente',
      unpaid: 'La suscripcion esta impagada',
      canceled: 'La suscripcion esta cancelada',
      incomplete: 'La suscripcion no se completo',
      unknown: 'Hay un problema con la suscripcion'
    };

    return titles[issue.kind];
  }

  private getIssueDetail(issue: SubscriptionIssue | null): string {
    if (!issue) {
      return 'Puedes gestionar tus datos de facturacion, metodo de pago e historial desde el portal seguro de Stripe.';
    }

    const details: Record<SubscriptionIssue['kind'], string> = {
      missing: 'Abre Stripe para crear o recuperar una suscripcion asociada a tu empresa.',
      paused: 'Abre Stripe y reanuda la suscripcion. Si el importe pendiente es 0, Stripe solo cambiara el estado.',
      past_due: 'Actualiza el metodo de pago o completa el intento de pago pendiente desde Stripe.',
      unpaid: 'Actualiza los datos de pago para que Stripe reactive el servicio.',
      canceled: 'Necesitas una suscripcion activa para volver a usar Maingoo.',
      incomplete: 'Completa los datos de pago pendientes para finalizar la activacion.',
      unknown: 'Revisa la cuenta de facturacion en Stripe o actualiza el estado tras realizar cambios.'
    };

    return details[issue.kind];
  }
}

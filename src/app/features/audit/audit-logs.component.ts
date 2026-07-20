import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { IconComponent } from '@app/shared/components/icon/icon.component';
import { ToastService } from '@app/shared/services/toast.service';
import { AuditLogFilters, AuditLogItem, AuditLogService } from './audit-log.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, TableModule, TagModule, IconComponent],
  template: `
    <section class="flex h-full min-h-0 flex-col gap-5 p-6">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <app-icon name="history" size="xl" class="text-primary"></app-icon>
          <div>
            <h1 class="mg-text m-0 text-2xl font-bold">Historial de auditoría</h1>
            <p class="mg-text-muted m-0 text-sm">Acciones realizadas en la empresa</p>
          </div>
        </div>
        <button pButton label="Actualizar" severity="secondary" [loading]="loading()" (click)="load()">
          <app-icon name="refresh" size="sm" class="mr-2"></app-icon>
        </button>
      </header>

      <div class="mg-surface grid grid-cols-1 gap-3 rounded-content p-4 md:grid-cols-5">
        <input class="rounded-lg border border-surface px-3 py-2 text-sm" placeholder="Acción" [(ngModel)]="action" />
        <input
          class="rounded-lg border border-surface px-3 py-2 text-sm"
          placeholder="Recurso"
          [(ngModel)]="resourceType" />
        <select class="rounded-lg border border-surface px-3 py-2 text-sm" [(ngModel)]="status">
          <option value="">Todos los resultados</option>
          <option value="SUCCEEDED">Correcto</option>
          <option value="FAILED">Fallido</option>
        </select>
        <input class="rounded-lg border border-surface px-3 py-2 text-sm" type="date" [(ngModel)]="from" />
        <button pButton label="Filtrar" (click)="load()"></button>
      </div>

      <div class="mg-surface min-h-0 flex-1 overflow-auto rounded-content">
        <p-table [value]="items()" [loading]="loading()" [rowHover]="true" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Recurso</th>
              <th>Canal</th>
              <th>Resultado</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td class="whitespace-nowrap text-sm">{{ item.occurredAt | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
              <td>
                <div class="flex flex-col">
                  <span class="mg-text text-sm font-medium">{{ item.actorEmail || 'Sistema' }}</span>
                  <span class="mg-text-muted text-xs">{{ item.sourceService }}</span>
                </div>
              </td>
              <td>
                <span class="mg-text text-sm font-medium">{{ actionSummary(item) }}</span>
                @for (detail of changeDetails(item); track detail) {
                  <div class="mg-text-muted mt-1 text-xs">{{ detail }}</div>
                }
              </td>
              <td>
                <div class="flex flex-col">
                  <span class="text-sm">{{ resourceTypeLabel(item.resourceType) }}</span>
                  @if (item.resourceLabel) {
                    <span class="mg-text-muted text-xs">{{ item.resourceLabel }}</span>
                  }
                </div>
              </td>
              <td class="text-sm">{{ channelLabel(item.channel) }}</td>
              <td>
                <p-tag
                  [value]="item.status === 'SUCCEEDED' ? 'Correcto' : 'Fallido'"
                  [severity]="item.status === 'SUCCEEDED' ? 'success' : 'danger'">
                </p-tag>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6" class="mg-text-muted py-10 text-center">No hay acciones registradas.</td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      @if (nextCursor()) {
        <div class="flex justify-center">
          <button pButton label="Cargar más" severity="secondary" [loading]="loading()" (click)="loadMore()"></button>
        </div>
      }
    </section>
  `,
  host: { class: 'block h-full min-h-0' }
})
export class AuditLogsComponent implements OnInit {
  private readonly auditLogService = inject(AuditLogService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<AuditLogItem[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(false);

  action = '';
  resourceType = '';
  status = '';
  from = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.fetch({}, true);
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (cursor) this.fetch({ cursor }, false);
  }

  actionLabel(action: string): string {
    return action.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('.', ' · ');
  }

  actionSummary(item: AuditLogItem): string {
    return (
      {
        'user.registered': 'Usuario registrado',
        'user.created': 'Usuario creado',
        'user.updated': 'Usuario actualizado',
        'user.deleted': 'Usuario eliminado',
        'user.permissions.updated': 'Permisos actualizados',
        'enterprise.created': 'Empresa creada',
        'enterprise.updated': 'Empresa actualizada',
        'enterprise.deleted': 'Empresa eliminada',
        'gestor.created': 'Gestor creado',
        'gestor.updated': 'Gestor actualizado',
        'gestor.deleted': 'Gestor eliminado',
        'product.created': 'Producto creado',
        'product.updated': 'Producto actualizado',
        'product.deleted': 'Producto eliminado',
        'category.created': 'Categoría creada',
        'category.updated': 'Categoría actualizada',
        'category.deleted': 'Categoría eliminada',
        'allergen.created': 'Alérgeno creado',
        'allergen.updated': 'Alérgeno actualizado',
        'allergen.deleted': 'Alérgeno eliminado',
        'supplier.created': 'Proveedor creado',
        'supplier.updated': 'Proveedor actualizado',
        'supplier.deleted': 'Proveedor eliminado',
        'invoice.uploaded': 'Factura subida',
        'invoice.batchUploaded': 'Lote de facturas subido',
        'invoice.created': 'Factura creada',
        'invoice.deleted': 'Factura eliminada',
        'machinery.created': 'Maquinaria creada',
        'machinery.updated': 'Maquinaria actualizada',
        'machinery.deleted': 'Maquinaria eliminada',
        'utensil.created': 'Utensilio creado',
        'utensil.updated': 'Utensilio actualizado',
        'utensil.deleted': 'Utensilio eliminado',
        'foodPreparationType.created': 'Tipo de preparación creado',
        'foodPreparationType.updated': 'Tipo de preparación actualizado',
        'foodPreparationType.deleted': 'Tipo de preparación eliminado',
        'foodPreparation.created': 'Preparación creada',
        'foodPreparation.updated': 'Preparación actualizada',
        'foodPreparation.deleted': 'Preparación eliminada',
        'foodPreparation.ingredient.added': 'Ingrediente añadido a la preparación',
        'foodPreparation.ingredient.removed': 'Ingrediente retirado de la preparación',
        'foodPreparation.subPreparation.added': 'Subpreparación añadida',
        'foodPreparation.subPreparation.removed': 'Subpreparación retirada',
        'foodPreparation.utensil.added': 'Utensilio añadido a la preparación',
        'foodPreparation.utensil.removed': 'Utensilio retirado de la preparación',
        'foodPreparation.machinery.added': 'Maquinaria añadida a la preparación',
        'foodPreparation.machinery.removed': 'Maquinaria retirada de la preparación',
        'iot.device.created': 'Dispositivo IoT creado',
        'iot.device.updated': 'Dispositivo IoT actualizado',
        'iot.device.deleted': 'Dispositivo IoT eliminado',
        'iot.alert.resolved': 'Alerta IoT resuelta',
        'subscription.checkout.created': 'Proceso de suscripción iniciado',
        'subscription.trial.created': 'Prueba de suscripción creada',
        'subscription.cancelled': 'Suscripción cancelada',
        'subscription.webhookProcessed': 'Suscripción sincronizada por Stripe',
        'agent.conversation.deleted': 'Conversación del agente eliminada'
      }[item.action] ?? this.actionLabel(item.action)
    );
  }

  changeDetails(item: AuditLogItem): string[] {
    return (item.changes ?? []).flatMap((change) => {
      const field = this.fieldLabel(change.field);
      if (change.type === 'COLLECTION') {
        return [
          ...(change.added?.length
            ? [`${field} · añadidos: ${change.added.map((value) => this.valueLabel(value)).join(', ')}`]
            : []),
          ...(change.removed?.length
            ? [`${field} · retirados: ${change.removed.map((value) => this.valueLabel(value)).join(', ')}`]
            : [])
        ];
      }
      if (change.type === 'VALUE') {
        return [`${field}: ${this.formatValue(change.before)} → ${this.formatValue(change.after)}`];
      }
      return [`Campo modificado: ${field}`];
    });
  }

  channelLabel(channel: AuditLogItem['channel']): string {
    return { HTTP: 'Aplicación', AGENT: 'Agente', AUTOMATION: 'Automatización', WEBHOOK: 'Webhook', CRON: 'Cron' }[
      channel
    ];
  }

  resourceTypeLabel(resourceType: string): string {
    return (
      {
        user: 'Usuario',
        enterprise: 'Empresa',
        gestor: 'Gestor',
        product: 'Producto',
        category: 'Categoría',
        allergen: 'Alérgeno',
        supplier: 'Proveedor',
        invoice: 'Factura',
        invoiceDocument: 'Documento de factura',
        machinery: 'Maquinaria',
        utensil: 'Utensilio',
        foodPreparationType: 'Tipo de preparación',
        foodPreparation: 'Preparación',
        iotDevice: 'Dispositivo IoT',
        iotAlert: 'Alerta IoT',
        subscription: 'Suscripción',
        agentConversation: 'Conversación del agente'
      }[resourceType] ?? resourceType
    );
  }

  private fieldLabel(field: string): string {
    return (
      {
        permissions: 'Permisos',
        unitPrice: 'Precio unitario',
        ingredients: 'Ingredientes',
        subPreparations: 'Subpreparaciones',
        utensilIds: 'Utensilios',
        utensils: 'Utensilios',
        machineryIds: 'Maquinaria',
        machinery: 'Maquinaria',
        steps: 'Pasos',
        status: 'Estado',
        name: 'Nombre',
        typeId: 'Tipo'
      }[field] ?? this.actionLabel(field)
    );
  }

  private valueLabel(value: string): string {
    return value === 'audit.read' ? 'Auditoría (audit.read)' : value;
  }

  private formatValue(value: string | number | boolean | null | undefined): string {
    return value === undefined || value === null || value === '' ? '—' : String(value);
  }

  private fetch(extra: AuditLogFilters, reset: boolean): void {
    this.loading.set(true);
    this.auditLogService
      .list({
        ...extra,
        action: this.action.trim() || undefined,
        resourceType: this.resourceType.trim() || undefined,
        status: this.status || undefined,
        from: this.from ? new Date(`${this.from}T00:00:00`).toISOString() : undefined
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ items, nextCursor }) => {
          this.items.update((current) => (reset ? items : [...current, ...items]));
          this.nextCursor.set(nextCursor);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.error('Error', 'No se pudo cargar el historial de auditoría.');
        }
      });
  }
}

import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@shared/components/icon/icon.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { NgxPermissionsModule } from 'ngx-permissions';
import { ToastService } from '@shared/services/toast.service';
import { AppPermission } from '@app/core/constants/permissions.enum';
import { Utensil, Machinery } from '../../interfaces/food-preparation.interfaces';
import { UtensilService } from '../../services/utensil.service';
import { MachineryService } from '../../services/machinery.service';

export type CatalogType = 'utensil' | 'machinery';

interface CatalogItem {
  id: string;
  name: string;
  enterpriseId?: string | null;
}

@Component({
  selector: 'app-catalog-content',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ButtonModule, InputTextModule, NgxPermissionsModule],
  templateUrl: './catalog-content.component.html'
})
export class CatalogContentComponent implements OnInit {
  private utensilService = inject(UtensilService);
  private machineryService = inject(MachineryService);
  private toastService = inject(ToastService);

  readonly P = AppPermission;

  @Input() type: CatalogType = 'utensil';
  @Input() searchTerm: string = '';

  // ─── Labels ─────────────────────────────────────────────────────────────────
  get typeLabel(): string {
    return this.type === 'utensil' ? 'utensilio' : 'maquinaria';
  }
  get typeLabelPlural(): string {
    return this.type === 'utensil' ? 'utensilios' : 'maquinaria';
  }
  get typeIcon(): string {
    return this.type === 'utensil' ? 'restaurant' : 'precision_manufacturing';
  }
  get writePermission(): string {
    return this.type === 'utensil' ? this.P.UtensilsWrite : this.P.MachineryWrite;
  }
  get deletePermission(): string {
    return this.type === 'utensil' ? this.P.UtensilsDelete : this.P.MachineryDelete;
  }

  items = signal<CatalogItem[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);

  newItemName = signal<string>('');

  editingId = signal<string | null>(null);
  editingName = signal<string>('');

  get filteredItems(): CatalogItem[] {
    const term = (this.searchTerm ?? '').toLowerCase().trim();
    if (!term) return this.items();
    return this.items().filter((item) => item.name.toLowerCase().includes(term));
  }

  ngOnInit() {
    this.loadItems();
  }

  loadItems() {
    this.isLoading.set(true);
    const obs = this.type === 'utensil' ? this.utensilService.getUtensils() : this.machineryService.getMachinery();

    obs.subscribe({
      next: (data) => {
        this.items.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toastService.error('Error', `No se pudieron cargar los ${this.typeLabelPlural}`);
      }
    });
  }

  onCreate() {
    const name = this.newItemName().trim();
    if (!name) return;

    this.isSaving.set(true);
    const obs =
      this.type === 'utensil' ? this.utensilService.createUtensil(name) : this.machineryService.createMachinery(name);

    obs.subscribe({
      next: (created) => {
        this.items.update((list) => [...list, created]);
        this.newItemName.set('');
        this.isSaving.set(false);
        this.toastService.success('Creado', `"${created.name}" añadido`);
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.error('Error', `No se pudo crear`);
      }
    });
  }

  startEdit(item: CatalogItem) {
    this.editingId.set(item.id);
    this.editingName.set(item.name);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editingName.set('');
  }

  saveEdit() {
    const id = this.editingId();
    const name = this.editingName().trim();
    if (!id || !name) return;

    this.isSaving.set(true);
    const obs =
      this.type === 'utensil'
        ? this.utensilService.updateUtensil(id, name)
        : this.machineryService.updateMachinery(id, name);

    obs.subscribe({
      next: (updated) => {
        this.items.update((list) => list.map((item) => (item.id === id ? { ...item, name: updated.name } : item)));
        this.cancelEdit();
        this.isSaving.set(false);
        this.toastService.success('Actualizado', `"${updated.name}" guardado`);
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.error('Error', `No se pudo actualizar`);
      }
    });
  }

  onDelete(item: CatalogItem) {
    this.isSaving.set(true);
    const obs =
      this.type === 'utensil'
        ? this.utensilService.deleteUtensil(item.id)
        : this.machineryService.deleteMachinery(item.id);

    obs.subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i.id !== item.id));
        this.isSaving.set(false);
        this.toastService.success('Eliminado', `"${item.name}" ha sido eliminado`);
      },
      error: () => {
        this.isSaving.set(false);
        this.toastService.error('Error', `No se pudo eliminar`);
      }
    });
  }
}

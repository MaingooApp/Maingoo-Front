import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  OnDestroy,
  ViewChild,
  TemplateRef,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AppPermission } from '../../core/constants/permissions.enum';
import { UserService } from './services/user.service';
import { ManagedUser, Permission, PermissionGroup } from './interfaces/user-management.interface';
import { ToastService } from '../../shared/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { DetailCardShellComponent } from '../../shared/components/detail-card-shell/detail-card-shell.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { LayoutService } from '../../layout/service/layout.service';
import { SectionHeaderService } from '../../layout/service/section-header.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TooltipModule,
    TagModule,
    InputTextModule,
    CheckboxModule,
    NgxPermissionsModule,
    IconComponent,
    DetailCardShellComponent,
    EmptyStateComponent,
    SkeletonComponent,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly P = AppPermission;
  @ViewChild('headerTpl') headerTpl!: TemplateRef<any>;

  private userService = inject(UserService);
  private toastService = inject(ToastService);
  private layoutService = inject(LayoutService);
  private headerService = inject(SectionHeaderService);
  private confirmationService = inject(ConfirmationService);

  // State
  loading = signal(true);
  saving = signal(false);
  users = signal<ManagedUser[]>([]);
  allPermissions = signal<Permission[]>([]);
  selectedUser = signal<ManagedUser | null>(null);
  searchTerm = signal('');

  showCreateForm = signal(false);
  creating = signal(false);
  newUserName = signal('');
  newUserEmail = signal('');
  newUserPassword = signal('');

  // Permission selection state (set of permission IDs)
  selectedPermissionIds = signal<Set<string>>(new Set());

  // Grouped permissions for display
  permissionGroups = computed<PermissionGroup[]>(() => {
    const perms = this.allPermissions();
    const groups = new Map<string, { label: string; permissions: Permission[] }>();

    const moduleLabels: Record<string, string> = {
      users: 'Usuarios',
      permissions: 'Permisos',
      invoices: 'Facturas',
      suppliers: 'Proveedores',
      enterprises: 'Empresa',
      documents: 'Documentos',
      products: 'Productos'
    };

    for (const p of perms) {
      const parts = p.name.split('.');
      const module = parts[0] || 'other';
      if (!groups.has(module)) {
        groups.set(module, {
          label: moduleLabels[module] || module,
          permissions: []
        });
      }
      groups.get(module)!.permissions.push(p);
    }

    return Array.from(groups.entries()).map(([module, data]) => ({
      module,
      label: data.label,
      permissions: data.permissions
    }));
  });

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.users();
    return this.users().filter((u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  });

  // Dirty check
  hasChanges = computed(() => {
    const user = this.selectedUser();
    if (!user) return false;
    // Map current user permission names to IDs
    const perms = this.allPermissions();
    const currentIds = new Set(
      user.permissions.map((name) => perms.find((p) => p.name === name)?.id).filter((id): id is string => !!id)
    );
    const selected = this.selectedPermissionIds();
    if (currentIds.size !== selected.size) return true;
    for (const id of currentIds) {
      if (!selected.has(id)) return true;
    }
    return false;
  });

  ngOnInit(): void {
    this.layoutService.setPageTitle('Gestión de usuarios');
    this.loadData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.headerService.setContent(this.headerTpl);
    });
  }

  ngOnDestroy(): void {
    this.layoutService.setPageTitle('');
    this.headerService.reset();
  }

  private loadData(): void {
    this.loading.set(true);
    forkJoin({
      users: this.userService.getUsers(),
      permissions: this.userService.getAllPermissions()
    }).subscribe({
      next: ({ users, permissions }) => {
        this.users.set(users);
        this.allPermissions.set(permissions);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading data:', err);
        this.toastService.error('Error', 'No se pudieron cargar los datos.');
        this.loading.set(false);
      }
    });
  }

  selectUser(user: ManagedUser): void {
    if (this.selectedUser()?.id === user.id) {
      this.selectedUser.set(null);
      return;
    }
    this.showCreateForm.set(false);
    this.selectedUser.set(user);
    // Map permission names to IDs using the allPermissions list
    const perms = this.allPermissions();
    const ids = new Set(
      user.permissions.map((name) => perms.find((p) => p.name === name)?.id).filter((id): id is string => !!id)
    );
    this.selectedPermissionIds.set(ids);
  }

  closeDetail(): void {
    this.selectedUser.set(null);
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissionIds().has(permissionId);
  }

  togglePermission(permissionId: string): void {
    const current = new Set(this.selectedPermissionIds());
    if (current.has(permissionId)) {
      current.delete(permissionId);
    } else {
      current.add(permissionId);
    }
    this.selectedPermissionIds.set(current);
  }

  savePermissions(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.saving.set(true);
    const ids = Array.from(this.selectedPermissionIds());

    this.userService.updateUserPermissions(user.id, ids).subscribe({
      next: (updatedUser) => {
        // Update the local user list
        this.users.update((users) => users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        this.selectedUser.set(updatedUser);
        // Re-map permission names to IDs
        const perms = this.allPermissions();
        const ids = new Set(
          updatedUser.permissions
            .map((name: string) => perms.find((p) => p.name === name)?.id)
            .filter((id: string | undefined): id is string => !!id)
        );
        this.selectedPermissionIds.set(ids);
        this.saving.set(false);
        this.toastService.success(
          'Permisos actualizados',
          `Los permisos de ${updatedUser.name} se han guardado correctamente.`
        );
      },
      error: (err) => {
        console.error('Error saving permissions:', err);
        this.saving.set(false);
        this.toastService.error('Error', 'No se pudieron guardar los permisos.');
      }
    });
  }

  /** Human-readable permission label */
  getPermissionLabel(name: string): string {
    const labels: Record<string, string> = {
      'users.read': 'Ver usuarios',
      'users.write': 'Editar usuarios',
      'users.delete': 'Eliminar usuarios',
      'permissions.assign': 'Asignar permisos',
      'invoices.read': 'Ver facturas',
      'invoices.write': 'Crear/editar facturas',
      'invoices.delete': 'Eliminar facturas',
      'suppliers.read': 'Ver proveedores',
      'suppliers.write': 'Editar proveedores',
      'suppliers.delete': 'Eliminar proveedores',
      'enterprises.read': 'Ver empresa',
      'enterprises.write': 'Editar empresa',
      'enterprises.delete': 'Eliminar empresa',
      'documents.read': 'Ver documentos',
      'documents.write': 'Subir documentos',
      'products.read': 'Ver productos',
      'products.write': 'Editar productos',
      'products.delete': 'Eliminar productos'
    };
    return labels[name] || name;
  }

  getPermissionIcon(module: string): string {
    const icons: Record<string, string> = {
      users: 'group',
      permissions: 'admin_panel_settings',
      invoices: 'receipt_long',
      suppliers: 'local_shipping',
      enterprises: 'business',
      documents: 'description',
      products: 'warehouse'
    };
    return icons[module] || 'settings';
  }

  filterUsers(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  // ─── CREATE USER ───

  openCreateForm(): void {
    this.selectedUser.set(null);
    this.showCreateForm.set(true);
    this.newUserName.set('');
    this.newUserEmail.set('');
    this.newUserPassword.set('');
  }

  closeCreateForm(): void {
    this.showCreateForm.set(false);
  }

  get isCreateFormValid(): boolean {
    return (
      this.newUserName().trim().length > 0 &&
      this.newUserEmail().trim().length > 0 &&
      this.newUserPassword().trim().length >= 8
    );
  }

  createUser(): void {
    if (!this.isCreateFormValid) return;

    this.creating.set(true);
    this.userService
      .createUser({
        name: this.newUserName().trim(),
        email: this.newUserEmail().trim(),
        password: this.newUserPassword().trim()
      })
      .subscribe({
        next: (user) => {
          this.users.update((users) => [user, ...users]);
          this.creating.set(false);
          this.closeCreateForm();
          this.toastService.success('Usuario creado', `${user.name} ha sido creado correctamente.`);
        },
        error: (err) => {
          console.error('Error creating user:', err);
          this.creating.set(false);
          const msg =
            err?.error?.message === 'Email already registered'
              ? 'Este email ya está registrado.'
              : 'No se pudo crear el usuario.';
          this.toastService.error('Error', msg);
        }
      });
  }

  // ─── DELETE USER ───

  confirmDeleteUser(user: ManagedUser): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar a ${user.name}? Esta acción no se puede deshacer.`,
      header: 'Eliminar usuario',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteUser(user)
    });
  }

  private deleteUser(user: ManagedUser): void {
    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update((users) => users.filter((u) => u.id !== user.id));
        if (this.selectedUser()?.id === user.id) {
          this.selectedUser.set(null);
        }
        this.toastService.success('Usuario eliminado', `${user.name} ha sido eliminado.`);
      },
      error: (err) => {
        console.error('Error deleting user:', err);
        this.toastService.error('Error', 'No se pudo eliminar el usuario.');
      }
    });
  }
}

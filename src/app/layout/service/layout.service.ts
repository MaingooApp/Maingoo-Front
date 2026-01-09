import { Injectable, effect, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

export interface layoutConfig {
  preset?: string;
  primary?: string;
  surface?: string | undefined | null;
  darkTheme?: boolean;
  menuMode?: string;
}

interface LayoutState {
  staticMenuDesktopInactive?: boolean;
  overlayMenuActive?: boolean;
  configSidebarVisible?: boolean;
  staticMenuMobileActive?: boolean;
  menuHoverActive?: boolean;
  notificationPanelActive?: boolean;
  notificationPanelAnimating?: boolean;
  profilePanelActive?: boolean;
  profilePanelAnimating?: boolean;
}

interface MenuChangeEvent {
  key: string;
  routeEvent?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  _config: layoutConfig = {
    preset: 'Aura',
    primary: 'maingoo',
    surface: null,
    darkTheme: false,
    menuMode: 'static'
  };

  _state: LayoutState = {
    staticMenuDesktopInactive: false,
    overlayMenuActive: false,
    configSidebarVisible: false,
    staticMenuMobileActive: false,
    menuHoverActive: false,
    notificationPanelActive: false,
    notificationPanelAnimating: false,
    profilePanelActive: false,
    profilePanelAnimating: false
  };

  layoutConfig = signal<layoutConfig>(this._config);

  layoutState = signal<LayoutState>(this._state);

  private configUpdate = new Subject<layoutConfig>();

  private overlayOpen = new Subject<any>();

  private menuSource = new Subject<MenuChangeEvent>();

  private resetSource = new Subject();

  menuSource$ = this.menuSource.asObservable();

  resetSource$ = this.resetSource.asObservable();

  configUpdate$ = this.configUpdate.asObservable();

  overlayOpen$ = this.overlayOpen.asObservable();

  theme = computed(() => (this.layoutConfig()?.darkTheme ? 'light' : 'dark'));

  isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().staticMenuMobileActive);

  isDarkTheme = computed(() => this.layoutConfig().darkTheme);

  getPrimary = computed(() => this.layoutConfig().primary);

  getSurface = computed(() => this.layoutConfig().surface);

  isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

  transitionComplete = signal<boolean>(false);

  // Signal para el título de la página (para mostrar en mobile topbar)
  pageTitle = signal<string>('');

  private initialized = false;

  constructor() {
    effect(() => {
      const config = this.layoutConfig();
      if (config) {
        this.onConfigUpdate();
      }
    });

    effect(() => {
      const config = this.layoutConfig();

      if (!this.initialized || !config) {
        this.initialized = true;
        return;
      }

      this.handleDarkModeTransition(config);
    });

    effect(() => {
      const state = this.pageTitle();
      // Side effect if needed
    });
  }

  setPageTitle(title: string) {
    this.pageTitle.set(title);
  }

  private handleDarkModeTransition(config: layoutConfig): void {
    if ((document as any).startViewTransition) {
      this.startViewTransition(config);
    } else {
      this.toggleDarkMode(config);
      this.onTransitionEnd();
    }
  }

  private startViewTransition(config: layoutConfig): void {
    const transition = (document as any).startViewTransition(() => {
      this.toggleDarkMode(config);
    });

    transition.ready
      .then(() => {
        this.onTransitionEnd();
      })
      .catch(() => {});
  }

  toggleDarkMode(config?: layoutConfig): void {
    const _config = config || this.layoutConfig();
    if (_config.darkTheme) {
      document.documentElement.classList.add('app-dark');
    } else {
      document.documentElement.classList.remove('app-dark');
    }
  }

  private onTransitionEnd() {
    this.transitionComplete.set(true);
    setTimeout(() => {
      this.transitionComplete.set(false);
    });
  }

  onMenuToggle() {
    if (this.isOverlay()) {
      this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));

      if (this.layoutState().overlayMenuActive) {
        this.overlayOpen.next(null);
      }
    }

    if (this.isDesktop()) {
      this.layoutState.update((prev) => ({
        ...prev,
        staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive
      }));
    } else {
      this.layoutState.update((prev) => ({
        ...prev,
        staticMenuMobileActive: !this.layoutState().staticMenuMobileActive
      }));

      if (this.layoutState().staticMenuMobileActive) {
        this.overlayOpen.next(null);
      }
    }
  }

  toggleNotificationPanel() {
    const isCurrentlyActive = this.layoutState().notificationPanelActive;

    if (isCurrentlyActive) {
      // Si se está cerrando, marcar como animando primero
      this.layoutState.update((prev) => ({
        ...prev,
        notificationPanelAnimating: true,
        notificationPanelActive: false
      }));

      // Esperar a que termine la animación (400ms) antes de permitir cambios en el sidebar
      setTimeout(() => {
        this.layoutState.update((prev) => ({
          ...prev,
          notificationPanelAnimating: false
        }));
      }, 400);
    } else {
      // Si se está abriendo, cambiar inmediatamente
      this.layoutState.update((prev) => ({
        ...prev,
        notificationPanelActive: true,
        notificationPanelAnimating: false
      }));
    }
  }

  isNotificationPanelActive() {
    return this.layoutState().notificationPanelActive;
  }

  isNotificationPanelActiveOrAnimating() {
    return this.layoutState().notificationPanelActive || this.layoutState().notificationPanelAnimating;
  }

  toggleProfilePanel() {
    const isCurrentlyActive = this.layoutState().profilePanelActive;

    if (isCurrentlyActive) {
      this.layoutState.update((prev) => ({
        ...prev,
        profilePanelAnimating: true,
        profilePanelActive: false
      }));

      setTimeout(() => {
        this.layoutState.update((prev) => ({
          ...prev,
          profilePanelAnimating: false
        }));
      }, 400);
    } else {
      this.layoutState.update((prev) => ({
        ...prev,
        profilePanelActive: true,
        profilePanelAnimating: false
      }));
    }
  }

  isProfilePanelActive() {
    return this.layoutState().profilePanelActive;
  }

  isProfilePanelActiveOrAnimating() {
    return this.layoutState().profilePanelActive || this.layoutState().profilePanelAnimating;
  }

  isDesktop() {
    return window.innerWidth > 991;
  }

  isMobile() {
    return !this.isDesktop();
  }

  onConfigUpdate() {
    this._config = { ...this.layoutConfig() };
    this.configUpdate.next(this.layoutConfig());
  }

  onMenuStateChange(event: MenuChangeEvent) {
    this.menuSource.next(event);
  }

  reset() {
    this.resetSource.next(true);
  }
}

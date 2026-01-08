import { Injectable, signal } from '@angular/core';

export type SheetState = 'minimized' | 'compact' | 'expanded';

@Injectable({
  providedIn: 'root'
})
export class BottomSheetService {
  // Estado actual del Bottom Sheet
  private state = signal<SheetState>('compact');

  // Getter para el estado actual
  currentState = this.state.asReadonly();

  // Método para cambiar el estado
  setState(newState: SheetState) {
    const oldState = this.state();

    // Detectar si estamos abriendo el chat (de cerrado a abierto)
    const isOpening = (oldState === 'compact' || oldState === 'minimized') && newState === 'expanded';

    // Detectar si estamos cerrando el chat por UI (de abierto a cerrado)
    const isClosing = oldState === 'expanded' && (newState === 'compact' || newState === 'minimized');

    // Manejo del historial del navegador
    try {
      if (isOpening) {
        // Al abrir, añadimos un estado al historial para que el botón "Atrás" funcione
        history.pushState({ chatOpen: true }, '', location.href);
      } else if (isClosing) {
        // Al cerrar por UI, si tenemos nuestro estado en el historial, volvemos atrás
        if (history.state && history.state.chatOpen) {
          history.back();
        }
      }
    } catch (e) {
      console.warn('History API not available or failed', e);
    }

    this.state.set(newState);
  }

  // Método para toggle entre estados
  toggleState() {
    const current = this.state();
    if (current === 'minimized') {
      this.setState('compact');
    } else if (current === 'compact') {
      this.setState('expanded');
    } else {
      this.setState('minimized');
    }
  }

  // Colapsar al estado compacto
  collapse() {
    this.setState('compact');
  }

  // Expandir al máximo
  expand() {
    this.setState('expanded');
  }

  // Verificar si está minimizado
  isMinimized(): boolean {
    return this.state() === 'minimized';
  }

  // Verificar si está en modo compacto
  isCompact(): boolean {
    return this.state() === 'compact';
  }

  // Verificar si está expandido
  isExpanded(): boolean {
    return this.state() === 'expanded';
  }
}

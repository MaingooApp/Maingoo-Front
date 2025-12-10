import { Injectable, signal } from '@angular/core';

export type SheetState = 'compact' | 'medium' | 'expanded';

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
    this.state.set(newState);
  }

  // Método para toggle entre estados
  toggleState() {
    const current = this.state();
    if (current === 'compact') {
      this.setState('medium');
    } else if (current === 'medium') {
      this.setState('expanded');
    } else {
      this.setState('compact');
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

  // Verificar si está en modo compacto
  isCompact(): boolean {
    return this.state() === 'compact';
  }

  // Verificar si está expandido
  isExpanded(): boolean {
    return this.state() === 'expanded';
  }
}

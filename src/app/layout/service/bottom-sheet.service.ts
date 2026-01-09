import { Injectable, signal } from '@angular/core';

export type SheetState = 'closed' | 'chat-open' | 'menu-open';

@Injectable({
  providedIn: 'root'
})
export class BottomSheetService {
  // Estado actual del Bottom Sheet/Modals
  private state = signal<SheetState>('closed');

  // Getter para el estado actual
  currentState = this.state.asReadonly();

  // Método para cambiar el estado
  setState(newState: SheetState) {
    const oldState = this.state();

    // Detectar si estamos abriendo un modal
    const isOpening = oldState === 'closed' && (newState === 'chat-open' || newState === 'menu-open');

    // Detectar si estamos cerrando un modal
    const isClosing = (oldState === 'chat-open' || oldState === 'menu-open') && newState === 'closed';

    // Manejo del historial del navegador
    try {
      if (isOpening) {
        // Al abrir, añadimos un estado al historial para que el botón "Atrás" funcione
        const modalType = newState === 'chat-open' ? 'chat' : 'menu';
        history.pushState({ modalOpen: true, modalType }, '', location.href);
      } else if (isClosing) {
        // Al cerrar por UI, si tenemos nuestro estado en el historial, volvemos atrás
        if (history.state && history.state.modalOpen) {
          history.back();
        }
      }
    } catch (e) {
      console.warn('History API not available or failed', e);
    }

    this.state.set(newState);
  }

  // Abrir el chat
  openChat() {
    this.setState('chat-open');
  }

  // Abrir el menú
  openMenu() {
    this.setState('menu-open');
  }

  // Cerrar el chat
  closeChat() {
    if (this.state() === 'chat-open') {
      this.setState('closed');
    }
  }

  // Cerrar el menú
  closeMenu() {
    if (this.state() === 'menu-open') {
      this.setState('closed');
    }
  }

  // Cerrar cualquier cosa que esté abierta
  closeAll() {
    this.setState('closed');
  }

  // Verificar si el chat está abierto
  isChatOpen(): boolean {
    return this.state() === 'chat-open';
  }

  // Verificar si el menú está abierto
  isMenuOpen(): boolean {
    return this.state() === 'menu-open';
  }

  // Verificar si algo está abierto
  isAnyOpen(): boolean {
    return this.state() !== 'closed';
  }
}

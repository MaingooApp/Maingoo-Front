import { Component, ElementRef, HostListener, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BottomSheetService, SheetState } from '../../../layout/service/bottom-sheet.service';

@Component({
  selector: 'app-mobile-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mobile-bottom-sheet.component.html',
  styleUrls: ['./mobile-bottom-sheet.component.scss']
})
export class MobileBottomSheetComponent {
  @ViewChild('sheetContainer') sheetContainer!: ElementRef<HTMLDivElement>;

  private startY = 0;
  private currentY = 0;
  private isDragging = false;
  
  // Snap points en porcentajes de altura de viewport
  private readonly snapPoints = {
    compact: 20,
    medium: 50,
    expanded: 90
  };

  constructor(public bottomSheetService: BottomSheetService) {}

  get sheetHeight(): string {
    const state = this.bottomSheetService.currentState();
    return `${this.snapPoints[state as keyof typeof this.snapPoints]}vh`;
  }

  get isDarkOverlay(): boolean {
    return this.bottomSheetService.currentState() === 'expanded';
  }

  onTouchStart(event: TouchEvent) {
    this.startY = event.touches[0].clientY;
    this.isDragging = true;
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;
    
    this.currentY = event.touches[0].clientY;
    const deltaY = this.currentY - this.startY;
    
    // Solo permitir arrastrar hacia abajo si está en estados superiores
    const currentState = this.bottomSheetService.currentState();
    if (deltaY > 0 || currentState !== 'compact') {
      // Aplicar transformación temporal mientras se arrastra
      if (this.sheetContainer) {
        const sheet = this.sheetContainer.nativeElement;
        sheet.style.transition = 'none';
        sheet.style.transform = `translateY(${Math.max(0, deltaY)}px)`;
      }
    }
  }

  onTouchEnd(event: TouchEvent) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    const deltaY = this.currentY - this.startY;
    const threshold = 50; // pixels para cambiar de estado
    
    // Reset styles
    if (this.sheetContainer) {
      const sheet = this.sheetContainer.nativeElement;
      sheet.style.transition = '';
      sheet.style.transform = '';
    }
    
    const currentState = this.bottomSheetService.currentState();
    
    // Determinar nuevo estado basado en la dirección y distancia del arrastre
    if (Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        // Arrastrando hacia abajo - colapsar
        this.collapseState(currentState);
      } else {
        // Arrastrando hacia arriba - expandir
        this.expandState(currentState);
      }
    }
    
    this.startY = 0;
    this.currentY = 0;
  }

  private collapseState(current: SheetState) {
    if (current === 'expanded') {
      this.bottomSheetService.setState('medium');
    } else if (current === 'medium') {
      this.bottomSheetService.setState('compact');
    }
  }

  private expandState(current: SheetState) {
    if (current === 'compact') {
      this.bottomSheetService.setState('medium');
    } else if (current === 'medium') {
      this.bottomSheetService.setState('expanded');
    }
  }

  onHeaderClick() {
    // Click en el header para expandir/colapsar rápidamente
    const current = this.bottomSheetService.currentState();
    if (current === 'compact') {
      this.bottomSheetService.setState('medium');
    } else if (current === 'medium') {
      this.bottomSheetService.setState('expanded');
    } else {
      this.bottomSheetService.setState('compact');
    }
  }

  sendMessage(input: HTMLInputElement) {
    const message = input.value.trim();
    if (message) {
      // TODO: Integrar con servicio de chat
      console.log('Mensaje enviado:', message);
      input.value = '';
    }
  }

  onBackdropClick() {
    // Si está expandido, colapsar a medio al hacer click en el backdrop
    if (this.bottomSheetService.currentState() === 'expanded') {
      this.bottomSheetService.setState('medium');
    }
  }
}

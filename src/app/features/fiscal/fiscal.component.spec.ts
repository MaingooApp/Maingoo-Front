import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';

import { DocGeneratorComponent } from './fiscal.component';

describe('DocGeneratorComponent', () => {
  let component: DocGeneratorComponent;
  let fixture: ComponentFixture<DocGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocGeneratorComponent],
      providers: [ConfirmationService, DialogService, MessageService, provideHttpClient(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DocGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

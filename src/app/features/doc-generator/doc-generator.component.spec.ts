import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocGeneratorComponent } from './doc-generator.component';

describe('DocGeneratorComponent', () => {
  let component: DocGeneratorComponent;
  let fixture: ComponentFixture<DocGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocGeneratorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

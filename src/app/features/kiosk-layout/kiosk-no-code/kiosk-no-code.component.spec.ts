import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KioskNoCodeComponent } from './kiosk-no-code.component';

describe('KioskNoCodeComponent', () => {
  let component: KioskNoCodeComponent;
  let fixture: ComponentFixture<KioskNoCodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KioskNoCodeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(KioskNoCodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

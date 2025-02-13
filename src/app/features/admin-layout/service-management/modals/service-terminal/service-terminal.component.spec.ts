import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceTerminalComponent } from './service-terminal.component';

describe('ServiceKioskComponent', () => {
  let component: ServiceTerminalComponent;
  let fixture: ComponentFixture<ServiceTerminalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceTerminalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ServiceTerminalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

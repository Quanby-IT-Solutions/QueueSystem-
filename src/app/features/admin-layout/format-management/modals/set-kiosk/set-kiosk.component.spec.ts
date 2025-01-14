import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetKioskComponent } from './set-kiosk.component';

describe('SetKioskComponent', () => {
  let component: SetKioskComponent;
  let fixture: ComponentFixture<SetKioskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetKioskComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SetKioskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

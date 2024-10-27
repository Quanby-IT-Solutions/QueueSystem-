import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DivisionManagementComponent } from './division-management.component';

describe('DivisionManagementComponent', () => {
  let component: DivisionManagementComponent;
  let fixture: ComponentFixture<DivisionManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DivisionManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DivisionManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

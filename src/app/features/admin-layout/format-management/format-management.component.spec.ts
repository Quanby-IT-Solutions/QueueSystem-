import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormatManagementComponent } from './format-management.component';

describe('FormatManagementComponent', () => {
  let component: FormatManagementComponent;
  let fixture: ComponentFixture<FormatManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormatManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FormatManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

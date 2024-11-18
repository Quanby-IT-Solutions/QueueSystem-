import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SnackbarItemComponent } from './snackbar-item.component';

describe('SnackbarItemComponent', () => {
  let component: SnackbarItemComponent;
  let fixture: ComponentFixture<SnackbarItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnackbarItemComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SnackbarItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

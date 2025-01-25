import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetNextStepComponent } from './set-next-step.component';

describe('SetNextStepComponent', () => {
  let component: SetNextStepComponent;
  let fixture: ComponentFixture<SetNextStepComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetNextStepComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SetNextStepComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

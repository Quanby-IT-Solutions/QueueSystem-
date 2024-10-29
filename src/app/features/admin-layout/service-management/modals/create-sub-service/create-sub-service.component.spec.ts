import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSubServiceComponent } from './create-sub-service.component';

describe('CreateSubServiceComponent', () => {
  let component: CreateSubServiceComponent;
  let fixture: ComponentFixture<CreateSubServiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSubServiceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateSubServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

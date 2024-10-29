import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateFormatComponent } from './create-format.component';

describe('CreateFormatComponent', () => {
  let component: CreateFormatComponent;
  let fixture: ComponentFixture<CreateFormatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateFormatComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateFormatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

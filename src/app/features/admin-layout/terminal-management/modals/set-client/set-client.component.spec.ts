import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetClientComponent } from './set-client.component';

describe('SetClientComponent', () => {
  let component: SetClientComponent;
  let fixture: ComponentFixture<SetClientComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetClientComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SetClientComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

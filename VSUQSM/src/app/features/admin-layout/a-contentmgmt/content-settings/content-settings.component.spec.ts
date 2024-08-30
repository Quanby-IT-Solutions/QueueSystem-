import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentSettingsComponent } from './content-settings.component';

describe('ContentSettingsComponent', () => {
  let component: ContentSettingsComponent;
  let fixture: ComponentFixture<ContentSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentSettingsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ContentSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

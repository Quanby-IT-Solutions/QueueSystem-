import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentModComponent } from './content-mod/content-mod.component';
import { ContentSettingsComponent } from './content-settings/content-settings.component';

@Component({
  selector: 'app-a-contentmgmt',
  standalone: true,
  imports: [ContentModComponent, CommonModule,ContentSettingsComponent],
  templateUrl: './a-contentmgmt.component.html',
  styleUrls: ['./a-contentmgmt.component.css'] // Changed styleUrl to styleUrls (array)
})
export class AContentmgmtComponent {
  videoEnabled: boolean = false;
  announcementEnabled: boolean = true;
  timeAndDateEnabled: boolean = true;
  weatherEnabled: boolean = true;
  currencyConverterEnabled: boolean = true;

  toggleFeature(feature: string): void {
    switch (feature) {
      case 'video':
        this.videoEnabled = !this.videoEnabled;
        break;
      case 'announcement':
        this.announcementEnabled = !this.announcementEnabled;
        break;
      case 'timeAndDate':
        this.timeAndDateEnabled = !this.timeAndDateEnabled;
        break;
      case 'weather':
        this.weatherEnabled = !this.weatherEnabled;
        break;
      case 'currencyConverter':
        this.currencyConverterEnabled = !this.currencyConverterEnabled;
        break;
    }
  }

  uploadPicture(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      // Handle file upload logic here
      console.log('File uploaded:', input.files[0].name);
    }
  }

  uploadVideo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      // Handle video upload logic here
      console.log('Video uploaded:', input.files[0].name);
    }
  }

  selectBackground(event: Event): void {
    const select = event.target as HTMLSelectElement;
    console.log('Background selected:', select.value);
  }

  addAnnouncement(): void {
    console.log('Add announcement clicked');
  }

  selectTimezone(event: Event): void {
    const select = event.target as HTMLSelectElement;
    console.log('Timezone selected:', select.value);
  }

  selectLocation(event: Event): void {
    const select = event.target as HTMLSelectElement;
    console.log('Location selected:', select.value);
  }

  switchCurrency(): void {
    console.log('Currency switched');
  }
}


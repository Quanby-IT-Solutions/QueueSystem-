import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentModComponent } from './content-mod/content-mod.component';
import { ContentSettingsComponent } from './content-settings/content-settings.component';

@Component({
  selector: 'app-a-contentmgmt',
  standalone: true,
  imports: [ContentModComponent, CommonModule, ContentSettingsComponent],
  templateUrl: './a-contentmgmt.component.html',
  styleUrls: ['./a-contentmgmt.component.css'] // Corrected styleUrls to an array
})
export class AContentmgmtComponent {
  showModal: boolean = false;
  announcementText: string = ''; // State to store announcement text
  notesText: string = ''; // State to store notes text
  selectedFiles: { [key: string]: File | null } = {
    Logo: null,
    'Background Photo': null,
    Video: null,
  }; // State to store uploaded files

  // Event handler for file upload (e.g., Logo, Background Photo, Video)
  onFileUpload(event: Event, type: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFiles[type] = input.files[0];
      console.log(`${type} uploaded:`, input.files[0].name);
      // Additional logic to handle file uploads (e.g., save to a server or update state) can be added here
    }
  }

  // Method to add a widget dynamically
  addWidget(widgetType: string): void {
    console.log(`${widgetType} added`);
    // Additional logic to handle widget addition can be added here
  }

  // Method to handle changes in announcement text
  onAnnouncementChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.announcementText = textarea.value;
    console.log('Announcement Text:', this.announcementText);
    // Additional logic to handle announcement text change can be added here
  }

  // Method to handle changes in notes text
  onNotesChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.notesText = textarea.value;
    console.log('Notes Text:', this.notesText);
    // Additional logic to handle notes text change can be added here
  }

  // Method to close the preview modal
  closePreviewModal(): void {
    this.showModal = false;
  }

  // Method to open the preview modal
  openPreviewModal(): void {
    this.showModal = true;
  }

  // Method to save changes in Content Settings
  saveChanges(): void {
    console.log('Saving changes...');
    console.log('Announcement Text:', this.announcementText);
    console.log('Notes Text:', this.notesText);
    console.log('Selected Files:', this.selectedFiles);
    // Implement save logic, such as saving data to a backend or updating state

    alert('Changes have been saved successfully!'); // Feedback to user
  }
}

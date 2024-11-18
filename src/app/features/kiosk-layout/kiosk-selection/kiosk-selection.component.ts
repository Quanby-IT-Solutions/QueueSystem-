import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QueueService } from '../../../services/queue.service';
import { KioskService } from '../../../services/kiosk.service';
import { config } from '../../../../environment/config';

@Component({
  selector: 'app-kiosk-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kiosk-selection.component.html',
  styleUrls: ['./kiosk-selection.component.css']
})
export class KioskSelectionComponent {

  // Stores the entered code for kiosk access
  enteredCode: string = '';
  logging_in:boolean = false;

  config = config

  // Inject the Router and UserService in the constructor for navigation and user validation
  constructor(private router: Router, private queueService: QueueService, private kioskService:KioskService) {}

  // Handles form submission to validate the kiosk access code
  async onSubmit() {
    // Retrieve user details by matching the entered code with a password in UserService
    this.logging_in = true;
    try{
      const kiosk = await this.kioskService.kioskLogin(this.enteredCode);
      this.navigateToForms(kiosk.division);
    }catch(e:any){
      const error = e.message;
      alert(error);
    }
    

  }

  // Navigates to the kiosk forms page, passing the department as a query parameter
  navigateToForms(department: string) {
    this.router.navigate(['/kiosk/forms'], { queryParams: { department: department } });
  }
}

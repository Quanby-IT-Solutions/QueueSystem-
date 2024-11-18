import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UswagonCoreService } from 'uswagon-core';

import { SnackbarItemComponent } from './snackbar-item/snackbar-item.component';


@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule, SnackbarItemComponent],
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.css'
})
export class SnackbarComponent  {

  constructor(private API:UswagonCoreService){}

  getFeedbacks(){
   return this.API.getFeedbacks();
  }

 

}

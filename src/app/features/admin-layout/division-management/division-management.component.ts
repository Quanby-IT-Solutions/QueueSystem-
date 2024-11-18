import { Component } from '@angular/core';
import { Division } from './types/division.types';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { DivisionService } from '../../../services/division.service';
import { CreateDivisionComponent } from './modals/create-division/create-division.component';
import { ConfirmationComponent } from '../../../shared/modals/confirmation/confirmation.component';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-division-management',
  standalone: true,
  imports: [CreateDivisionComponent,ConfirmationComponent,LottieAnimationComponent,CommonModule],
  templateUrl: './division-management.component.html',
  styleUrl: './division-management.component.css'
})
export class DivisionManagementComponent {
 

  divisions: Division[]=[];
  isSuperAdmin:boolean = this.auth.accountLoggedIn() == 'superadmin';

  selectedDivision?:Division;

  modalType?:'maintenance'|'delete';

  openDivisionModal:boolean = false;

  // Injecting ChangeDetectorRef to trigger manual change detection
  constructor(
    private auth:UswagonAuthService,private API:UswagonCoreService,
    private divisionService:DivisionService) {}
  ngOnInit(): void {
    this.loadContent();
  }

  async loadContent(){
    this.API.setLoading(true);

    this.divisions = (await this.divisionService.getDivisions());
    this.API.setLoading(false);    
  }


  statusMap:any = {
    'available' : 'bg-green-500',
    'maintenance' : 'bg-red-500',
    'online' : 'bg-orange-500',
  }

  capitalizeFirstLetters(input: string): string {
    return input
      .split(' ') // Split the string into words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
      .join(' '); // Join the words back into a single string
  }
  

  addDivision(){
    this.selectedDivision = undefined;
    this.openDivisionModal = true;
  }

  updateDivision(division:Division){
    this.selectedDivision = division;
    this.openDivisionModal = true;
  }

  async deleteDivision(item:Division){
    
    this.API.setLoading(true);
    try{
      await this.divisionService.deleteDivision(item.id!);
      
      await this.closeDialog(true);
      this.API.sendFeedback('success', 'Branch has been deleted!',5000);
    }catch(e:any){
      this.API.sendFeedback('success', e.message,5000);
    }
  }

  selectDivision(item:Division){
    this.selectedDivision = item;
  }

  

  openDialog(type:'maintenance'|'delete'){
    this.modalType = type;
  }
  async closeDialog(shouldRefresh:boolean){
    const fromService = this.openDivisionModal;
    this.openDivisionModal = false;
    this.modalType = undefined;
    if(shouldRefresh){
      this.API.setLoading(true);
      this.divisions = (await this.divisionService.getDivisions());
      this.API.setLoading(false);
    }
    if(fromService && shouldRefresh){
      if(this.selectedDivision){
        this.API.sendFeedback('success', 'Branch has been updated!',5000);
      }else{
        this.API.sendFeedback('success', 'New branch has been added!',5000);
      }
    }
  }
}

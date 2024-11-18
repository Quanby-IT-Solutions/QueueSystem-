import { Component } from '@angular/core';
import { Division, Format } from './types/format.types';
import { UswagonAuthService } from 'uswagon-auth';

import { FormatService } from '../../../services/format.service';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { CommonModule } from '@angular/common';
import { ConfirmationComponent } from '../../../shared/modals/confirmation/confirmation.component';
import { CreateFormatComponent } from './modals/create-format/create-format.component';
import { UswagonCoreService } from 'uswagon-core';
import { DivisionService } from '../../../services/division.service';
@Component({
  selector: 'app-format-management',
  standalone: true,
  imports: [LottieAnimationComponent,CommonModule,ConfirmationComponent,CreateFormatComponent],
  templateUrl: './format-management.component.html',
  styleUrl: './format-management.component.css'
})
export class FormatManagementComponent {

  formats: Format[]=[];
  isSuperAdmin:boolean = this.auth.accountLoggedIn() == 'superadmin';

  selectedFormat?:Format;

  divisions:Division[] = [];
  selectedDivision?:Division;


  modalType?:'maintenance'|'delete';

  openFormatModal:boolean = false;

  // Injecting ChangeDetectorRef to trigger manual change detection
  constructor(
    private divisionService:DivisionService,
    private auth:UswagonAuthService,private API:UswagonCoreService,
    private formatService:FormatService) {}
  ngOnInit(): void {
    this.loadContent();
  }

  async loadContent(){
    this.API.setLoading(true);
    this.divisions = await this.divisionService.getDivisions();
    this.selectedDivision = this.divisions?.[0];
    this.formats = (await this.formatService.getFrom(this.selectedDivision?.id));
    this.API.setLoading(false);    
  }

  async selectDivision(division:Division){
    this.selectedDivision = division;
    this.divisionService.setDivision(division)
    this.API.setLoading(true);
    this.formats = (await this.formatService.getFrom(division.id));
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
  

  addFormat(){
    this.selectedFormat = {
      name:'',
      prefix:'',
      division_id: this.selectedDivision?.id
    };
    this.openFormatModal = true;
  }

  updateFormat(format:Format){
    this.selectedFormat = format;
    this.openFormatModal = true;
  }

  async deleteFormat(item:Format){
    this.API.setLoading(true);
    try{
      await this.formatService.delete(item.id!);
      await this.closeDialog(true);
      this.API.sendFeedback('success', 'Format has been deleted!',5000);
    }catch(e:any){
      this.API.sendFeedback('success', e.message,5000);
    }
  }

  selectFormat(item:Format){
    this.selectedFormat = item;
  }

  

  openDialog(type:'maintenance'|'delete'){
    this.modalType = type;
  }
  async closeDialog(shouldRefresh:boolean){
    const fromService = this.openFormatModal;
    this.openFormatModal = false;
    this.modalType = undefined;
    if(shouldRefresh){
      this.API.setLoading(true);
      this.formats = (await this.formatService.getAll());
      this.API.setLoading(false);
    }
    if(fromService && shouldRefresh){
      if(this.selectedFormat){
        this.API.sendFeedback('success', 'Service has been updated!',5000);
      }else{
        this.API.sendFeedback('success', 'New service has been added!',5000);
      }
    }
  }
}

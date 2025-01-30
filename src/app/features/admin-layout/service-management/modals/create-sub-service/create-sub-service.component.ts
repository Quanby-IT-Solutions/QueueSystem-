import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SubService } from '../../types/service.types';
import { UswagonCoreService } from 'uswagon-core';
import { ServiceService } from '../../../../../services/service.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-sub-service',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './create-sub-service.component.html',
  styleUrl: './create-sub-service.component.css'
})
export class CreateSubServiceComponent {
  @Input() exisitingservice?:SubService;
  @Output() onClose = new EventEmitter<boolean>();
  errorMessageTimeout:any;
  errorMessage?:string;
  submittingForm:boolean = false;
  actionLoading:boolean = false;

  constructor(private API:UswagonCoreService, private serviceService:ServiceService){}

  service:SubService =  {
    name:'',
  } 

  ngOnInit(): void {
    if(this.exisitingservice){
      this.service = {...this.exisitingservice}
    }
  }

  ngOnDestroy(): void {
    if(this.errorMessageTimeout){
      clearTimeout(this.errorMessageTimeout)
    }
  }

  close() {
    this.onClose.emit(false);
  }

  async submitForm(){
    if(this.submittingForm) return;
    this.submittingForm = true;
    if(this.service.name.trim() == ''){
      this.errorMessage = 'This field is required.';
      if(this.errorMessageTimeout){
        clearTimeout(this.errorMessageTimeout)
      }
      this.errorMessageTimeout = setTimeout(()=>{
        this.errorMessage = undefined;
      },5000)
      this.submittingForm = false;
      return;
    }
    try{
      if(this.service.id){
        await this.serviceService.updateSubService(this.service.id,this.service.name,this.service.description ?? '');
      }else{
        await this.serviceService.addSubService(
          this.service.service_id!,
          this.service.name,
          this.service.description ?? ''
        )
      }
      this.submittingForm =false
    }catch(e:any){
      this.API.sendFeedback('error', e.message,5000);
      this.submittingForm =false
      return;
    }
    this.onClose.emit(true);
  }
}

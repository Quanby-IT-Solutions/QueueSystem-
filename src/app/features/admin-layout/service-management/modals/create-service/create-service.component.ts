import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Service } from '../../types/service.types';
import { UswagonCoreService } from 'uswagon-core';
import { ServiceService } from '../../../../../services/service.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-service',
  standalone: true,
  imports: [FormsModule,CommonModule],
  templateUrl: './create-service.component.html',
  styleUrl: './create-service.component.css'
})
export class CreateServiceComponent {
  @Input() exisitingservice?:Service;
  @Output() onClose = new EventEmitter<boolean>();
  errorMessageTimeout:any;
  errorMessage?:string;
  submittingForm:boolean = false;
  actionLoading:boolean = false;

  constructor(private API:UswagonCoreService, private serviceService:ServiceService){}

  service:Service =  {
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
      return;
    }
    try{
      if(this.service.id){
        await this.serviceService.updateService(this.service.id,this.service.name);
      }else{
        await this.serviceService.addService(
          this.service.name
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

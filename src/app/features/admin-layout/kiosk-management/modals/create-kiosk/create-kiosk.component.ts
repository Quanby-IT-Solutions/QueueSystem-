import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UswagonCoreService } from 'uswagon-core';
import { KioskService } from '../../../../../services/kiosk.service';
import { Kiosk } from '../../types/kiosks.types';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-kiosk',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './create-kiosk.component.html',
  styleUrl: './create-kiosk.component.css'
})
export class CreateKioskComponent implements OnInit, OnDestroy {

  @Input() exisitingkiosk?:Kiosk;
  @Output() onClose = new EventEmitter<boolean>();
  errorMessageTimeout:any;
  errorMessage:any ={};
  submittingForm:boolean = false;

  constructor(private API:UswagonCoreService, private kioskService:KioskService){}

  kiosk:Kiosk =  {
    code:'',
    printer_ip: '',
  } 

  oldKiosk?:Kiosk;

  ngOnInit(): void {
    if(this.exisitingkiosk){
      this.kiosk = {...this.exisitingkiosk}
     
    }
    this.oldKiosk = {...this.kiosk};
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
    if(this.kiosk.code.trim() == ''){
      this.errorMessage.code = 'This field is required.';
      if(this.errorMessageTimeout){
        clearTimeout(this.errorMessageTimeout)
      }
      this.errorMessageTimeout = setTimeout(()=>{
        this.errorMessage.code = undefined;
      },5000)
      return;
    }
    if(this.kiosk.printer_ip.trim() == ''){
      this.errorMessage.printer_ip = 'This field is required.';
      if(this.errorMessageTimeout){
        clearTimeout(this.errorMessageTimeout)
      }
      this.errorMessageTimeout = setTimeout(()=>{
        this.errorMessage.printer_ip = undefined;
      },5000)
      return;
    }
    try{
      if(this.kiosk.id){
        if(this.oldKiosk?.code == this.kiosk.code){
          await this.kioskService.updateKiosk(this.kiosk,false);
        }else{
          await this.kioskService.updateKiosk(this.kiosk,true);
        }
      }else{
        await this.kioskService.addKiosk(
          this.kiosk
        )
      }
      this.submittingForm = false;
    }catch(e:any){
      this.API.sendFeedback('error', e.message,5000);
      this.submittingForm = true;
      return;
    }
    this.onClose.emit(true);
  }
}

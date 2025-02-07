import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UswagonCoreService } from 'uswagon-core';
import { LogsService } from '../../../../../services/logs.service';
import { FormatService } from '../../../../../services/format.service';
import { Format } from '../../types/format.types';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-format',
  standalone: true,
  imports: [FormsModule,CommonModule],
  templateUrl: './create-format.component.html',
  styleUrl: './create-format.component.css'
})
export class CreateFormatComponent {
  @Input() existingitem?:Format;
  @Output() onClose = new EventEmitter<boolean>();
  errorMessageTimeout:any;
  errorMessage:{
    name?:string,
    prefix?:string,
    details?:string,
  }={};
  submittingForm:boolean = false;

  constructor(private API:UswagonCoreService,
    private logService: LogsService,
    private formatService:FormatService){}

  item:Format =  {
    name:'',
    prefix:'',
  } 

  getFormatDetails(details?:string):Partial<Format>{
    if(!details) return {};
    try{
      const detailsObj = JSON.parse(details);
      return detailsObj;
    }catch(e){
      return {};
    }
  }
  ngOnInit(): void {
    if(this.existingitem){
      this.item = {...this.existingitem}
      this.item.details = this.getFormatDetails(this.existingitem.description).details
      this.item.counter_call = this.getFormatDetails(this.existingitem.description).counter_call
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
    if(this.item.name.trim() == ''){
      this.errorMessage.name = 'This field is required.';
      if(this.errorMessageTimeout){
        clearTimeout(this.errorMessageTimeout)
      }
      this.errorMessageTimeout = setTimeout(()=>{
        this.errorMessage.name = undefined;
      },5000)
      this.submittingForm = false;
      return;
    }
    if(this.item.prefix.trim() == ''){
      this.errorMessage.prefix = 'This field is required.';
      if(this.errorMessageTimeout){
        clearTimeout(this.errorMessageTimeout)
      }
      this.errorMessageTimeout = setTimeout(()=>{
        this.errorMessage.prefix = undefined;
      },5000)
      this.submittingForm = false;
      return;
    }
    try{
      let descObj:Partial<Format> = {};

      try{
        descObj = this.getFormatDetails(this.item.description);
      }catch(e){}

      descObj.details = this.item.details;
      descObj.counter_call = this.item.counter_call;
      const updateItem:Format={
        id: this.item.id,
        name: this.item.name,
        prefix: this.item.prefix,
        description: JSON.stringify(descObj)
      }
      if(this.item.id){
      

        await this.formatService.update(this.item.id,updateItem);
        
      }else{
        await this.formatService.add(
          {
            name: this.item.name,
            prefix: this.item.prefix,
            division_id: this.item.division_id,
            description: JSON.stringify(descObj)
          }
        )
      }
      this.submittingForm =false;
    }catch(e:any){
      this.submittingForm = false;
      this.API.sendFeedback('error', e.message,5000);
      return;
    }
    this.onClose.emit(true);
  }
}

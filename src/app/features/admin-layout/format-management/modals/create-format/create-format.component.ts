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

  getFormatDetails(details?:string){
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
      if(this.item.id){
        let descObj:any = {};

        try{
          descObj = this.getFormatDetails(this.item.description);
        }catch(e){}

        descObj.details = this.item.details;
        const updateItem:Format={
          id: this.item.id,
          name: this.item.name,
          prefix: this.item.prefix,
          description: JSON.stringify(descObj)
        }

        await this.formatService.update(this.item.id,updateItem);
        
      }else{
        await this.formatService.add(
          this.item
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

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
  }={};
  submittingForm:boolean = false;

  constructor(private API:UswagonCoreService,
    private logService: LogsService,
    private formatService:FormatService){}

  item:Format =  {
    name:'',
    prefix:''
  } 

  ngOnInit(): void {
    if(this.existingitem){
      this.item = {...this.existingitem}
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
        await this.formatService.update(this.item.id,this.item);
        
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

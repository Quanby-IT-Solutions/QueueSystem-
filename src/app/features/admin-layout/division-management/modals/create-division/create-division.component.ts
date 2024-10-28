import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Division } from '../../types/division.types';
import { UswagonCoreService } from 'uswagon-core';
import { DivisionService } from '../../../../../services/division.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-division',
  standalone: true,
  imports: [FormsModule,CommonModule],
  templateUrl: './create-division.component.html',
  styleUrl: './create-division.component.css'
})
export class CreateDivisionComponent {
  @Input() existingitem?:Division;
  @Output() onClose = new EventEmitter<boolean>();
  errorMessageTimeout:any;
  errorMessage?:string;
  submittingForm:boolean = false;

  constructor(private API:UswagonCoreService, private divisionService:DivisionService){}

  item:Division =  {
    name:'',
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
      if(this.item.id){
        await this.divisionService.updateDivision(this.item.id,this.item.name);
      }else{
        await this.divisionService.addDivision(
          this.item.name
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

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Department } from '../../types/department.types';
import { DepartmentService } from '../../../../../services/department.service';
import { UswagonCoreService } from 'uswagon-core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-department',
  standalone: true,
  imports: [FormsModule ,CommonModule],
  templateUrl: './create-department.component.html',
  styleUrl: './create-department.component.css'
})
export class CreateDepartmentComponent {
  @Input() existingitem?:Department;
  @Output() onClose = new EventEmitter<boolean>();
  errorMessageTimeout:any;
  errorMessage?:string;
  submittingForm:boolean = false;

  constructor(private API:UswagonCoreService, private departmentService:DepartmentService){}

  item:Department =  {
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
      return;
    }
    try{
      if(this.item.id){
        await this.departmentService.updateDepartment(this.item.id,this.item.name);
      }else{
        await this.departmentService.addDepartment(
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

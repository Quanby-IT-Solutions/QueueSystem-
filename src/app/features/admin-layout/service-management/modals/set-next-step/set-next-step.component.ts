import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Division, Service, SubService } from '../../types/service.types';
import { ServiceService } from '../../../../../services/service.service';
import { DivisionService } from '../../../../../services/division.service';

@Component({
  selector: 'app-set-next-step',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './set-next-step.component.html',
  styleUrl: './set-next-step.component.css'
})
export class SetNextStepComponent implements OnInit {
   @Output() onClose = new EventEmitter<boolean>();
   @Input() subservice?:SubService;
   subservices?:SubService[];
   services?:Service[];
   divisions:Division[] = [];
   
    actionLoading:boolean = false;

    ngOnInit(): void {   
      this.fetchData();
    }


    async setDivision(division:Division){
      this.actionLoading = true;
      this.services = await this.seviceService.getAllServices(division.id);
      this.actionLoading = false;
    }

    async setService(service:Service){
      this.actionLoading = true;
      this.subservices = await this.seviceService.getSubServices(service.id!);
      this.actionLoading = false;
    }


    async fetchData(){
      this.actionLoading = true;
      this.divisions = await this.divisionService.getDivisions(false);
      this.actionLoading = false;
    }

    back(){
      if(this.subservices){
        this.subservices = undefined;
      }else{
        this.services = undefined;
      }
    }
  
    constructor(
      private divisionService:DivisionService,
      private seviceService:ServiceService){}
  
    async set(subService:SubService){
      if(this.actionLoading) return;
      this.actionLoading = true;
      await this.seviceService.updateForwardToService(this.subservice?.id!, subService.id!);
      this.actionLoading = false;
      this.onClose.emit(true);
    }
    async remove(){
      if(this.actionLoading) return;
      this.actionLoading = true;
      await this.seviceService.updateForwardToService(this.subservice?.id!, '');
      this.actionLoading = false;
      this.onClose.emit(true);
    }
  
    close() {
      this.onClose.emit(false);
    }
  
}

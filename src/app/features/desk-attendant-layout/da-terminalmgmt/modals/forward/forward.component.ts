

import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
// import { Division, Service, SubService } from ';
import { ServiceService } from '../../../../../services/service.service';
import { DivisionService } from '../../../../../services/division.service';
import { Service, SubService } from '../../../../kiosk-layout/types/kiosk-layout.types';
import { Division } from '../../../../admin-layout/service-management/types/service.types';

@Component({
  selector: 'app-forward',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './forward.component.html',
  styleUrl: './forward.component.css'
})
export class ForwardComponent implements OnInit {

   @Output() onClose = new EventEmitter<string|undefined>();
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
      this.onClose.emit(subService.id!);
    }

  
    close() {
      this.onClose.emit(undefined);
    }
  
}

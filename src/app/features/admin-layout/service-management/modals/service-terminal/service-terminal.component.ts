import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Kiosk } from '../../../../../services/kiosk.service';
import { ServiceService } from '../../../../../services/service.service';
import { CommonModule } from '@angular/common';
import { Terminal } from '../../../terminal-management/types/terminal.types';
import { SubService } from '../../types/service.types';

@Component({
  selector: 'app-service-terminal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-terminal.component.html',
  styleUrl: './service-terminal.component.css'
})
export class ServiceTerminalComponent implements OnInit{
  @Output() onClose = new EventEmitter<boolean>();
  @Input() terminals: Terminal[] = [];
  @Input() subservice!: SubService;
  
  selectedTerminals:string[]=[];

  actionLoading: boolean = false;

  constructor(private serviceService: ServiceService) {
    
   }

   ngOnInit(): void {
    this.selectedTerminals = (this.getSubServiceDetails(this.subservice).terminals??'').split(',')
   }

  async setTerminals() {
    if (this.actionLoading) return;
    this.actionLoading = true;
    await this.serviceService.updateTerminalSpecifics(this.subservice.id!, this.selectedTerminals);
    this.actionLoading = false;
    this.onClose.emit(true);
  }

   getSubServiceDetails(service?:SubService){
      if(!service)return{};
      if(service.description){
        try{
          return JSON.parse(service.description);
        }catch(e){
          return {}
        }
      }else{
        return {};
      }
    }

  selectTerminal(id:string){
    if(this.selectedTerminals.includes(id)){
      this.selectedTerminals = this.selectedTerminals.filter(t=>t != id);
    }else{
      this.selectedTerminals.push(id);
    }
  }

  close() {
    this.onClose.emit(false);
  }

}

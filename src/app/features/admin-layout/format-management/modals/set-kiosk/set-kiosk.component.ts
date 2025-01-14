import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormatService } from '../../../../../services/format.service';
import { Kiosk } from '../../../../../services/kiosk.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-set-kiosk',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './set-kiosk.component.html',
  styleUrl: './set-kiosk.component.css'
})
export class SetKioskComponent {
  @Output() onClose = new EventEmitter<boolean>();
  @Input() kiosks:Kiosk[] =[];
  @Input() format:any;
  
  actionLoading:boolean = false;

  constructor(private formatService:FormatService){}

  async setKiosk(kiosk:string){
    if(this.actionLoading) return;
    this.actionLoading = true;
    await this.formatService.setKiosk(this.format.id, kiosk);
    this.actionLoading = false;
    this.onClose.emit(true);
  }
  async removeKiosk(){
    if(this.actionLoading) return;
    this.actionLoading = true;
    await this.formatService.setKiosk(this.format.id, '');
    this.actionLoading = false;
    this.onClose.emit(true);
  }

  close() {
    this.onClose.emit(false);
  }

}

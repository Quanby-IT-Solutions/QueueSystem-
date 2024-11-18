import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Format } from '../../../format-management/types/format.types';
import { TerminalService } from '../../../../../services/terminal.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-set-client',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './set-client.component.html',
  styleUrl: './set-client.component.css'
})
export class SetClientComponent {
  @Output() onClose = new EventEmitter<boolean>();
  @Input() formats:Format[] =[];
  @Input() terminal:any;
  
  actionLoading:boolean = false;

  constructor(private terminalService:TerminalService){}

  async setClient(clientType:string){
    if(this.actionLoading) return;
    this.actionLoading = true;
    await this.terminalService.setTerminalClient(this.terminal.id, clientType);
    this.actionLoading = false;
    this.onClose.emit(true);
  }
  async removeClient(){
    if(this.actionLoading) return;
    this.actionLoading = true;
    await this.terminalService.setTerminalClient(this.terminal.id, '');
    this.actionLoading = false;
    this.onClose.emit(true);
  }

  close() {
    this.onClose.emit(false);
  }

}

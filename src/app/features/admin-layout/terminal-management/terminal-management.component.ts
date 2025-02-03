import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerminalService } from '../../../services/terminal.service';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { ConfirmationComponent } from '../../../shared/modals/confirmation/confirmation.component';
import { DivisionService } from '../../../services/division.service';
import { SetClientComponent } from './modals/set-client/set-client.component';
import { Format } from '../format-management/types/format.types';
import { FormatService } from '../../../services/format.service';

// Interface defining the structure of a Counter object


interface Terminal{
  id:string;
  division_id:string;
  number:string;
  get status():string;  
  _status:string;  
  session_status?:string;
  last_active?:string;
  attendant?:string;
  specific?:string;
}
interface Division{
  id:string;
  name:string;
}

@Component({
  selector: 'app-terminal-management',  // Component selector used in templates
  templateUrl: './terminal-management.component.html',  // HTML template for the component
  styleUrls: ['./terminal-management.component.css'],  // CSS for the component
  standalone: true,  // Allows the component to be used without being declared in a module
  imports: [CommonModule,LottieAnimationComponent, ConfirmationComponent, SetClientComponent]  // Importing CommonModule to use Angular common directives
})
export class TerminalManagementComponent implements OnInit, OnDestroy {

  statusInterval:any;

  divisions:Division[]=[];
  selectedDivision?:string;

  terminals: Terminal[]=[];

  isSuperAdmin:boolean = this.auth.accountLoggedIn() == 'superadmin';

  selectedTerminal?:Terminal;
  formats:Format[] = [];
  actionLoading:boolean = false;
  dataLoaded:boolean = false;

  constructor( 
    private cdr:ChangeDetectorRef,
    private divisionService:DivisionService,
    private formatService:FormatService,
    private auth:UswagonAuthService,private API:UswagonCoreService,
    private terminalService:TerminalService) {}


  
  ngOnInit(): void {
    this.loadContent();
  }
  ngOnDestroy(): void {
    if(this.statusInterval){
      clearInterval(this.statusInterval);
    }
  }

  setClientModal:boolean = false;
  
  openSetClient(){
    this.setClientModal = true;
  }

  async closeSetClient(refresh:boolean){
    this.setClientModal  = false;
    if(refresh){
      this.API.sendFeedback('success', 'Terminal Client Type has been updated!',5000)
      this.API.setLoading(true);
      this.terminals = (await this.terminalService.getAllTerminals());
      this.API.setLoading(false);
    }
  }

  getFormatName(id?:string){
    if(!id) return null;
    return this.formats.find(format=>format.id == id)?.name;
  }
  private serverTimeDifference?:number;
  private getServerTime(){
    return new Date(new Date().getTime() + this.serverTimeDifference!);
  }
  checkIfOnline(terminal:Terminal){
 
    const now = this.getServerTime();
      const lastActive = new Date(terminal.last_active!);
      const diffInMinutes = (now.getTime() - lastActive.getTime()) / 60000; 

      if (diffInMinutes < 5 && terminal._status !== 'maintenance' && terminal.session_status !== 'closed') {

          return 'online';
      } else {
      
          return terminal._status; 
      }
  }

  async loadContent(){
    this.API.setLoading(true);
    const serverTimeString = await this.API.serverTime();
    const serverTime = new Date(serverTimeString);
    const localTime = new Date();
    this.serverTimeDifference =  serverTime.getTime() - localTime.getTime();
    this.selectedDivision = (await this.divisionService.getDivision())?.id;
    this.divisions = this.divisionService.divisions;
    await  this.loadFormats();
    await this.updateTerminalData();
    this.API.setLoading(false);
    this.API.addSocketListener('terminal-events', async(data)=>{
      if(data.event =='terminal-events'){
        await this.updateTerminalData();
      }
    })
    this.statusInterval = setInterval(()=>{
      this.cdr.detectChanges();
    },1500)
  }

  async updateTerminalData(){
    const exisitingTerminals:string[] = [];
    const updatedTerminals = await this.terminalService.getAllTerminals();

    // Update existing terminals
    updatedTerminals.forEach((updatedTerminal:Terminal) => {
      exisitingTerminals.push(updatedTerminal.id);

      const existingTerminal = this.terminals.find(t => t.id === updatedTerminal.id);
      if (existingTerminal) {
        Object.keys(updatedTerminal).forEach((key) => {
          // Check if the property is a regular property (not a getter)
          const descriptor = Object.getOwnPropertyDescriptor(updatedTerminal, key);
          if (descriptor && !descriptor.get) {
            existingTerminal[key as keyof Omit<Terminal, 'status'>] = updatedTerminal[key as keyof Omit<Terminal, 'status'>]!;
          }
        });
      } else {
        this.terminals.push(updatedTerminal);
      }
    });
    this.terminals = this.terminals.filter(terminal=> exisitingTerminals.includes(terminal.id))
  }

  async selectDivision(division:Division){
    this.selectedDivision = division.id;
    this.API.setLoading(true);
    await this.loadFormats();
    this.divisionService.setDivision(division);
 
    this.terminals = (await this.terminalService.getAllTerminals());
    this.API.setLoading(false);
  }

  async loadFormats(){
    this.formats = await this.formatService.getFrom(this.selectedDivision!);
    if(this.formats.length <=0){
      this.formats = [
        {
          id:'priority',
          name:'Priority',
          prefix:'P'
        },
        {
          id:'regular',
          name:'Regular',
          prefix:'R'
        },
      ]
    }
  }

  statusMap:any = {
    'available' : 'bg-green-500',
    'maintenance' : 'bg-red-500',
    'online' : 'bg-orange-500',
  }

  capitalizeFirstLetters(input: string): string {
    return input
      .split(' ') // Split the string into words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
      .join(' '); // Join the words back into a single string
  }
  

  async addTerminal(){
    this.API.setLoading(true);
    try{
      await this.terminalService.addTerminal(this.selectedDivision!);
      this.terminals = (await this.terminalService.getAllTerminals());
      this.API.sendFeedback('success', 'New terminal has been added!',5000);
    }catch(e:any){
      this.API.sendFeedback('error',e.message, 5000);
    }
    this.API.setLoading(false);
  }

  async toggleMaintenance(terminal:Terminal){
    this.closeDialog();
    this.API.setLoading(true);
    try{
      await this.terminalService.updateTerminalStatus(terminal.id,terminal.status == 'maintenance' ? 'available' : 'maintenance');
      this.terminals = (await this.terminalService.getAllTerminals());
      this.API.sendFeedback('success', 'Terminal status has been updated!',5000);
    }catch(e:any){
      this.API.sendFeedback('error',e.message, 5000);
    }
    this.API.setLoading(false);
  }
  async deleteTerminal(terminal:Terminal){
    this.closeDialog();
    this.API.setLoading(true);
    try{
      await this.terminalService.deleteTerminal(terminal.id);
      this.terminals = (await this.terminalService.getAllTerminals());
      this.API.sendFeedback('success', 'Terminal has been deleted!',5000);
    }catch(e:any){
      this.API.sendFeedback('error',e.message, 5000);
    }
    this.API.setLoading(false);
  }

  selectTerminal(terminal:Terminal){
    this.selectedTerminal = terminal;
  }

  modalType?:'maintenance'|'delete';

  openDialog(type:'maintenance'|'delete'){
    this.modalType = type;
  }
  closeDialog(){
    this.modalType = undefined;
  }

  

  
}

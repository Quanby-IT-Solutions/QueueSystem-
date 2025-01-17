


import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { LottieAnimationComponent } from '../../../shared/components/lottie-animation/lottie-animation.component';
import { UswagonCoreService } from 'uswagon-core';
import { TerminalService } from '../../../services/terminal.service';
import { ContentService } from '../../../services/content.service';
import { DivisionService } from '../../../services/division.service';
import { ConfirmationComponent } from '../../../shared/modals/confirmation/confirmation.component';
import { Subscription } from 'rxjs';
import { QueueService } from '../../../services/queue.service';
import { ServiceService } from '../../../services/service.service';
import { LogsService } from '../../../services/logs.service';
import { Format } from '../../admin-layout/format-management/types/format.types';
import { FormatService } from '../../../services/format.service';


interface Terminal{
  id:string;
  division_id:string;
  number:string;
  get status():string;  
  _status:string;  
  last_active?:string;
  session_status?:string;
  attendant?:string;
  specific?:string;
}

interface Division{
  id:string;
  name:string;
}


interface Ticket {
  id:string;
  division_id:string;
  number:number;
  status:string;
  timestamp:string;
  type:string;
  tag?:string;
  metaType?:string;
  fullname:string;
  services:string;
  department_id?:string;
  kiosk_id:string;
  gender:'male'|'female'|'other';
  student_id?:string;
  collision?:string;
  
}

interface ClientDetails {
  name: string;
  date: string;
  services:string[];
  department?: string;
  student_id?: string;
  gender?:string;
} 

interface Service {
  id: string;
  name: string;
  division_id: string;
  [key: string]: any; // for any additional properties
}
@Component({
  selector: 'app-da-terminalmgmt',
  templateUrl: './da-terminalmgmt.component.html',
  styleUrls: ['./da-terminalmgmt.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    LottieAnimationComponent,
    ConfirmationComponent,
  ]
})
export class DaTerminalmgmtComponent implements OnInit, OnDestroy {
  selectedCounter?: Terminal;
  counters: number[] = [1, 2, 3, 4, 5];
  currentTicket?: Ticket;
  lastCalledNumber: string = 'N/A';
  currentDate: string = '';
  timer: string = '00:00:00';
  timerStartTime: number | null = null;
  selectedTicket?: Ticket; //selection manually
  division?:Division;
  divisions:Division[]=[];
  bottomTickets: Set<string> = new Set();
  filteredServices: string[] = [];
  showServiceFilter: boolean = false;
  terminateModal:boolean = false;
  divisionServices: Service[] = [];
  tickets: Ticket[] = [
    
  ];

  currentClientDetails: ClientDetails | null = null;

  // Action Buttons States
  isNextClientActive: boolean = true;
  isClientDoneActive: boolean = false;
  isCallNumberActive: boolean = false;
  isManualSelectActive: boolean = true;
  isReturnTopActive: boolean = false;
  isReturnBottomActive: boolean = false;

  private timerInterval: any;
  private serverTimeInterval:any;
  private dateInterval: any;
  private statusInterval:any;
  private subscription?:Subscription;

  lastSession?:any;

  actionLoading:boolean = false;
  terminals: Terminal[]=[];
  services: any[]=[];
  statusMap:any = {
    'available' : 'bg-green-500',
    'maintenance' : 'bg-red-500',
    'online' : 'bg-orange-500',
  }
timerProgress: any;

  content:any;


  constructor( 
    private dvisionService:DivisionService,
    private API:UswagonCoreService,
    private queueService:QueueService,
    private cdr:ChangeDetectorRef,
    private formatService:FormatService,
    private contentService:ContentService,
    private logService:LogsService,
    private serviceService:ServiceService,
    private terminalService:TerminalService) {}

    refreshInterval:any;

    ngOnInit(): void {
      this.updateCurrentDate();
      this.dateInterval = setInterval(() => this.updateCurrentDate(), 60000);
      this.loadContent();
  
      this.subscription = this.queueService.queue$.subscribe((queueItems: Ticket[]) => {
        if(this.selectedCounter?.specific){
          this.queueService.queue = queueItems.filter((queue)=>queue.type == this.selectedCounter?.specific)
          this.tickets = [...this.queueService.queue];
        } else {
          this.tickets = [...queueItems];
        }
        
        // Update bottom tickets to only include tickets still in queue
        this.bottomTickets = new Set(
          Array.from(this.bottomTickets).filter(id => 
            queueItems.some(ticket => ticket.id === id)
          )
        );
  
        // Clear selection if selected ticket no longer exists in queue
        if (this.selectedTicket && !queueItems.find(t => t.id === this.selectedTicket!.id)) {
          this.selectedTicket = undefined;
        }
      });
      
      // this.statusInterval = setInterval(()=>{
      //   this.cdr.detectChanges();
      // },1500)
  }

  ngOnDestroy(): void {
    this.clearIntervals();
    if(this.subscription){
      this.subscription.unsubscribe();
    }
    if(this.serverTimeInterval){
      clearInterval(this.serverTimeInterval);
    }
  }
  formats:Format[] = [];

   getDivisionName(id:string){
    return this.divisions.find(division=>division.id==id)?.name;
  }
  
  async loadFormats(){
    this.formats = await this.formatService.getFrom(this.dvisionService.selectedDivision?.id!);
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
  // filter toggle
  toggleServiceFilter() {
    this.showServiceFilter = !this.showServiceFilter;
  }
  handleServiceClick(serviceId: string) {
    // If it's already selected, remove it (clear filter)
    if (this.filteredServices.includes(serviceId)) {
      this.filterQueueByServices([]);
    } else {
      // Otherwise, apply the filter for this service
      this.filterQueueByServices([serviceId]);
    }
  }

  // Update the parameter type to match your existing code
  filterQueueByServices(serviceIds: string[]) {
    this.filteredServices = serviceIds;
    if (serviceIds.length === 0) {
      // Your existing code for no filters
      if(this.selectedCounter?.specific){
        this.queueService.queue = this.queueService.queue.filter((queue) => 
          queue.type == this.selectedCounter?.specific && 
          queue.division_id === this.division?.id
        );
        this.tickets = [...this.queueService.queue];
      } else {
        this.tickets = this.queueService.queue.filter(queue => 
          queue.division_id === this.division?.id
        );
      }
    } else {
      // Your existing code for filtering
      let filteredTickets = this.queueService.queue.filter(queue => 
        queue.division_id === this.division?.id
      );
      
      if(this.selectedCounter?.specific) {
        filteredTickets = filteredTickets.filter((queue) => 
          queue.type == this.selectedCounter?.specific
        );
      }
      
      this.tickets = filteredTickets.filter(ticket => {
        const ticketServices = ticket.services.split(', ');
        return serviceIds.some(id => ticketServices.includes(id));
      });
    }
  }

  
 

  clearServiceFilters() {
    this.filteredServices = [];
    if (this.selectedCounter?.specific) {
      this.tickets = this.queueService.queue.filter((queue) => 
        queue.type == this.selectedCounter?.specific
      );
    } else {
      this.tickets = [...this.queueService.queue];
    }
  }

  getFormatName(id?:string){
    if(!id) return null;
    return this.formats.find(format=>format.id == id)?.name;
  }


  async loadContent(){
    this.API.setLoading(true);
    if(this.serverTimeDifference == undefined) {
      const serverTimeString = await this.API.serverTime();
    
      const serverTime = new Date(serverTimeString);
      const localTime = new Date();
      this.serverTimeDifference =  serverTime.getTime() - localTime.getTime();
    }

    this.divisions = await this.dvisionService.getDivisions();

    

    this.division = await this.dvisionService.getDivision() ;
    this.dvisionService.setDivision(this.division!);


    
    [this.content,this.services,this.lastSession] = await Promise.all([
      this.contentService.getContentSetting(),
      this.serviceService.getAllSubServices(),
      this.terminalService.getActiveSession(),
      this.queueService.getTodayQueues(),
      this.loadFormats(),
      this.updateTerminalData()
    ])
 

    const uniqueServiceIds = new Set<string>();
    this.queueService.queue.forEach(ticket => {
      if (ticket.division_id === this.division?.id && ticket.services) {
        ticket.services.split(', ').forEach(serviceId => uniqueServiceIds.add(serviceId));
      }
    });

  

    this.divisionServices = this.services.filter(service => 
      uniqueServiceIds.has(service.id) && 
      (!service.division_id || service.division_id === this.division?.id)
    );
    

  


    if(this.lastSession){
      this.selectedCounter = this.terminals.find(terminal=>terminal.id == this.lastSession.terminal_id);
      this.terminalService.refreshTerminalStatus(this.lastSession.id);
      this.API.sendFeedback('warning','You have an ongoing session.',5000);
      const {attendedQueue,queue} =await this.queueService.getQueueOnDesk();
    
      this.currentTicket = queue ? {...queue!} : undefined;

      this.currentClientDetails = {
        name: this.currentTicket?.fullname || 'N/A',
        date: this.currentTicket?.timestamp || this.currentDate,
        services: this.services.filter(service=> this.currentTicket?.services.split(', ').includes(service.id)).map(service=>service.name),
        student_id: this.currentTicket?.student_id || 'N/A',
        department: this.currentTicket?.department_id || 'N/A',
      };

     
      const lastQueue = await this.queueService.getLastQueueOnDesk();
  
      if(lastQueue)[
        this.lastCalledNumber = (lastQueue.tag) +'-' + lastQueue.number.toString().padStart(3, '0')
      ]
      if(this.currentTicket){
        this.startTimer();
        this.isNextClientActive = false;
        this.isClientDoneActive = true;
        this.isCallNumberActive = true;
        this.isManualSelectActive = false;
        this.isReturnTopActive = true;
        this.isReturnBottomActive = true;
        
        this.timerStartTime = new Date(attendedQueue?.attended_on!).getTime();
        
        this.API.sendFeedback('warning','You have an active transaction.',5000);
      }
    }
    
this.subscription = this.queueService.queue$.subscribe((queueItems: Ticket[]) => {
  if(this.selectedCounter?.specific){
    this.queueService.queue = queueItems.filter((queue)=>queue.type == this.selectedCounter?.specific);
    let filtered = [...this.queueService.queue];
    if (this.filteredServices.length > 0) {
      filtered = filtered.filter(ticket => {
        const ticketServices = ticket.services.split(', ');
        return this.filteredServices.some(id => ticketServices.includes(id));
      });
    }
    this.tickets = filtered;
  } else {
    if (this.filteredServices.length > 0) {
      this.tickets = queueItems.filter(ticket => {
        const ticketServices = ticket.services.split(', ');
        return this.filteredServices.some(id => ticketServices.includes(id));
      });
    } else {
      this.tickets = [...queueItems];
    }
  }});

    this.queueService.listenToQueue();
    this.API.addSocketListener('kiosk-events', async(data)=>{
      if(data.event =='kiosk-events'){
        this.formats = await this.formatService.getFrom(this.dvisionService.selectedDivision?.id!);
      }
    });

    this.API.addSocketListener('terminal-events', async(data)=>{
      if(data.event =='terminal-events'){
        if(this.updatingTerminalData) return;
        this.updatingTerminalData = true;
        await this.updateTerminalData();
        this.lastSession = await this.terminalService.getActiveSession();
        if(!this.lastSession && this.selectedCounter){
          this.terminalService.terminateTerminalSession();
          this.selectedCounter = undefined;
          this.lastSession = undefined;
          this.selectedTicket = undefined;
          this.currentTicket = undefined;
        }
        if(this.lastSession && this.selectedCounter == undefined){
          this.selectedCounter = this.terminals.find(terminal=>terminal.id == this.lastSession.terminal_id);
          this.terminalService.refreshTerminalStatus(this.lastSession.id);
          this.API.sendFeedback('warning','You have an ongoing session.',5000);
          const {attendedQueue,queue} =await this.queueService.getQueueOnDesk();
        
          this.currentTicket = queue ? {...queue!} : undefined;
    
          this.currentClientDetails = {
            name: this.currentTicket?.fullname || 'N/A',
            date: this.currentTicket?.timestamp || this.currentDate,
            services: this.services.filter(service=> this.currentTicket?.services.split(', ').includes(service.id)).map(service=>service.name),
            student_id: this.currentTicket?.student_id || 'N/A',
            department: this.currentTicket?.department_id || 'N/A',
          };
    
         
          const lastQueue = await this.queueService.getLastQueueOnDesk();
      
          if(lastQueue)[
            this.lastCalledNumber = (lastQueue.tag) +'-' + lastQueue.number.toString().padStart(3, '0')
          ]
          if(this.currentTicket){
            this.startTimer();
            this.isNextClientActive = false;
            this.isClientDoneActive = true;
            this.isCallNumberActive = true;
            this.isManualSelectActive = false;
            this.isReturnTopActive = true;
            this.isReturnBottomActive = true;
            
            this.timerStartTime = new Date(attendedQueue?.attended_on!).getTime();
            
            this.API.sendFeedback('warning','You have an active transaction.',5000);
          }
        }
        
        this.updatingTerminalData = false;
      }
    })

    this.API.setLoading(false);  
  }

  private updatingTerminalData = false;

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

    if(this.lastSession){
      const terminal =  this.terminals.find(terminal=>terminal.id == this.lastSession.terminal_id);
      if(terminal?.status == 'maintenance'){
        this.terminalService.terminateTerminalSession();
        this.selectedCounter = undefined;
        this.lastSession = undefined;
        this.selectedTicket = undefined;
        this.currentTicket = undefined;
        this.API.sendFeedback('error','Your terminal is for maintenance. You have been logout!',5000)
      }
    }
  }


  openTerminateModal(){
    this.terminateModal = true;
  }

  closeTerminateModal(){
    this.terminateModal = false;
  }
  //slection of row manually
  selectTicket(ticket: Ticket) {
    if (this.currentTicket) {
      this.API.sendFeedback('warning','Finish current transaction before selecting another ticket.',5000);
      // this.actionLoading = false;
      return;
    }

    if (this.selectedTicket?.id === ticket.id) {
      this.selectedTicket = undefined;
    } else {
      this.selectedTicket = ticket;
    }
  }

  /**
   * Selects a counter and initializes related states.
   * @param counter The counter number selected by the user.
   */
  async selectCounter(counter: Terminal) {
    if(counter.status == 'maintenance'){
      this.API.sendFeedback('warning', 'This terminal is under maintenance', 5000);
      return; 
    }
    if(counter.status == 'online'){
      this.API.sendFeedback('warning', 'This terminal is used by another attendant', 5000);
      return; 
    }
    this.selectedCounter = counter;
    this.API.setLoading(true);
    await this.queueService.getTodayQueues();
    await this.terminalService.startTerminalSession(counter.id);
    this.lastSession = await this.terminalService.getActiveSession()
    this.terminalService.refreshTerminalStatus(this.lastSession.id);
    this.API.socketSend({event:'terminal-events'})
    this.API.socketSend({event:'queue-events'})
    this.API.socketSend({event:'admin-dashboard-events'})
    this.API.setLoading(false);
    const index = this.terminals.findIndex(terminal=>terminal.id == counter.id);
    this.API.sendFeedback('success',`You are now logged in to Terminal ${index + 1}`,5000);
  }


  /**
   * Resets the selected counter and stops the timer.
   */
  async resetCounter() {
    this.closeTerminateModal();
    this.API.setLoading(true);
    this.selectedCounter = undefined;
    this.currentTicket = undefined;
    await this.terminalService.terminateTerminalSession();
    this.stopTimer();
    this.API.socketSend({event:'terminal-events'})
    this.API.socketSend({event:'queue-events'})
    this.API.socketSend({event:'admin-dashboard-events'})
    this.resetActionButtons();
    await this.updateTerminalData();
    this.API.setLoading(false);
    this.API.sendFeedback('warning','You have logged out from your terminal.',5000);
  }

  async priorityClient() {
    if (this.actionLoading) return;

    try {
      
      this.actionLoading = true;
      
      if( this.currentTicket != null && this.currentTicket.type != 'priority'){
        this.API.sendFeedback('warning','Finish regular transaction first.',5000);
        this.actionLoading = false;
        return;
      }
      // If there's a current transaction, finish it first
      if (this.currentTicket) {
        await this.queueService.resolveAttendedQueue('finished');
        this.resetInterface();
        this.API.socketSend({event:'queue-events'})
        this.API.socketSend({event:'admin-dashboard-events'})
        this.API.sendFeedback('success','Transaction successful!',5000);
        
        return;
      }

      const priorityTickets = this.tickets.filter(
        ticket => ticket.type === 'priority' && 
        (ticket.status === 'waiting' || ticket.status === 'bottom')
      );
 

      if (priorityTickets.length === 0) {
        this.API.sendFeedback('warning', 'No priority clients in queue.', 5000);
        this.actionLoading = false;
        return;
      }


      // Use the type-based nextQueue method
      const nextTicket = await this.queueService.nextQueue('priority');
      this.API.socketSend({event:'queue-events'})
      this.API.socketSend({event:'admin-dashboard-events'})
      if (nextTicket) {
        this.logService.pushLog('transaction-start',`started a transaction (priority).`);
        this.currentTicket = nextTicket;
        this.currentClientDetails = {
          name: nextTicket.fullname || 'N/A',
          date: nextTicket.timestamp || this.currentDate,
          services: this.services.filter(service=> nextTicket.services.split(', ').includes(service.id)).map(service=>service.name),
          student_id: nextTicket.student_id || 'N/A',
          department: nextTicket.department_id || 'N/A',
        };

        // Update states
        this.isNextClientActive = false;
        this.isClientDoneActive = true;
        this.isCallNumberActive = true;
        this.isManualSelectActive = true;
        this.isReturnTopActive = true;
        this.isReturnBottomActive = true;

        // Start timer and update display
        this.startTimer();
        // this.updateUpcomingTicket();
        
        this.API.socketSend({
          event: 'number-calling',
          division: this.division?.id,
          message: `${this.currentTicket?.type =='priority' ? 'Priority':''} number ${this.currentTicket?.number} on ${this.dvisionService.selectedDivision?.name} .Proceed to counter ${this.selectedCounter?.number}`
        })
        this.API.sendFeedback('success', `Priority transaction started with client.`, 5000);
      }
    } catch (error) {
      console.error('Priority client error:', error);
      this.API.sendFeedback('error', 'Failed to process priority client. Please try again.', 5000);
    } finally {
      this.actionLoading = false;
    }
}



  async nextClient() {
    if (this.actionLoading) return;
    try {
      this.actionLoading = true;
      // If there's a current transaction, finish it first
      if (this.currentTicket) {
        await this.queueService.resolveAttendedQueue('finished');
        this.resetInterface();
        this.API.sendFeedback('success','Transaction successful!',5000);
        this.actionLoading = false;
        return;
      }

      if (this.tickets.length === 0) {
        this.API.sendFeedback('warning', 'No clients in queue.', 5000);
        this.actionLoading = false;
        return;
      }


      // Use the selected ticket type if available
      let nextTicket: Ticket | undefined;
      if (this.selectedTicket && this.isManualSelectActive) {
        // Use the existing queue type-based method

        nextTicket = await this.queueService.nextQueue(this.selectedTicket.type);
      } else {
        // Get next ticket without type specification

        nextTicket = await this.queueService.nextQueue();
      }

      if (nextTicket) {
        this.logService.pushLog('transaction-start',`started a transaction (regular).`);
        this.currentTicket = nextTicket;
        this.currentClientDetails = {
          name: nextTicket.fullname || 'N/A',
          date: nextTicket.timestamp || this.currentDate,
          services:this.services.filter(service=> nextTicket.services.split(', ').includes(service.id)).map(service=>service.name),
          
          student_id: nextTicket.student_id || 'N/A',
          department: nextTicket.department_id || 'N/A',
        };

        // Update states
        this.isNextClientActive = false;
        this.isClientDoneActive = true;
        this.isCallNumberActive = true;
        this.isManualSelectActive = true;
        this.isReturnTopActive = true;
        this.isReturnBottomActive = true;

        // Clear selection
        this.selectedTicket = undefined;

        // Start timer and update display
        this.startTimer();
        // this.updateUpcomingTicket();
        
        this.API.sendFeedback('success', `Transaction started with client.`, 5000);
        this.API.socketSend({
          event: 'number-calling',
          division: this.division?.id,
          message: `${this.currentTicket?.metaType  ?? (this.currentTicket?.type == 'priority'? 'Priority':'') } number ${this.currentTicket?.number} on ${this.dvisionService.selectedDivision?.name}. Proceed to counter ${this.selectedCounter?.number}`
        })
      } else {
        this.API.sendFeedback('warning', 'Could not get next client.', 5000);
      }

    } catch (error) {
      console.error('Next client error:', error);
      this.API.sendFeedback('error', 'Failed to process client. Please try again.', 5000);
    } finally {
      this.actionLoading = false;
    }
}


  // Modified resetInterface method
  resetInterface() {
    this.isClientDoneActive = false;
    this.isNextClientActive = true;
    this.isCallNumberActive = false;
    this.isManualSelectActive = true;  // Keep manual selection mode active
    this.isReturnTopActive = false;
    this.isReturnBottomActive = false;
    if (this.currentTicket) {
      this.lastCalledNumber = (this.currentTicket.tag ?? this.currentTicket.type ) + '-' + 
        this.currentTicket.number.toString().padStart(3, '0');
    }
    this.currentTicket = undefined;
    this.currentClientDetails = null;
    // Don't clear selectedTicket here to maintain selection
    this.stopTimer();
  }


  /**
   * Marks the current client as done and updates states accordingly.
   */
  
  async clientDone() {
    if (this.actionLoading) return;
    this.actionLoading = true;

    try {
      await this.queueService.resolveAttendedQueue('finished');
      
      // If we have a next selection and manual mode is active, process it
      if (this.selectedTicket && this.isManualSelectActive) {
        await this.nextClient();
      } else {
        this.resetInterface();
      }
      
      this.API.sendFeedback('success', `Transaction successful!`, 5000);
      this.logService.pushLog('transaction-end',`completed a transaction.`);
    } catch (error) {
      this.API.sendFeedback('error', 'Failed to complete transaction', 5000);
    } finally {
      this.actionLoading = false;
    }
  }



  /**
   * Simulates calling the current number.
   */
  callNumber(): void {
    console.log(`Calling number ${this.currentTicket?.number}`);
    this.API.sendFeedback('neutral', `Calling number ${this.currentTicket?.tag ?? this.currentTicket?.type[0].toUpperCase()}-${this.currentTicket?.number.toString().padStart(3, '0')}`,5000)
    
    this.API.socketSend({
      event: 'number-calling',
      division: this.division?.id,
      message: `${this.currentTicket?.metaType ?? (this.currentTicket?.type == 'priority'? 'Priority':'') } number ${this.currentTicket?.number} on ${this.dvisionService.selectedDivision?.name}. Proceed to counter ${this.selectedCounter?.number}`
    })
    // this.isCallNumberActive = false;
  }

  /**
   * Toggles the manual select state.
   */
  async manualSelect() {
    if (this.actionLoading) return;
    this.actionLoading = true;
    const selectedTicket = this.selectedTicket;
    this.selectedTicket = undefined;
   try{
      const nextTicket = await this.queueService.manualSelect({...selectedTicket!})
      if (nextTicket) {
        this.currentTicket = nextTicket;
        this.currentClientDetails = {
          name: nextTicket.fullname || 'N/A',
          date: nextTicket.timestamp || this.currentDate,
          services:this.services.filter(service=> nextTicket.services.split(', ').includes(service.id)).map(service=>service.name),
          
          student_id: nextTicket.student_id || 'N/A',
          department: nextTicket.department_id || 'N/A',
        };

        // Update states
        this.isNextClientActive = false;
        this.isClientDoneActive = true;
        this.isCallNumberActive = true;
        this.isManualSelectActive = true;
        this.isReturnTopActive = true;
        this.isReturnBottomActive = true;

        // Clear selection
        this.selectedTicket = undefined;

        // Start timer and update display
        this.startTimer();
        // this.updateUpcomingTicket();
        
        this.API.sendFeedback('success', `Transaction started with client.`, 5000);
        this.logService.pushLog('transaction-manual',`started a manual select transaction.`);
        this.actionLoading = false;
        this.API.socketSend({
          event: 'number-calling',
          division: this.division?.id,
          message: `${this.currentTicket?.metaType  ?? (this.currentTicket?.type == 'priority'? 'Priority':'') } number ${this.currentTicket?.number} on ${this.dvisionService.selectedDivision?.name}. Proceed to counter ${this.selectedCounter?.number}`
        })
      } else {
        this.API.sendFeedback('warning', 'Could not get next client.', 5000);
      }
   }catch(e){
    this.API.sendFeedback('error', 'Unable to get next client.',5000);
   }
  }


  /**
   * Returns the current ticket to the bottom of the queue.
   */
  async returnBottom() {
    if(this.actionLoading) return;
    this.actionLoading = true;
    
    if(this.currentTicket) {
      this.bottomTickets.add(this.currentTicket.id);
    }
    
    await this.queueService.resolveAttendedQueue('bottom');
    this.resetInterface();
    this.stopTimer();
    this.actionLoading = false;
    this.API.socketSend({event:'admin-dashboard-events'})
    this.API.sendFeedback('warning', `Client has been put to bottom of queue.`,5000);
  }
  
  private serverTimeDifference?:number;

  private  getServerTime(){
      return new Date(new Date().getTime() + this.serverTimeDifference!);
    }


  checkIfOnline(terminal:Terminal){
;   
    const lastActive = new Date(terminal.last_active!);
    const diffInMinutes = (this.getServerTime().getTime() - lastActive.getTime()) / 60000; 

    if (diffInMinutes < 1.5 && terminal._status !== 'maintenance' && terminal.session_status !== 'closed') {
        return 'online';
    } else {
        return terminal._status; 
    }
}
  /**
   * Handles the "No Show" action by moving to the next client.
   */
  async noShow() {
    if (this.actionLoading) return;
    if(!this.currentTicket){
      return;
    }
    this.actionLoading = true;
  
    // Mark the current ticket as skipped
    await this.queueService.resolveAttendedQueue('skipped');
  
    // Reset the current client details
    this.currentClientDetails = null;
    this.resetInterface();
  
    // Update the upcoming ticket
    // this.updateUpcomingTicket();
  
    this.actionLoading = false;
    this.API.socketSend({event:'queue-events'})
    this.API.socketSend({event:'admin-dashboard-events'})
    this.API.sendFeedback('error', `Client has been removed from queue.`, 5000);
  }
  

  /**
   * Starts the timer to track the elapsed time for the current client.
   */
  calculateTimerProgress(): number {
    if (!this.timerStartTime) return 0;
    const elapsedTime = this.getServerTime().getTime() - this.timerStartTime;
    const maxTime = 15 * 60 * 1000; // 15 minutes in milliseconds
    return Math.max(0, 100 - (elapsedTime / maxTime * 100));
  }

  // Update startTimer method to include progress calculation
  private startTimer(): void {
    this.timerStartTime = this.getServerTime().getTime();
    this.timerInterval = setInterval(() => {
      if (this.timerStartTime) {
        const elapsedTime =this.getServerTime().getTime() - this.timerStartTime;
        const hours = Math.floor(elapsedTime / 3600000);
        const minutes = Math.floor((elapsedTime % 3600000) / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        this.timer = `${this.padZero(hours)}:${this.padZero(minutes)}:${this.padZero(seconds)}`;
        this.timerProgress = this.calculateTimerProgress();
      }
    }, 1000);
  }

  
  /**
   * Stops the timer and resets the timer state.
   */
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timer = '00:00:00';
    this.timerStartTime = null;
  }
  

  /**
   * Pads a number with a leading zero if it's less than 10.
   * @param num The number to pad.
   * @returns A string representation of the number with at least two digits.
   */
  private padZero(num: number): string {
    return num.toString().padStart(2, '0');
  }

  /**
   * Updates the current date displayed in the component.
   */
  private updateCurrentDate(): void {
    const now = this.getServerTime();
    this.currentDate = now.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long', // Full month name
      day: 'numeric', // Day as a number
    });
  }

  /**
   * Clears all active intervals to prevent memory leaks.
   */
  private clearIntervals(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.dateInterval) {
      clearInterval(this.dateInterval);
      this.dateInterval = null;
    }
    if(this.statusInterval){
      clearInterval(this.statusInterval);
    }
  }

  /**
   * Resets the state of all action buttons to their default values.
   */
  private resetActionButtons(): void {
    this.isNextClientActive = true;
    this.isClientDoneActive = false;
    this.isCallNumberActive = false;
    this.isManualSelectActive = true;
    this.isReturnTopActive = false;
    this.isReturnBottomActive = false;
  }
}
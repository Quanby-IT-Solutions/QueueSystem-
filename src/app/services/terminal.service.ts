import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { DivisionService } from './division.service';
import { BehaviorSubject } from 'rxjs';
import { QueueService } from './queue.service';
import { LogsService } from './logs.service';


interface Terminal{
  id:string;
  division_id:string;
  number:string;
  get status():string;   
  _status:string;  
  last_active?:string;
  attendant?:string;
  specific?:string;
}
@Injectable({
  providedIn: 'root'
})
export class TerminalService {

 constructor(
  private logService:LogsService,
  private queueService:QueueService,
  private API:UswagonCoreService,private auth:UswagonAuthService, private divisionService:DivisionService) { }

// private terminalsSubject = new BehaviorSubject<Terminal[]>([]);
// public terminals$ = this.terminalsSubject.asObservable();

listenToTerminalUpdates(){
  this.API.addSocketListener('live-terminal-listener', (message)=>{
    if(message.division != this.divisionService.selectedDivision?.id) return;
  });
}

updateMaintenance(){
  this.API.socketSend({
    event: 'terminal-maintenance',
    division: this.divisionService.selectedDivision?.id
  })
}

async addTerminal(division_id:string){
  const id = this.API.createUniqueID32();
  const response = await this.API.create({
    tables: 'terminals',
    values:{
      id:id,
      division_id:division_id,
      status:'available'
    }  
  });

  if(!response.success){
    throw new Error(response.output);
  }
  this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'terminal-events'})
  this.API.socketSend({event:'admin-dashboard-events'})
  this.logService.pushLog('new-terminal', 'added a terminal');
}

async updateTerminalStatus(id:string, status: 'available'|'maintenance'){
  const response = await this.API.update({
    tables: 'terminals',
    values:{
      status:status
    }  ,
    conditions: `WHERE id = '${id}'`
  });

  if(!response.success){
    throw new Error('Unable to add terminal');
  }
  this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'terminal-events'})
  this.API.socketSend({event:'admin-dashboard-events'})
  this.logService.pushLog('update-terminal', 'updated a terminal');
}

async setTerminalClient(id:string, clientType?: string){
  const response = await this.API.update({
    tables: 'terminals',
    values:{
      specific:clientType
    }  ,
    conditions: `WHERE id = '${id}'`
  });

  if(!response.success){
    throw new Error('Unable to set terminal client');
  }
  this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'terminal-events'})
  this.API.socketSend({event:'admin-dashboard-events'})
  this.logService.pushLog('set-client-terminal', 'set client to a terminal');
}

async deleteTerminal(id:string){
  
  const response = await this.API.delete({
    tables: 'terminals',
    conditions: `WHERE id = '${id}'`
  });

  if(!response.success){
    throw new Error('Unable to delete terminal');
  }
  this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'terminal-events'})
  this.API.socketSend({event:'admin-dashboard-events'})
  this.logService.pushLog('delete-terminal', 'deleted a terminal');

}

 async getAllTerminals() : Promise<Terminal[]>{
  const response = await this.API.read({
    selectors: ['divisions.name as division,latest_session.last_active as last_active ,latest_session.status as session_status, desk_attendants.fullname as attendant, terminals.*'],
    tables: 'terminals',
    conditions: `
      LEFT JOIN divisions ON divisions.id = terminals.division_id
      LEFT JOIN terminal_sessions ON terminal_sessions.terminal_id = terminals.id 
      LEFT JOIN (
        SELECT id, status,last_active ,ROW_NUMBER() OVER (PARTITION BY terminal_id ORDER BY last_active DESC) AS index FROM terminal_sessions
      ) AS latest_session ON terminal_sessions.id = latest_session.id 
      LEFT JOIN desk_attendants ON terminal_sessions.attendant_id = desk_attendants.id
      WHERE terminals.division_id = '${this.divisionService.selectedDivision?.id}' 
      AND (index =1 OR index IS NULL)
      GROUP BY terminals.id, divisions.id, terminal_sessions.terminal_id,desk_attendants.id, latest_session.last_active, latest_session.status
      ORDER BY terminals.number ASC 
      `});

   
    if(response.success){
      
      const seen = new Set<any>();
      response.output =response.output.filter((item:any) => {
          if (seen.has(item.id)) {
              return false; // Skip duplicate
          }
          seen.add(item.id); // Mark as seen
          return true; // Keep first occurrence
      });
      for(let i = 0 ; i < response.output.length; i++){
        response.output[i]._status = response.output[i].status;
        const now =  new Date(await this.API.serverTime())
        response.output[i] = {
          ...response.output[i],
          get status():string { 
            const lastActive = new Date(this.last_active);
            const diffInMinutes = (now.getTime() - lastActive.getTime()) / 60000; 
    
            if (diffInMinutes < 1.5 && this._status !== 'maintenance' && this.session_status !== 'closed') {
                return 'online';
            } else {
                return this._status; // Return the default status if not online
            }
          }
        }
        response.output[i].number = i+1;
      }
      return response.output;
    }else{

      throw new Error('Unable to load terminals');
    }
  }


  async startTerminalSession(terminal_id:string){
    const lastSession = await this.getActiveSession();
    if(lastSession){
      const closeResponse = await this.API.update({
        tables: 'terminal_sessions',
        values:{
          status: 'closed'
        }  ,
        conditions: `WHERE id = '${lastSession.id}'`
      });
    
      if(!closeResponse.success){
        throw new Error('Unable to update terminal session');
      }
    }
    const id = this.API.createUniqueID32();
    const response = await this.API.create({
      tables: 'terminal_sessions',
      values:{
        id:id,
        terminal_id: terminal_id,
        attendant_id:this.auth.getUser().id,
        start_time: await this.API.serverTime(),
        last_active: await this.API.serverTime()
      }  
    });
 
  
    if(!response.success){
      throw new Error('Unable to start terminal session');
    }else{
      this.logService.pushLog('opened-terminal', `started a terminal session.`)
      this.API.socketSend({event:'queue-events'})
      this.API.socketSend({event:'terminal-events'})
      this.API.socketSend({event:'admin-dashboard-events'})
      return id;
    }
  }
  
  async getActiveSession(){ 
    const response = await this.API.read({
      selectors: ['terminal_sessions.*'],
      tables: 'terminal_sessions',
      conditions: `WHERE terminal_sessions.attendant_id = '${this.auth.getUser().id}' AND terminal_sessions.status != 'closed' 
        ORDER BY last_active DESC
      `
    });

    if(!response.success){
      throw new Error('Unable to get terminal session');
    }


    if(response.output.length <= 0){
      return null;
    }else{
      const lastSession = response.output[0];
      const now = new Date(await this.API.serverTime()); 
      const lastActive = new Date(lastSession.last_active);
 
      const diffInMinutes = (now.getTime() - lastActive.getTime()) / 60000; 
      if (diffInMinutes <= 1.5) {
        return lastSession; 
      }else{
        return null;
      }
    }
  }

  async getActiveUsers():Promise<string[]>{ 
    const response = await this.API.read({
      selectors: ['attendant_id,last_active'],
      tables: 'terminal_sessions',
      conditions: `WHERE terminal_sessions.status != 'closed' 
        ORDER BY last_active DESC
      `
    });

    if(!response.success){
      throw new Error('Unable to get terminal session');
    }


    if(response.output.length <= 0){
      return [];
    }else{
      const activeUsers = [];
      for(let i=0; i<response.output.length; i++){
        const lastSession = response.output[i];
        const now = new Date(await this.API.serverTime()); 
        const lastActive = new Date(lastSession.last_active);
  
        const diffInMinutes = (now.getTime() - lastActive.getTime()) / 60000; 
        if (diffInMinutes <= 1.5) {
          activeUsers.push(response.output[i].attendant_id); 
        }
      }
      return activeUsers;
    }
  }
  statusInterval:any;

  async refreshTerminalStatus(terminal_session:string){
    this.statusInterval = setInterval(async()=>{
      const response = await this.API.update({
        tables: 'terminal_sessions',
        values:{
          last_active: await this.API.serverTime()
        }  ,
        conditions: `WHERE id = '${terminal_session}'`
      });
    
      if(!response.success){
        alert(response.output);
        throw new Error('Unable to update terminal session');
      }
      this.API.socketSend({event:'queue-events'})
      this.API.socketSend({event:'terminal-events'})
      // this.API.socketSend({event:'admin-dashboard-events'})
    },1000)
  }

  async terminateTerminalSession(){
    const lastSession = await this.getActiveSession();
    if(lastSession){
      const closeResponse = await this.API.update({
        tables: 'terminal_sessions',
        values:{
          status: 'closed'
        }  ,
        conditions: `WHERE id = '${lastSession.id}'`
      });
      // alert(lastSession.id);
      if(!closeResponse.success){
        throw new Error('Unable to update terminal session');
      }
      this.logService.pushLog('closed-terminal', `terminated a terminal session.`)
    }
    this.queueService.resolveAttendedQueue('return');
    clearInterval(this.statusInterval);
  }
}

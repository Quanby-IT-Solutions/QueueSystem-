import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { DivisionService } from './division.service';
import { BehaviorSubject } from 'rxjs';
import { QueueService } from './queue.service';


interface Terminal{
  id:string;
  division_id:string;
  number:string;
  status:string;  
  last_active?:string;
  attendant?:string;
}
@Injectable({
  providedIn: 'root'
})
export class TerminalService {

 constructor(
  private queueService:QueueService,
  private API:UswagonCoreService,private auth:UswagonAuthService, private divisionService:DivisionService) { }

// private terminalsSubject = new BehaviorSubject<Terminal[]>([]);
// public terminals$ = this.terminalsSubject.asObservable();

listenToTerminalUpdates(){
  this.API.addSocketListener('live-terminal-listener', (message)=>{
    if(message.division != this.divisionService.selectedDivision?.id) return;

    if(message.event == 'terminal-maintenance'){
      // this.getAllTerminals();
    }
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
    throw new Error('Unable to add terminal');
  }
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
}
async deleteTerminal(id:string){
  const response = await this.API.delete({
    tables: 'terminals',
    conditions: `WHERE id = '${id}'`
  });

  if(!response.success){
    throw new Error('Unable to delete terminal');
  }
}

 async getAllTerminals(){
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
          ORDER BY terminals.number ASC ,session_status DESC
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
      let i = 1;
      for(let session of response.output){
        const now = new Date(); 
        const lastActive = new Date(session.last_active);
        const diffInMinutes = (now.getTime() - lastActive.getTime()) / 60000; 
        if(diffInMinutes < 1.5 && session.status != 'maintenance' && session.session_status != 'closed'){
          session.status = 'online';
        }
        session.number = i;
        i +=1;
      }
      console.log(response.output);
      return response.output;
    }else{
      alert(response.output);
      throw new Error('Unable to fetch terminals');
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
    const now = new Date();
    const response = await this.API.create({
      tables: 'terminal_sessions',
      values:{
        id:id,
        terminal_id: terminal_id,
        attendant_id:this.auth.getUser().id,
        start_time: new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS'),
        last_active: new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS')
      }  
    });
 
  
    if(!response.success){
      throw new Error('Unable to start terminal session');
    }else{
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
      const now = new Date(); 
      const lastActive = new Date(lastSession.last_active);
 
      const diffInMinutes = (now.getTime() - lastActive.getTime()) / 60000; 
      if (diffInMinutes <= 1.5) {
        return lastSession; 
      }else{
        return null;
      }
    }
  }

  statusInterval:any;

  async refreshTerminalStatus(terminal_session:string){
    this.statusInterval = setInterval(async()=>{
      const now = new Date();
      const response = await this.API.update({
        tables: 'terminal_sessions',
        values:{
          last_active: new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS')
        }  ,
        conditions: `WHERE id = '${terminal_session}'`
      });
    
      if(!response.success){
        alert(response.output);
        throw new Error('Unable to update terminal session');
      }
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
    }
    this.queueService.resolveAttendedQueue('return');
    clearInterval(this.statusInterval);
  }
}

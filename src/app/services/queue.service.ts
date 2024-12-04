
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { KioskService } from './kiosk.service';
import { DivisionService } from './division.service';
import { DatePipe } from '@angular/common';
import { LogsService } from './logs.service';
import { FormatService } from './format.service';
import { Format } from '../features/admin-layout/format-management/types/format.types';



interface Queue{
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

interface AttendedQueue{
  id:string;
  desk_id:string;
  queue_id:string;
  attended_on:string;
  finished_on?:string;
  status:string;
  terminal_id?:string;
  queue?:Queue;
}

@Injectable({
  providedIn: 'root'
})
export class QueueService  {

  constructor(
    private formatService:FormatService,
    private API:UswagonCoreService,private auth:UswagonAuthService, private logService:LogsService ,
    private divisionService:DivisionService,
    private kioskService:KioskService) {}


  private queueNumber:{[key:string]:number} = {
    'priority': 0,
    'regular': 0,
  };
  public queue:Queue[]=[];
  public allQueue:Queue[]= [];
  public allTodayQueue:Queue[]= [];
  public attendedQueues:AttendedQueue[]= [];
  private takenQueue:string[]= [];

  private lastTimestamp:number = new Date().getTime();
  public attendedQueue?:AttendedQueue;
  private queueSubject = new BehaviorSubject<Queue[]>([]);
  public queue$ = this.queueSubject.asObservable();


  // Socket Events
  listenToQueue(){
    this.API.addSocketListener('live-queue-events-listener', (message)=>{
      if(message.division!= this.divisionService.selectedDivision!.id) return;
      if(message.event =='take-from-queue'){
        this.takenQueue.push(message.queue_id);
        this.getTodayQueues();
      }
      if(message.event =='resolve-taken-queue'){
        this.takenQueue  = this.takenQueue.filter(queue=>queue != message.queue_id);
        this.getTodayQueues();
      }
      if(message.event =='update-queue'){
        this.getTodayQueues();
      }        
    });
  }


  private updateQueue(type:string , division:string){
    this.API.socketSend({
      event: 'update-queue',
      division:division
    });
    this.queueNumber[type]+=1;
  }

  private takeFromQueue(id?:string){
    const availableQueue = this.queue.filter(queue => !this.takenQueue.includes(queue.id))
   if(id){
    const queue = availableQueue.find(queue=>queue.id ==id);
    if(queue == undefined) return undefined;
    this.takenQueue.push(queue.id);
    this.API.socketSend({
      event: 'take-from-queue',
      division:queue.division_id,
      queue_id:queue.id,
    });
    return queue;
   }else{
    const queue = availableQueue.shift();
    if(queue == undefined) return undefined;
    this.takenQueue.push(queue.id);
    this.API.socketSend({
      event: 'take-from-queue',
      division:queue.division_id,
      queue_id:queue.id,
    });
    return queue;
   }
  }

  private resolveTakenQueue(queue_id:any){
    this.takenQueue = this.takenQueue.filter(id=>id != queue_id);
    this.API.socketSend({
      event: 'resolve-taken-queue',
      division:this.divisionService.selectedDivision!.id,
      queue_id:queue_id,
    });
  }

  // Managing queue
  async addToQueue(
    info:{department_id?:string,
          fullname:string, 
          type:string,
          tag:string,
          gender:'male'|'female'|'other'
          student_id?:string,
          services:string[],
        })
  {
    const id = this.API.createUniqueID32();
    const  now =  new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    this.lastTimestamp = now.getTime();
    await this.getTodayQueues(true);
    // this.takeQueueNumber(info.type,this.kioskService.kiosk?.division_id!);
    let collision = true;
    while(collision){
      try{
          const response = await this.API.create({
            tables: 'queue',
            values:{
              id: id,
              division_id: this.kioskService.kiosk?.division_id,
              kiosk_id:this.kioskService.kiosk?.id,
              department_id: info.department_id,
              fullname: info.fullname,
              number: this.queueNumber[info.type],
              type: info.type,
              gender: info.gender,
              services:  info.services.join(', '),
              status:'waiting',
              timestamp: new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS'),
              student_id: info.student_id,
              collision:  `${formattedDate}:${this.kioskService.kiosk?.id}:${info.type}-${this.queueNumber[info.type]}` ,
            }
          });
          if(!response.success){
            // this.returnQueueNumber(info.type,this.kioskService.kiosk?.division_id!);
            throw new Error('Something went wrong.');
          }else{
            collision =false;
            const lastNumber =this.queueNumber[info.type];
            this.updateQueue(info.type,this.kioskService.kiosk?.division_id!);
            return lastNumber;
          }
        }catch(e:any){
          if(e.message.includes('Server Error')){
            throw new Error('Something went wrong')
          }
          this.queueNumber[info.type] +=1
        }
    }
    const lastNumber = this.queueNumber[info.type];
    return lastNumber;
    
  }

  async addQueueToAttended(queue:Queue){
    const user = this.auth.getUser();
    try{
      const sessionResponse = await this.API.read({
        selectors: ['id'],
        tables: 'terminal_sessions',
        conditions: `WHERE attendant_id = '${user.id}' ORDER BY last_active DESC`
      });
  
      if(!sessionResponse.success)throw new Error(sessionResponse.output);
      if(sessionResponse.output.length == 0) throw new Error('Session not found, something is wrong.');
      const session = sessionResponse.output[0];
      const updateResponse = await this.API.update({
        tables: 'queue',
        values:{
          status: 'taken',
        },
        conditions:`WHERE id = '${queue.id}'`
      });
      if(!updateResponse.success) throw new Error(updateResponse.output);
      const now = new Date();
      const attended = {
        id:this.API.createUniqueID32(),
        queue_id :queue.id,
        desk_id: session.id,
        attended_on:new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS'),
        finished_on: undefined,
        status:'ongoing',
      } as AttendedQueue;
      const createResponse = await this.API.create({
        tables:'attended_queue',
        values:attended
      });
      attended.queue = queue; 
      this.attendedQueue = attended;
      if(!createResponse.success) throw new Error(createResponse.output);
    }catch(e:any){
      throw new Error(e.message);
    }
  }
  
  async resolveAttendedQueue(remark:'finished'|'skipped'|'bottom'|'return'){
    const now  = new Date();

    try{
      if(this.attendedQueue){
        if(remark=='bottom'){
          const createResponse = await this.API.create({
            tables: 'queue',
            values:{
              id: this.API.createUniqueID32(),
              division_id: this.attendedQueue.queue?.division_id,
              kiosk_id: this.attendedQueue.queue?.kiosk_id,
              department_id:  this.attendedQueue.queue?.department_id,
              fullname:  this.attendedQueue.queue?.fullname,
              number:  this.attendedQueue.queue?.number,
              type:  this.attendedQueue.queue?.type,
              gender:  this.attendedQueue.queue?.gender,
              services:  this.attendedQueue.queue?.services,
              status:'bottom',
              timestamp: new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS'),
              student_id:  this.attendedQueue.queue?.student_id,
              collision: this.attendedQueue.queue?.collision?.split('>')[0] + ">"+ now.getTime(),
            }
          });
          if(!createResponse.success){
            throw new Error(createResponse.output);
          }this.logService.pushLog('transaction-bottom',`put a transaction to bottom of queue.`);
        } 
        if(remark=='return'){
          const createResponse = await this.API.create({
            tables: 'queue',
            values:{
              id: this.API.createUniqueID32(),
              division_id: this.attendedQueue.queue?.division_id,
              kiosk_id: this.attendedQueue.queue?.kiosk_id,
              department_id:  this.attendedQueue.queue?.department_id,
              fullname:  this.attendedQueue.queue?.fullname,
              number:  this.attendedQueue.queue?.number,
              type:  this.attendedQueue.queue?.type,
              gender:  this.attendedQueue.queue?.gender,
              services:  this.attendedQueue.queue?.services,
              status:'waiting',
              timestamp: this.attendedQueue.queue?.timestamp,
              student_id:  this.attendedQueue.queue?.student_id,
              collision: this.attendedQueue.queue?.collision?.split('>')[0] + ">"+ now.getTime(),
            }
          });
          if(!createResponse.success){
    
            throw new Error(createResponse.output);
          }

          this.logService.pushLog('transaction-returned',`returned transaction.`);
        }
        const updateResponse = await this.API.update({
          tables: 'attended_queue',
          values:{
            finished_on: remark == 'skipped' ? undefined : new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS'),
            status: remark,
          },
          conditions:`WHERE id = '${this.attendedQueue.id}'`
        });
   
        if(!updateResponse.success) throw new Error(updateResponse.output);
        this.resolveTakenQueue(this.attendedQueue.id);
        this.attendedQueue = undefined;
        await this.getTodayQueues();

      }
    }catch(e:any){

      throw new Error('Something went wrong. Please try again');
    }
  }
  async getNextPriorityQueue(): Promise<Queue | undefined> {
    try {
      // Get priority tickets that are waiting or at bottom
      const priorityTickets = this.queue.filter(
        ticket => ticket.type === 'priority' && 
        (ticket.status === 'waiting' || ticket.status === 'bottom')
      );

      if (priorityTickets.length === 0) return undefined;

      const nextPriorityTicket = priorityTickets[0];
      // Move this priority ticket to front of queue
      this.queue = [
        nextPriorityTicket,
        ...this.queue.filter(t => t.id !== nextPriorityTicket.id)
      ];
      
      return this.nextQueue();
    } catch (error) {
      console.error('Error getting priority queue:', error);
      return undefined;
    }
  }

  async takeFromQueueByType(type: string): Promise<Queue | undefined> {
    const availableQueue = this.queue.filter(queue => !this.takenQueue.includes(queue.id))
    const targetQueue = availableQueue.find(q => 
      q.type === type && 
      (q.status === 'waiting' || q.status === 'bottom')
    );

    if (!targetQueue) return undefined;

    // Remove the target queue from the main queue
    this.queue = availableQueue.filter(q => q.id !== targetQueue.id);
    this.takenQueue.push(targetQueue.id);
    
    // Send socket event
    this.API.socketSend({
      event: 'take-from-queue',
      division: targetQueue.division_id,
      queue_id: targetQueue.id,
    });

    return targetQueue;
  }

  

  // Modify your nextQueue method to accept a type parameter
  async nextQueue(type?: string): Promise<Queue | undefined> {
    try {
      if (this.queue.length <= 0) return;

      let nextQueue: Queue | undefined;
    
      let success = false;
      while(!success){
        if (type) {
          nextQueue = await this.takeFromQueueByType(type);
        } else {
          nextQueue = this.takeFromQueue();
        }

        if (!nextQueue) {
          success = true;
          return undefined;
        }
        try{
          await this.addQueueToAttended(nextQueue);
          this.resolveTakenQueue(nextQueue.id);
          await this.getTodayQueues();
          success = true
        }catch(e:any){
          if(e.message.includes('Server Error')) throw new Error('Something went wrong');
        }
      }
      
    
      
      return nextQueue;
    } catch (e) {
      throw new Error('Something went wrong.');
    }
  }

  async manualSelect(queue:Queue): Promise<Queue | undefined> {
    try {
      if (this.queue.length <= 0) return;

      let nextQueue: Queue | undefined;
    
      let success = false;
      while(!success){
        nextQueue = this.takeFromQueue(queue.id);

        if (!nextQueue) {
          success = true;
          return undefined;
        }
        try{
          await this.addQueueToAttended(nextQueue);
          this.resolveTakenQueue(nextQueue.id);
          await this.getTodayQueues();
          success = true
        }catch(e:any){
          if(e.message.includes('Server Error')) throw new Error('Something went wrong');
        }
      }
      
    
      
      return nextQueue;
    } catch (e) {
      throw new Error('Something went wrong.');
    }
  }

  // Fetching of QUEUES
  async getAllQueues(division?:string){
    const divisionCondition = division? `WHERE division_id = '${division}'` :'';
    const response = await this.API.read({
      selectors: ['*'],
      tables: 'queue',
      conditions: divisionCondition
    });
    if(response.success){
      this.allQueue = response.output;
      return response.output;
    }else{
      
      throw new Error('Unable to fetch queue');
    }
  }

  async getTodayQueues(all:boolean =false){
    const filter = all ? '':`AND (status = 'waiting' OR status ='bottom')`
    const response = await this.API.read({
      selectors: ['*'],
      tables: 'queue',
      conditions: `WHERE division_id = '${this.divisionService.selectedDivision!.id}' AND CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE) ${filter} ORDER BY timestamp DESC` 
    });
    if(response.success){
      const queue = response.output as Queue[];
      const formats:Format[] =  await this.formatService.getFrom(this.divisionService.selectedDivision!.id);
      const formatMap:{[key:string]:Format} = {
        'priority':{
          id:'0',
          name: 'priority',
          prefix:'P'
        },
        'regular':{
          id:'0',
          name: 'regular',
          prefix:'R'
        },
      };
      if(all){
        this.queueNumber['priority'] = queue.filter(queue=> queue.type == 'priority' && queue.status == 'waiting').length + 1;
        this.queueNumber['regular'] = queue.filter(queue=> queue.type == 'regular' && queue.status == 'waiting').length + 1;
        if(formats.length > 0){
          for(let format of formats){
            this.queueNumber[format.id!] = queue.filter(queue=> queue.type == format.id && queue.status == 'waiting').length + 1;
            formatMap[format.id!] = format;
          }
        }
      }else{
        if(formats.length > 0){
          for(let format of formats){
            formatMap[format.id!] = format;
          }
        }
      }


     

      const sortedQueue = queue.sort((a,b)=>{ 

        if(a.status == 'bottom' && b.status =='bottom'){
          return new Date( a.timestamp).getTime() - new Date( b.timestamp).getTime();
        }
       
        return new Date( a.timestamp).getTime() - new Date( b.timestamp).getTime();
      });
      const filteredQueue = sortedQueue.filter(queue=>!this.takenQueue.includes(queue.id));
      
      for(let i = 0; i < filteredQueue.length;i++){
        filteredQueue[i].tag = formatMap[filteredQueue[i].type].prefix
        if(filteredQueue[i].type != 'priority' && filteredQueue[i].type != 'regular'){
          filteredQueue[i].metaType = formatMap[filteredQueue[i].type].name;
        }
      }
      this.queue = filteredQueue;
      this.queueSubject.next(filteredQueue);

      return this.queue;
    }else{
      throw new Error('Unable to fetch queue');
    }
  }
  

  async getAllTodayQueues(all:boolean =false){
    const filter = all ? '':`AND (status = 'waiting' OR status ='bottom')`
    const response = await this.API.read({
      selectors: ['*'],
      tables: 'queue',
      conditions: `WHERE  CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE) ${filter} ORDER BY timestamp DESC` 
    });
    if(response.success){
      const queue = response.output as Queue[];
      const formats:Format[] =  await this.formatService.getFrom(this.divisionService.selectedDivision!.id);
      const formatMap:{[key:string]:Format} = {
        'priority':{
          id:'0',
          name: 'priority',
          prefix:'P'
        },
        'regular':{
          id:'0',
          name: 'regular',
          prefix:'R'
        },
      };

      if(all){
        this.queueNumber['priority'] = queue.filter(queue=> queue.type == 'priority' && queue.status == 'waiting').length + 1;
        this.queueNumber['regular'] = queue.filter(queue=> queue.type == 'regular' && queue.status == 'waiting').length + 1;
        if(formats.length > 0){
          for(let format of formats){
            this.queueNumber[format.id!] = queue.filter(queue=> queue.type == format.id && queue.status == 'waiting').length + 1;
            formatMap[format.id!] = format;
          }
        }
      }else{
        if(formats.length > 0){
          for(let format of formats){
            formatMap[format.id!] = format;
          }
        }
      }
    

      const sortedQueue = queue.sort((a,b)=>{ 

        if(a.status == 'bottom' && b.status =='bottom'){
          return new Date( a.timestamp).getTime() - new Date( b.timestamp).getTime();
        }
       
        return new Date( a.timestamp).getTime() - new Date( b.timestamp).getTime();
      });
      const filteredQueue = sortedQueue.filter(queue=>!this.takenQueue.includes(queue.id));
      for(let i = 0; i < filteredQueue.length;i++){
        filteredQueue[i].tag = formatMap[filteredQueue[i].type].prefix
        if(filteredQueue[i].type != 'priority' && filteredQueue[i].type != 'regular'){
          filteredQueue[i].metaType = formatMap[filteredQueue[i].type].name;
        }
      }
      this.allTodayQueue = filteredQueue;
      return filteredQueue;
    }else{
      throw new Error('Unable to fetch queue');
    }
  }
  
  
  async geAllAttendedQueues(){
    try{
      const response = await this.API.read({
        selectors: ['terminal_sessions.*,queue.*,attended_queue.* '],
        tables: 'attended_queue, queue,terminal_sessions',
        conditions: `
          WHERE attended_queue.queue_id = queue.id
          AND terminal_sessions.id = attended_queue.desk_id
          ORDER BY timestamp DESC
        `
      });
      if(response.success){
        this.attendedQueues = [];
        for(let attended of response.output){
          this.attendedQueues.push({...attended, queue: {...attended, id: attended.queue_id}})
        }
        
        return this.attendedQueues;
      }else{
        throw new Error(response.output);
      }
    }catch(e:any){
      throw new Error('Something went wrong.');
    }
  }

  async getActiveAttendedQueues(){
    try{
      const response = await this.API.read({
        selectors: ['terminal_sessions.*,queue.*,attended_queue.* '],
        tables: 'attended_queue, queue,terminal_sessions',
        conditions: `
          WHERE attended_queue.queue_id = queue.id
          AND terminal_sessions.id = attended_queue.desk_id
          AND attended_queue.status = 'ongoing'
          ORDER BY timestamp DESC
        `
      });
      if(response.success){
        this.attendedQueues = [];
        let formats = await this.formatService.getFrom(this.divisionService.selectedDivision!.id);
        if(formats.length <=0){
          formats = [
            {id:'priority',name:'priority',prefix:'P'},
            {id:'regular',name:'regular',prefix:'R'},
          ]
        }
        for(let attended of response.output){
          const format  = formats.find((_format:any)=> _format.id == attended.type)!;
          if(!format) continue;
          this.attendedQueues.push({...attended, queue: {...attended, id: attended.queue_id, type:format.id, tag:format.prefix, metaType: format.name}})
        }
        return this.attendedQueues;
      }else{
        throw new Error(response.output);
      }
    }catch(e:any){
      throw new Error(e.message);
    }
  }


  async getQueueOnDesk(){
    const user = this.auth.getUser();

    try{
      const response = await this.API.read({
        selectors: ['queue.status as queue_status,queue.*, attended_queue.*'],
        tables: 'attended_queue, queue, terminal_sessions',
        conditions: `
          WHERE attended_queue.queue_id = queue.id AND queue.division_id = '${this.divisionService.selectedDivision?.id}' 
          AND terminal_sessions.id = attended_queue.desk_id
          AND terminal_sessions.attendant_id = '${user.id}'  AND attended_queue.status = 'ongoing' ORDER BY attended_on DESC
        `
      });
      if(response.success){
        if(response.output.length> 0){
          let format;
          if(response.output[0].type != 'priority' || response.output[0].type != 'regular'){
            format = await this.formatService.get(response.output[0].type);
          }else{
            format = {
              id: '0',
              name: response.output[0].type,
              prefix: response.output[0].type == 'priority'? 'P':'R'
            }
          }
          if(!format){
            this.attendedQueue = undefined;
            return {
              attendedQueue:this.attendedQueue,
              queue:undefined
            };
          }
          this.attendedQueue  = {
            ...response.output[0],
            queue:{
              id:response.output[0].queue_id,
              status:response.output[0].queue_status,
              ...response.output[0],
              tag: format.prefix, 
              type:format.id,
              metaType: format.name,
            }
          }

          return {
            attendedQueue:this.attendedQueue,
            queue: {
              id:response.output[0].queue_id,
              status:response.output[0].queue_status,
              ...response.output[0],
              tag: format.prefix, 
              type:format.id,
              metaType: format.name,
            } as Queue
          };
        }else{
          this.attendedQueue = undefined;
          return {
            attendedQueue:this.attendedQueue,
            queue:undefined
          };
        }
      }else{
        throw new Error(response.output);
      }
    }catch(e:any){
      alert(e.message);
      throw new Error('Something went wrong.');
    }
  }

  async getLastQueueOnDesk(){
    const user = this.auth.getUser();
    try{
      const response = await this.API.read({
        selectors: ['queue.status as queue_status,queue.*, attended_queue.*'],
        tables: 'attended_queue, queue, terminal_sessions',
        conditions: `
          WHERE attended_queue.queue_id = queue.id AND queue.division_id = '${this.divisionService.selectedDivision?.id}' 
          AND terminal_sessions.attendant_id = '${user.id}'  AND attended_queue.status != 'ongoing' 
          ORDER BY attended_queue.finished_on DESC
        `
      });
      if(response.success){
        if(response.output.length> 0){
          let format;
          if(response.output[0].type != 'priority' || response.output[0].type != 'regular'){
            format = await this.formatService.get(response.output[0].type);
          }else{
            format = {
              id: '0',
              name: response.output[0].type,
              prefix: response.output[0].type == 'priority'? 'P':'R'
            }
          }
          if(!format){
            return undefined;
          }
          return  {
            id:response.output[0].queue_id,
            status:response.output[0].queue_status,
            ...response.output[0],
            tag: format.prefix, 
            type:format.id,
            metaType: format.name,
          } as Queue
        }else{
          return undefined;
        }
      }else{
        throw new Error(response.output);
      }
    }catch(e:any){
      alert(e.message);
      throw new Error('Something went wrong.');
    }
  }

  

}

import { Injectable, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { KioskService } from './kiosk.service';
import { DivisionService } from './division.service';
import { DatePipe } from '@angular/common';



interface Queue{
  id:string;
  division_id:string;
  number:number;
  status:string;
  timestamp:string;
  type:'regular'|'priority';
  fullname:string;
  services:string;
  department_id?:string;
  kiosk_id:string;
  gender:'male'|'female'|'other';
  student_id?:string;
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

  constructor(private API:UswagonCoreService,private auth:UswagonAuthService, 
    private divisionService:DivisionService,
    private kioskService:KioskService) {}


  private lastRegularQueueNumber:number = 0;
  private lastPriorityQueueNumber:number = 0;
  public queue:Queue[]=[];
  public allQueue:Queue[]= [];
  public allTodayQueue:Queue[]= [];
  public attendedQueues:AttendedQueue[]= [];
  private takenQueue:string[]= [];
  public attendedQueue?:AttendedQueue;
  private queueSubject = new BehaviorSubject<Queue[]>([]);
  public queue$ = this.queueSubject.asObservable();


  // Socket Events
  listenToQueue(){
    this.API.addSocketListener('live-queue-events-listener', (message)=>{
      if(message.division!= this.divisionService.selectedDivision!.id) return;

      if(message.event =='queue-counter' ){
        this.lastRegularQueueNumber = message.lastRegularQueueNumber as number;
        this.lastPriorityQueueNumber = message.lastPriorityQueueNumber as number;
      }
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

  private incrementQueueNumber(type:'regular'|'priority',division:string){
    if(type == 'regular'){
      this.lastRegularQueueNumber += 1;
    }else{
      this.lastPriorityQueueNumber += 1;
    }
    this.API.socketSend({
      event: 'queue-counter',
      division:division,
      lastRegularQueueNumber: this.lastRegularQueueNumber,
      lastPriorityQueueNumber: this.lastPriorityQueueNumber
    });
  }

  private decrementQueueNumber(type:'regular'|'priority',division:string){
    if(type == 'regular'){
      this.lastRegularQueueNumber -= 1;
    }else{
      this.lastPriorityQueueNumber -= 1;
    }
    this.API.socketSend({
      event: 'queue-counter',
      division:division,
      lastRegularQueueNumber: this.lastRegularQueueNumber,
      lastPriorityQueueNumber: this.lastPriorityQueueNumber
    });
  }

  private updateQueue(division:string){
    this.API.socketSend({
      event: 'update-queue',
      division:division
    });
  }

  private takeFromQueue(){
    const queue = this.queue.shift()!;
    this.takenQueue.push(queue.id);
    this.API.socketSend({
      event: 'take-from-queue',
      division:queue.division_id,
      queue_id:queue.id,
    });
    return queue;
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
          type:'regular'|'priority', 
          gender:'male'|'female'|'other'
          student_id?:string,
          services:string[],
        })
  {
    const id = this.API.createUniqueID32();
    const  now=  new Date();
    this.incrementQueueNumber(info.type,this.kioskService.kiosk?.division_id!);
    const response = await this.API.create({
      tables: 'queue',
      values:{
        id: id,
        division_id: this.kioskService.kiosk?.division_id,
        kiosk_id:this.kioskService.kiosk?.id,
        department_id: info.department_id,
        fullname: info.fullname,
        number: info.type == 'regular' ? this.lastRegularQueueNumber: this.lastPriorityQueueNumber,
        type: info.type,
        gender: info.gender,
        services:  info.services.join(', '),
        status:'waiting',
        timestamp: new DatePipe('en-US').transform(now, 'yyyy-MM-dd HH:mm:ss.SSSSSS'),
        student_id: info.student_id
      }
    });
  //  for(let service_id of info.services){
  //   const intent_id = this.API.createUniqueID32();
  //   // Add services
  //   const servicesResponse = await this.API.create({
  //     tables: 'client_intents',
  //     values:{
  //       id: intent_id,
  //       queue_id: id,
  //       service_id: service_id
  //     }
  //   });
  //   if(!servicesResponse.success){
  //     this.decrementQueueNumber(info.type,this.kioskService.kiosk?.division_id!);
  //     throw new Error('Something went wrong.')
  //   }
  //  }
    

    
    if(!response.success){
      this.decrementQueueNumber(info.type,this.kioskService.kiosk?.division_id!);
      throw new Error('Something went wrong.');
    }else{
      this.updateQueue(this.kioskService.kiosk?.division_id!);
      return info.type == 'regular' ?  this.lastRegularQueueNumber:this.lastPriorityQueueNumber;
    }
    
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
      throw new Error('Something went wrong. Please try again');
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
            }
          });
          if(!createResponse.success){
            throw new Error(createResponse.output);
          }
        } 
        if(remark=='return'){
          const updateResponse = await this.API.update({
            tables: 'queue',
            values:{
              status:'waiting',
            },
            conditions:`WHERE id = '${this.attendedQueue.queue_id}'`
          });
          if(!updateResponse.success){
            throw new Error(updateResponse.output);
          }
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
      alert(e.message);
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

  async takeFromQueueByType(type: 'priority' | 'regular'): Promise<Queue | undefined> {
    const targetQueue = this.queue.find(q => 
      q.type === type && 
      (q.status === 'waiting' || q.status === 'bottom')
    );

    if (!targetQueue) return undefined;

    // Remove the target queue from the main queue
    this.queue = this.queue.filter(q => q.id !== targetQueue.id);
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
  async nextQueue(type?: 'priority' | 'regular'): Promise<Queue | undefined> {
    try {
      if (this.queue.length <= 0) return;

      let nextQueue: Queue | undefined;
      
      if (type) {
        nextQueue = await this.takeFromQueueByType(type);
      } else {
        nextQueue = this.takeFromQueue();
      }

      if (!nextQueue) return undefined;

      await this.addQueueToAttended(nextQueue);
      this.resolveTakenQueue(nextQueue.id);
      await this.getTodayQueues();
      
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
      conditions: `WHERE division_id = '${this.divisionService.selectedDivision!.id}' AND timestamp::date = CURRENT_DATE ${filter} ORDER BY timestamp ASC` 
    });
    if(response.success){
      const queue = response.output as Queue[];
      this.lastPriorityQueueNumber =queue.filter(queue=> queue.type == 'priority').length;
      this.lastRegularQueueNumber =queue.filter(queue=> queue.type == 'regular').length;

      // const sortedQueue = queue.sort((a,b)=>{ 

      //   if(a.status == 'bottom' && b.status =='bottom'){
      //     return new Date( a.timestamp).getTime() - new Date( b.timestamp).getTime();
      //   }
      //   if (a.type === 'priority' && b.type === 'regular') {
      //     if(a.status == 'bottom'){
      //       return new Date( a.timestamp).getTime() - new Date( b.timestamp).getTime();
      //     }else{
      //       return -1
      //     }
      //   };
      //   if (a.type === 'regular' && b.type === 'priority') return 1;


      //   return new Date( a.timestamp).getTime() - new Date( b.timestamp).getTime();
      // });
      const filteredQueue = queue.filter(queue=>!this.takenQueue.includes(queue.id));
      console.log(filteredQueue);
  
      this.queueSubject.next(filteredQueue);

      this.queue = filteredQueue;
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
      conditions: `WHERE timestamp::date = CURRENT_DATE ${filter} ORDER BY timestamp ASC` 
    });
    if(response.success){
      const queue = response.output as Queue[];
      this.lastPriorityQueueNumber =queue.filter(queue=> queue.type == 'priority').length;
      this.lastRegularQueueNumber =queue.filter(queue=> queue.type == 'regular').length;

      // const sortedQueue = queue.sort((a,b)=>{ 

      //   if(a.status == 'bottom' && b.status =='bottom'){
      //     return new Date( a.timestamp).getTime() - new Date( b.timestamp).getTime();
      //   }
        // if (a.type === 'priority' && b.type === 'regular') {
        //   if(a.status == 'bottom'){
        //     return new Date( a.timestamp).getTime() - new Date( b.timestamp).getTime();
        //   }else{
        //     return -1
        //   }
        // };
        // if (a.type === 'regular' && b.type === 'priority') return 1;


        // return new Date( a.timestamp).getTime() - new Date( b.timestamp).getTime();
      // });
      const filteredQueue = queue.filter(queue=>!this.takenQueue.includes(queue.id));
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


  async getQueueOnDesk(){
    const user = this.auth.getUser();
    try{
      const response = await this.API.read({
        selectors: ['queue.status as queue_status,queue.*, attended_queue.*'],
        tables: 'attended_queue, queue, terminal_sessions',
        conditions: `
          WHERE attended_queue.queue_id = queue.id AND queue.division_id = '${this.divisionService.selectedDivision?.id}' 
          AND terminal_sessions.attendant_id = '${user.id}'  AND attended_queue.status = 'ongoing'
        `
      });
      if(response.success){
        if(response.output.length> 0){
          this.attendedQueue  = {
            ...response.output[0],
            queue:{
              id:response.output[0].queue_id,
              status:response.output[0].queue_status,
              ...response.output[0]
            }
          }
          response.output[0];
          return {
            attendedQueue:this.attendedQueue,
            queue: {
              id:response.output[0].queue_id,
              status:response.output[0].queue_status,
              ...response.output[0]
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
          return  {
            id:response.output[0].queue_id,
            status:response.output[0].queue_statusm,
            ...response.output[0]
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
import { Injectable } from '@angular/core';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { DivisionService } from './division.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { every, firstValueFrom } from 'rxjs';
import { LogsService } from './logs.service';
import { CrudService } from './crud.service';


export interface Kiosk{
  id?:string;
  number?:number;
  division_id?:string;
  printer_ip:string;
  code:string;
  division?:string;
  last_online?:string;
  status?:string;
}
@Injectable({
  providedIn: 'root'
})
export class KioskService extends CrudService<Kiosk>{

  constructor(
    private logService:LogsService,
    private http:HttpClient,
    private divisionService: DivisionService,
    private API:UswagonCoreService, private auth:UswagonAuthService) { 
      super(API);
      super.setTable('kiosks');
    }

  // KIOSK specific

  public kiosk?:Kiosk;
  user:any = this.auth.getUser();
  isSuperAdmin:boolean = this.auth.accountLoggedIn() == 'superadmin';



  async thermalPrint(data:any){
  this.API.socketSend({
    event: 'printing',
    printer_ip: this.kiosk?.printer_ip,
    number: data.number,
    name: data.name,
    gender:data.gender,
    id:data.id,
    location:data.location,
    date:data.date,
    time:data.time,
    services: data.services
  })
  }

  async kioskLogin(code:string){
    const response = await this.API.read({
      selectors: ['divisions.name as division,kiosks.*'],
      tables: 'kiosks, divisions',
      conditions: `
        WHERE kiosks.division_id = divisions.id
        AND kiosks.code = '${code}'
      `
    });
    if(response.success){
      if(response.output.length > 0){
        this.kiosk = response.output[0];
        if(this.kiosk!.status == 'maintenance'){
          throw new Error('Kiosk is in maintenance.');
        }
        localStorage.setItem('kiosk', JSON.stringify(this.kiosk));
        return response.output[0];
      }else{
        throw new Error('Invalid kiosk code.');
      }
    }else{
      throw new Error(response.output);
    }
  }


 async addKiosk(kiosk:Kiosk){
  const checkResponse = await this.API.read({
    selectors:['*'],
    tables:'kiosks',
    conditions:`WHERE code = '${kiosk.code}'`
  })

  if(checkResponse.success){
    if(checkResponse.output.length>0){
      throw new Error('This code is already in use!');
    }
  }else{
    throw new Error('Something went wrong');
  }
   const id = this.API.createUniqueID32();
   const currentDivision = await this.divisionService.getDivision();
   const response = await this.API.create({
     tables: 'kiosks',
     values:{
       id:id,
       division_id: currentDivision!.id,
       code:kiosk.code,
       printer_ip: kiosk.printer_ip,
       status:'available'
     }
   });

   if(!response.success){
     throw new Error('Something went wrong');
   }
   this.logService.pushLog('new-kiosk', 'added a kiosk');
 }

 async updateKioskStatus(id:string, status: 'available'|'maintenance'){
   const response = await this.API.update({
     tables: 'kiosks',
     values:{
       status:status
     }  ,
     conditions: `WHERE id = '${id}'`
   });

   if(!response.success){
     throw new Error('Unable to add terminal');
   }

 }

 async updateKiosk(kiosk:Kiosk, touched:boolean){
  if(touched){
    const checkResponse = await this.API.read({
      selectors:['*'],
      tables:'kiosks',
      conditions:`WHERE code = '${kiosk.code}'`
    })
  
    if(checkResponse.success){
      if(checkResponse.output.length>0){
        throw new Error('This code is already in use!');
      }
    }else{
      throw new Error('Something went wrong');
    }
  }


  const response = await this.API.update({
    tables: 'kiosks',
    values:{
      code:kiosk.code,
      printer_ip: kiosk.printer_ip,
    }  ,
    conditions: `WHERE id = '${kiosk.id}'`
  });

  if(!response.success){
    throw new Error('Something went wrong.');
  }
  this.logService.pushLog('update-kiosk', 'updated a kiosk');
}
 async deleteKiosk(id:string){
   const response = await this.API.delete({
     tables: 'kiosks',
     conditions: `WHERE id = '${id}'`
   });

   if(!response.success){
     throw new Error('Unable to delete kiosk');
   }
   this.logService.pushLog('delete-kiosk', 'deleted a kiosk');
 }
 
  async getAllKiosks(division_id:string){

     const response = await this.API.read({
         selectors: ['divisions.name as division, kiosks.*'],
         tables: 'kiosks,divisions',
         conditions: `
           WHERE kiosks.division_id = '${division_id}'  AND divisions.id = kiosks.division_id
           ORDER BY number ASC`
       });

     if(response.success){
        for(let kiosk of response.output){
          const now = new Date();
          const lastActive = new Date(kiosk.last_online);
          const diffInMinutes = (now.getTime() - lastActive.getTime()) / 60000;
          if(diffInMinutes < 1.5 && kiosk.status != 'maintenance'){
            kiosk.status = 'online';
          }
        }
       return response.output;
     }else{
       throw new Error('Unable to fetch kiosks');
     }
   }
   async getKiosks(status: 'available' | 'maintenance', division?: string): Promise<Kiosk[]> {
    try {
      const divisionId = division || this.auth.getUser().division_id;
      const response = await this.API.read({
        selectors: ['divisions.name as division, kiosks.*'],
        tables: 'kiosks, divisions',
        conditions: `WHERE kiosks.division_id = '${divisionId}' AND divisions.id = kiosks.division_id AND status = '${status}'`
      });

      if (response.success) {
        return response.output;
      } else {
        console.error('Failed to fetch kiosks:', response);
        return [];
      }
    } catch (error) {
      console.error('Error fetching kiosks:', error);
      return [];
    }
  }

  async getKiosk(id:string):Promise<Kiosk> {
    try {
      const response = await this.API.read({
        selectors: ['divisions.name as division, kiosks.*'],
        tables: 'kiosks, divisions',
        conditions: `WHERE kiosks.id = '${id}' AND divisions.id = kiosks.division_id`
      });

      if (response.success) {
        return response.output[0];
      } else {
        throw new Error('Something went wrong');
      }
    } catch (error) {
      console.error('Error fetching kiosks:', error);
      throw new Error('Something went wrong');
    }
  }

}

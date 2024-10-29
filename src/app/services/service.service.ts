import { Injectable } from '@angular/core';
import { DivisionService } from './division.service';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { Service } from '../features/admin-layout/service-management/types/service.types';

@Injectable({
  providedIn: 'root'
})
export class ServiceService {

  constructor(
    private divisionService: DivisionService,
    private API:UswagonCoreService, private auth:UswagonAuthService) { }

  public service?:Service;
  user:any = this.auth.getUser();
  isSuperAdmin:boolean = this.auth.accountLoggedIn() == 'superadmin';


async addSubService(service_id:string,name:string){

  const id = this.API.createUniqueID32();
  const response = await this.API.create({
    tables: 'sub_services',
    values:{
      id:id,
      service_id: service_id,
      name:name,
    }  
  });

  if(!response.success){
    throw new Error('Something went wrong');
  }
}

 async addService(name:string){

   const id = this.API.createUniqueID32();
   const currentDivision = await this.divisionService.getDivision();
   const response = await this.API.create({
     tables: 'services',
     values:{
       id:id,
       division_id: currentDivision!.id,
       name:name,
     }  
   });
 
   if(!response.success){
     throw new Error('Something went wrong');
   }
 }

 async updateSubService(id:string, name:string){
  const response = await this.API.update({
    tables: 'sub_services',
    values:{
      name:name
    }  ,
    conditions: `WHERE id = '${id}'`
  });

  if(!response.success){
    throw new Error('Something went wrong.');
  }  
}

 async updateService(id:string, name:string){

  const response = await this.API.update({
    tables: 'services',
    values:{
      name:name
    }  ,
    conditions: `WHERE id = '${id}'`
  });

  if(!response.success){
    throw new Error('Something went wrong.');
  }
}

async deleteSubService(id:string){
  const response = await this.API.delete({
    tables: 'sub_services',
    conditions: `WHERE id = '${id}'`
  });

  if(!response.success){
    throw new Error('Unable to delete service');
  }
}
 async deleteService(id:string){
   const response = await this.API.delete({
     tables: 'services',
     conditions: `WHERE id = '${id}'`
   });
 
   if(!response.success){
     throw new Error('Unable to delete service');
   }
 }

 async getSubServices(service_id:string){
      const response = await this.API.read({
          selectors: ['*'],
          tables: 'sub_services',
          conditions: `
            WHERE sub_services.service_id = '${service_id}'  ORDER BY sub_services.name`
        });

      if(response.success){
        return response.output;
      }else{
        throw new Error('Unable to fetch services');
      }
 }
 
  async getAllServices(division_id:string){
   
     const response = await this.API.read({
         selectors: ['divisions.name as division, services.*'],
         tables: 'services,divisions',
         conditions: `
           WHERE services.division_id = '${division_id}'  AND divisions.id = services.division_id ORDER BY services.name`
       });
    
     if(response.success){
       return response.output;
     }else{
       throw new Error('Unable to fetch services');
     }
   }
  async getServices( division?:string,){
     let division_id;
   
     if(!division){
       division_id =  this.user.division_id;
     }else{
       division_id = division;
     }
 
     const response = await this.API.read({
       selectors: ['divisions.name as division, services.*'],
       tables: 'services,divisions',
       conditions: `
         WHERE services.division_id = '${division_id}'  AND divisions.id = services.division_id 
         ORDER BY services.name ASC`
     });
     
    
     if(response.success){
       return response.output;
     }else{
      
       throw new Error('Unable to fetch services');
     }
   }




  
}

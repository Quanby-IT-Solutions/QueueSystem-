import { Injectable } from '@angular/core';
import { DivisionService } from './division.service';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { Service } from '../features/admin-layout/service-management/types/service.types';
import { CrudService } from './crud.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceService extends CrudService<Service> {

  constructor(
    private divisionService: DivisionService,
    private API:UswagonCoreService, private auth:UswagonAuthService) {
      super(API);
      super.setTable('services');
     }

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
  this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'kiosk-events'})
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
   this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'kiosk-events'})
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
  this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'kiosk-events'})
}

async updateForwardToService(id:string, service_id:string){
  const responseGet = await this.API.read({
    selectors: ['*'],
    tables: 'sub_services',
    conditions: `WHERE id = '${id}'`
  });

  if(!responseGet.success){
    throw new Error('Something went wrong.');
  }  
  let descObj:any = {};
  if(responseGet.output[0].description){
    try{
        descObj = JSON.parse(responseGet.output[0].description);
    }catch(e){}
  }
  
  descObj.forwards = service_id;
  
  const response = await this.API.update({
    tables: 'sub_services',
    values:{
      description: JSON.stringify(descObj),
    }  ,
    conditions: `WHERE id = '${id}'`
  });

  if(!response.success){
    throw new Error('Something went wrong.');
  }  
  this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'kiosk-events'})
}

async updateTerminalSpecifics(id:string, terminals:string[]){
  const responseGet = await this.API.read({
    selectors: ['*'],
    tables: 'sub_services',
    conditions: `WHERE id = '${id}'`
  });

  if(!responseGet.success){
    throw new Error('Something went wrong.');
  }  
  let descObj:any = {};
  if(responseGet.output[0].description){
    try{
        descObj = JSON.parse(responseGet.output[0].description);
    }catch(e){}
  }
  
  descObj.terminals = terminals.join(',');
  
  const response = await this.API.update({
    tables: 'sub_services',
    values:{
      description: JSON.stringify(descObj),
    }  ,
    conditions: `WHERE id = '${id}'`
  });

  if(!response.success){
    throw new Error('Something went wrong.');
  }  
  this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'kiosk-events'})
  this.API.socketSend({event:'terminal-events'})
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
  this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'kiosk-events'})
}

async deleteSubService(id:string){
  const response = await this.API.delete({
    tables: 'sub_services',
    conditions: `WHERE id = '${id}'`
  });

  if(!response.success){
    throw new Error('Unable to delete service');
  }
  this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'kiosk-events'})
}
 async deleteService(id:string){
   const response = await this.API.delete({
     tables: 'services',
     conditions: `WHERE id = '${id}'`
   });
 
   if(!response.success){
     throw new Error('Unable to delete service');
   }
   this.API.socketSend({event:'queue-events'})
  this.API.socketSend({event:'kiosk-events'})
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

 async getSubServiceDivision(service_id:string){
  const response = await this.API.read({
      selectors: ['services.division_id'],
      tables: 'services,sub_services',
      conditions: `
        WHERE sub_services.service_id = services.id AND sub_services.id = '${service_id}'`
    });

  if(response.success){
    return response.output[0]?.division_id;
  }else{
    throw new Error('Unable to fetch service division');
  }
}


 async getAllSubServices(){
  const response = await this.API.read({
      selectors: ['sub_services.*','services.name as service_name','divisions.name as division_name'],
      tables: 'sub_services, services,divisions',
      conditions: `
        WHERE sub_services.service_id = services.id AND divisions.id = services.division_id
         ORDER BY sub_services.name`
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

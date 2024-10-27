import { Injectable } from '@angular/core';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import { environment } from '../../environment/environment';

interface Division{
  id:string;
  name:string;
  logo?:string;
}

@Injectable({
  providedIn: 'root'
})
export class DivisionService {

  constructor(private auth:UswagonAuthService, private API:UswagonCoreService) {}

  private isSuperAdmin:boolean = this.auth.accountLoggedIn()=='superadmin';
  private adminID:string = environment.administrators;
  public selectedDivision?:Division;
  public divisions:Division[] = [];

  async setDivision(division:Division){
    this.selectedDivision = division;
  }

  async getDivisions():Promise<Division[]>{
    try{
      const response = await this.API.read({
        selectors: ['contents.*, divisions.*'],
        tables: 'divisions',
        conditions: `
        LEFT JOIN contents  ON divisions.id = contents.division_id
        WHERE divisions.id != '${this.adminID}' `,
      });
  
      if(response.success){
        this.divisions = response.output as Division[];
        if(this.divisions.length>0){
          this.selectedDivision = this.divisions[0];
        }
        return this.divisions;
      }else{
        throw new Error('Error getting divisions.');
      }
    }catch(e:any){
      throw new Error('Something went wrong.');
    }
  }

  async getDivision(id?:string):Promise<Division|undefined>{
    if(this.isSuperAdmin){
      if(this.selectedDivision){
        return this.selectedDivision;
      }else{
        this.divisions =  await  this.getDivisions();
        if(this.divisions.length<=0) throw new Error('Error fetching divisions');
        this.selectedDivision = this.divisions[0];
        return this.selectedDivision;
      }
    }
    try{
      const response = await this.API.read({
        selectors: ['contents.*, divisions.*'],
        tables: 'divisions',
        conditions: `
         LEFT JOIN contents  ON divisions.id = contents.division_id
        WHERE divisions.id = '${ id ? id: this.auth.getUser().division_id}' `,
      });
      if(response.success){
        if(response.output.length <= 0) return undefined;
        this.selectedDivision = response.output[0] as Division;
        if(response.output[0].video){
          response.output[0].video = this.API.getFileURL(response.output[0].video);
        }
        if(response.output[0].background){
          response.output[0].background = this.API.getFileURL(response.output[0].background);
        }
        if(response.output[0].logo){
          response.output[0].logo = this.API.getFileURL(response.output[0].logo);
        }
        
        return response.output[0];
      }else{
        throw new Error(response.output);
      }
    }catch(e:any){
      throw new Error('Something went wrong');
    }

   
  }

  async addDivision(name:string){
    const checkResponse = await this.API.read({
      selectors:['*'],
      tables:'divisions',
      conditions:`WHERE name = '${name}'`
    })
  
    if(checkResponse.success){
      if(checkResponse.output.length>0){
        throw new Error('This name is already in use!');
      }
    }else{
      throw new Error('Something went wrong');
    }
     const id = this.API.createUniqueID32();
     const response = await this.API.create({
       tables: 'divisions',
       values:{
         id:id,
         name:name,
       }  
     });
   
     if(!response.success){
       throw new Error('Something went wrong');
     }
   }
   
  
   async updateDivision(id:string, name:string){
    const checkResponse = await this.API.read({
      selectors:['*'],
      tables:'divisions',
      conditions:`WHERE name = '${name}'`
    })
  
    if(checkResponse.success){
      if(checkResponse.output.length>0){
        throw new Error('This name is already in use!');
      }
    }else{
      throw new Error('Something went wrong');
    }
    
  
    const response = await this.API.update({
      tables: 'divisions',
      values:{
        name:name
      }  ,
      conditions: `WHERE id = '${id}'`
    });
  
    if(!response.success){
      throw new Error('Something went wrong.');
    }
  }
   async deleteDivision(id:string){
     const response = await this.API.delete({
       tables: 'divisions',
       conditions: `WHERE id = '${id}'`
     });
   
     if(!response.success){
       throw new Error('Unable to delete division');
     }
   }
   
}

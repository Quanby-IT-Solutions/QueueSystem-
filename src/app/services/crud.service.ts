import { Injectable } from '@angular/core';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';


@Injectable({
  providedIn: 'root'
})
export class CrudService<T> {

constructor(
    private core:UswagonCoreService) { }

table?:string;  
limit:number = 100000000000;
offset:number = 0;
filters:string = '';
order:string[] = [];

setTable(table:string){
  this.table = table;
}

setFilters(condition:string){
  this.filters = condition;
}

getTable(){
  return this.table!;
}

 async add(item:T){
   const id = this.core.createUniqueID32();
   const response = await this.core.create({
    tables: this.table!,
    values:{...item as {[key:string]:string}, id:id}
  });
 
   if(!response.success){
     throw new Error(response.output);
   }
    this.core.socketSend({event:'queue-events'})
    this.core.socketSend({event:'terminal-events'})
    this.core.socketSend({event:'admin-dashboard-events'})
 }

 async checkWhere(condition:string){
  const checkResponse = await this.core.read({
    selectors:['*'],
    tables:this.table!,
    conditions:condition
  })

  if(checkResponse.success){
    if(checkResponse.output.length>0){
      throw new Error('This name is already in use!');
    }
  }else{
    throw new Error('Unable to check item');
  }
 }
 

 async update(id:string, item:T){
  const response = await this.core.update({
    tables: this.table!,
    values: item as {[key:string]:string},
    conditions: `WHERE id = '${id}'`
  });

  if(!response.success){
    throw new Error('Unable to update item.');
  }
  this.core.socketSend({event:'queue-events'})
  this.core.socketSend({event:'terminal-events'})
  this.core.socketSend({event:'admin-dashboard-events'})
}
 async delete(id:string){
   const response = await this.core.delete({
     tables: this.table!,
     conditions: `WHERE id = '${id}'`
   });
 
   if(!response.success){
     throw new Error(`Unable to delete item`);
   }
    this.core.socketSend({event:'queue-events'})
    this.core.socketSend({event:'terminal-events'})
    this.core.socketSend({event:'admin-dashboard-events'})
 }
 
  async getAll(): Promise<T[]>{  
    const response = await this.core.read({
        selectors: ['*'],
        tables: this.table!,
        conditions: `
          ${this.filters}
          ORDER BY ${this.order.join(", ")} ${this.table!}.id
          OFFSET ${this.offset} ROWS FETCH NEXT ${this.limit} ROWS ONLY  
        `
      });
  
    if(response.success){
      return response.output;
    }else{
      throw new Error(`Unable to fetch items`);
    }
  }

  async get(id:string){
    const response = await this.core.read({
      selectors: ['*'],
      tables: this.table!,
      conditions: `
        WHERE id = '${id}'
      `
    });
    if(response.success){
      if(response.output.length <=0) return null;
      return response.output[0] ;
    }else{
      throw new Error(`Unable to fetch item`);
    }
  }

}

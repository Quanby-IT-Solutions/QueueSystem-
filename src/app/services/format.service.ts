import { Injectable } from '@angular/core';
import { UswagonAuthService } from 'uswagon-auth';
import { UswagonCoreService } from 'uswagon-core';
import {CrudService} from './crud.service'

import { Format } from '../features/admin-layout/format-management/types/format.types';

@Injectable({
  providedIn: 'root'
})
export class FormatService extends CrudService<Format>{


  
  constructor(
    private API:UswagonCoreService) {
      super(API);
      super.setTable('formats');
      
  }

  override async add(item:Format){
    await super.add(item);
    this.API.socketSend({event:'kiosk-events'});
  }

  override async update(id:string,item:Format){
    await super.update(id,item);
    this.API.socketSend({event:'kiosk-events'});
  }
  
  override async delete(id:string){
    this.API.delete({
      tables:'queue',
      conditions:`WHERE type = '${id}'`
    })
    this.API.update({
      tables:'terminals',
      values: {
        specific : '',
      },
      conditions:`WHERE specific = '${id}'`
    })
    await super.delete(id);
    this.API.socketSend({event:'kiosk-events'});
  }

  async getFrom(division_id:string){
    super.setFilters(`WHERE division_id = '${division_id}'`);
    return await super.getAll();
  }
}

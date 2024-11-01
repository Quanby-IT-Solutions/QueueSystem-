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

  override async add (item:Format){
    await super.checkWhere(`WHERE name = '${item.name}'`);
    await super.add(item)
  }

  override async update(id:string, item:Format){
    await super.checkWhere(`WHERE name = '${item.name}'`);
    await super.update(id,item);
  }

  async getFrom(division_id:string){
    super.setFilters(`WHERE division_id = '${division_id}'`);
    return await super.getAll();
  }
}

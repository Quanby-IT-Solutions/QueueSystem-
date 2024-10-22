export interface Service{
    id?:string;
    division_id?:string;
    name:string;
    description?:string;
    selected?:boolean;
  }
  
  export interface Division{
    id:string;
    name:string;
  }

  export interface Department{
    id?:string;
    name:string;
    description?:string;
  }
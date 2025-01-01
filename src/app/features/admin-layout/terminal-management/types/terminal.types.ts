export interface Terminal{
  id:string;
  division_id:string;
  number:string;
  get status():string;   
  _status:string;  
  last_active?:string;
  session_status?:string;
  attendant?:string;
  specific?:string;
}
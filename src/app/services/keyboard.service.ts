// keyboard.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KeyboardService {
  private showKeyboardSubject = new BehaviorSubject<boolean>(false);
  private currentValueSubject = new BehaviorSubject<string>('');
  private inputFieldSubject = new BehaviorSubject<string>('');

  showKeyboard$ = this.showKeyboardSubject.asObservable();
  currentValue$ = this.currentValueSubject.asObservable();
  inputField$ = this.inputFieldSubject.asObservable();

  show(value: string, inputField: string) {
    this.currentValueSubject.next(value);
    this.inputFieldSubject.next(inputField);
    this.showKeyboardSubject.next(true);
  }

  hide() {
    this.showKeyboardSubject.next(false);
  }

  updateValue(value: string) {
    this.currentValueSubject.next(value);
  }
}
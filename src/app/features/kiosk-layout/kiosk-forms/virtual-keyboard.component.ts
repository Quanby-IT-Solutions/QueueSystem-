// virtual-keyboard.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-virtual-keyboard',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ],
  template: `
    <div [@slideUp] class="fixed bottom-0 left-0 right-0 z-[60]">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/20 backdrop-blur-sm" (click)="onClose()"></div>
      
      <!-- Keyboard Container -->
      <div class="relative bg-gray-100 border-t border-gray-200 shadow-lg p-4 pb-6">
        <div class="max-w-4xl mx-auto">
          <!-- Input Preview -->
          <div class="bg-white p-4 rounded-xl mb-6 min-h-[50px] text-xl font-medium shadow-inner">
            {{value || 'Start typing...'}}
            <div class="animate-pulse inline-block w-0.5 h-6 bg-[var(--primary)] ml-1"></div>
          </div>
          
          <!-- Keyboard Layout -->
          <div class="space-y-3">
            <!-- Number row -->
            <div class="flex justify-center gap-2">
              <button *ngFor="let key of numbers" 
                (click)="onKeyPress(key)"
                class="w-14 h-14 bg-white rounded-xl shadow-md text-xl font-semibold hover:bg-[var(--primary-hover)] hover:text-white active:transform active:scale-95 transition-all duration-150">
                {{key}}
              </button>
            </div>

            <!-- Letter rows -->
            <div *ngFor="let row of letterRows; let i = index" 
              class="flex justify-center gap-2"
              [class.ml-4]="i === 1"
              [class.ml-8]="i === 2">
              <button *ngFor="let key of row"
                (click)="onKeyPress(key)"
                class="w-14 h-14 bg-white rounded-xl shadow-md text-xl font-semibold hover:bg-[var(--primary-hover)] hover:text-white active:transform active:scale-95 transition-all duration-150">
                {{isShift ? key.toUpperCase() : key.toLowerCase()}}
              </button>
            </div>

            <!-- Bottom row -->
            <div class="flex justify-center items-center gap-2 mt-4">
              <button (click)="toggleShift()"
                [class.bg-[var(--primary)]="isShift"
                [class.text-white]="isShift"
                class="px-6 h-14 bg-white rounded-xl shadow-md text-lg font-semibold hover:bg-[var(--primary-hover)] hover:text-white active:transform active:scale-95 transition-all duration-150 flex items-center">
                <span class="material-icons">keyboard_capslock</span>
              </button>
              
              <button (click)="onSpace()"
                class="w-96 h-14 bg-white rounded-xl shadow-md text-lg font-semibold hover:bg-[var(--primary-hover)] hover:text-white active:transform active:scale-95 transition-all duration-150">
                Space
              </button>
              
              <button (click)="onBackspace()"
                class="px-6 h-14 bg-white rounded-xl shadow-md text-lg font-semibold hover:bg-[var(--primary-hover)] hover:text-white active:transform active:scale-95 transition-all duration-150 flex items-center">
                <span class="material-icons">backspace</span>
              </button>
              
              <button (click)="onClose()"
                class="px-6 h-14 bg-[var(--primary)] text-white rounded-xl shadow-md text-lg font-semibold hover:bg-[var(--primary-hover)] active:transform active:scale-95 transition-all duration-150 flex items-center gap-2">
                <span class="material-icons">check</span>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .material-icons {
      font-size: 24px;
    }
  `]
})
export class VirtualKeyboardComponent {
  @Input() value: string = '';
  @Output() valueChange = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  isShift = false;
  numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  letterRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['.','z', 'x', 'c', 'v', 'b', 'n', 'm', '-']
  ];

  onKeyPress(key: string) {
    this.valueChange.emit(this.value + (this.isShift ? key.toUpperCase() : key.toLowerCase()));
    if (this.isShift) this.isShift = false;
  }

  onBackspace() {
    this.valueChange.emit(this.value.slice(0, -1));
  }

  onSpace() {
    this.valueChange.emit(this.value + ' ');
  }

  toggleShift() {
    this.isShift = !this.isShift;
  }

  onClose() {
    this.close.emit();
  }
}
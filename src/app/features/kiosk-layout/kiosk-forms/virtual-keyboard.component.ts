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
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateY(100%)', opacity: 0 }))
      ])
    ])
  ],
  template: `
    <div [@slideUp] class="fixed bottom-0 left-0 right-0 z-[60]">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/10 backdrop-blur-[2px]" (click)="onClose()"></div>
      
      <!-- Main Container -->
      <div class="relative bg-[#f0f4ff]/80 p-6">
        <div class="max-w-4xl mx-auto">
          <!-- Input Preview -->
          <div class="bg-white rounded-xl mb-6 shadow-sm">
            <input 
              [value]="value"
              readonly
              placeholder="Start typing..."
              class="w-full px-6 py-4 text-lg rounded-xl focus:outline-none placeholder:text-gray-400"
            >
          </div>
          
          <!-- Keyboard Layout -->
          <div class="bg-white rounded-2xl p-8 shadow-sm">
            <!-- Numbers Row -->
            <div class="flex justify-center gap-3 mb-3">
              <button *ngFor="let key of numbers" 
                (click)="onKeyPress(key)"
                class="w-20 h-14 bg-white rounded-xl shadow-sm text-lg font-medium hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center">
                {{key}}
              </button>
            </div>

            <!-- Letters/Symbols (Main Keyboard) -->
            <div *ngFor="let row of (symbolsMode ? symbolRows : letterRows); let i = index" 
              class="flex justify-center gap-3 mb-3"
              [class.ml-6]="i === 1"
              [class.ml-10]="i === 2">
              <button *ngFor="let key of row"
                (click)="onKeyPress(key)"
                class="w-20 h-14 bg-white rounded-xl shadow-sm text-lg font-medium hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center">
                {{isShift ? key.toUpperCase() : key}}
              </button>
            </div>

            <!-- Bottom Control Row -->
            <div class="flex justify-center items-center gap-3 mt-4">
              <!-- Shift -->
              <button (click)="toggleShift()"
                [class.bg-blue-50]="isShift"
                class="w-14 h-14 bg-white rounded-xl shadow-sm hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center">
                <span class="material-icons">keyboard_capslock</span>
              </button>

              <!-- Symbols Toggle -->
              <button (click)="toggleSymbols()"
                [class.bg-blue-50]="symbolsMode"
                class="w-20 h-14 bg-white rounded-xl shadow-sm text-base font-medium hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center">
                ?123
              </button>
              
              <!-- Spacebar -->
              <button (click)="onSpace()"
                class="h-14 bg-white rounded-xl shadow-sm text-base font-medium hover:bg-blue-50 active:scale-95 transition-all flex-grow flex items-center justify-center">
                Space
              </button>
              
              <!-- Backspace -->
              <button 
                (click)="onBackspace()"
                (mousedown)="startBackspaceInterval()" 
                (mouseup)="clearBackspaceInterval()"
                (mouseleave)="clearBackspaceInterval()"
                class="w-14 h-14 bg-white rounded-xl shadow-sm hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center">
                <span class="material-icons">backspace</span>
              </button>
              
              <!-- Done -->
              <button (click)="onClose()"
                class="w-24 h-14 bg-[#2d5a27] text-white rounded-xl shadow-sm text-base font-medium hover:bg-[#224a1d] active:scale-95 transition-all flex items-center justify-center gap-2">
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
  symbolsMode = false;
  private backspaceInterval: any;

  numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  
  letterRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['.', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '-']
  ];

  symbolRows = [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
    ['=', '+', '{', '}', '[', ']', '\\', '|', ';'],
    ['/', ':', '"', '\'', '<', '>', ',', '?', '~']
  ];

  onKeyPress(key: string): void {
    this.valueChange.emit(this.value + (this.isShift ? key.toUpperCase() : key));
    if (this.isShift) this.isShift = false;
  }

  onBackspace(): void {
    this.valueChange.emit(this.value.slice(0, -1));
  }

  startBackspaceInterval(): void {
    this.onBackspace();
    this.backspaceInterval = setInterval(() => {
      this.onBackspace();
    }, 150);
  }

  clearBackspaceInterval(): void {
    if (this.backspaceInterval) {
      clearInterval(this.backspaceInterval);
      this.backspaceInterval = null;
    }
  }

  onSpace(): void {
    this.valueChange.emit(this.value + ' ');
  }

  toggleShift(): void {
    this.isShift = !this.isShift;
  }

  toggleSymbols(): void {
    this.symbolsMode = !this.symbolsMode;
    this.isShift = false;
  }

  onClose(): void {
    this.close.emit();
  }

  ngOnDestroy(): void {
    this.clearBackspaceInterval();
  }
}
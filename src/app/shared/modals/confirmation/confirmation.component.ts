import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LottieAnimationComponent } from '../../components/lottie-animation/lottie-animation.component';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [CommonModule, LottieAnimationComponent],
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.css'
})
export class ConfirmationComponent {
  @Input() type:'publish'|'revert'| 'logout' ='publish';
  @Output() onCancel = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<void>();

  cancel(){
    this.onCancel.emit();
  }

  confirm(){
    this.onConfirm.emit();
  }

  confirmText = {
    publish: 'Publish',
    revert : 'Revert',
    logout : 'Logout'
  }


}

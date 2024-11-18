import { Component, Input, OnInit } from '@angular/core';
import { LottieAnimationComponent } from '../../components/lottie-animation/lottie-animation.component';
import { SnackbarCoreFeedback } from 'uswagon-core/lib/types/uswagon-core.types';
import { UswagonCoreService } from 'uswagon-core';

@Component({
  selector: 'app-snackbar-item',
  standalone: true,
  imports: [LottieAnimationComponent],
  templateUrl: './snackbar-item.component.html',
  styleUrl: './snackbar-item.component.css'
})
export class SnackbarItemComponent implements OnInit {
  @Input() i!:number;
  @Input() feedback!:SnackbarCoreFeedback;

  constructor(private API:UswagonCoreService){}

  ngOnInit(): void {
    this.playSound();
  }
  playSound(){
    const audio = new Audio(this.feedback.type !='success' ? 'assets/audio/pop-notif.wav': 'assets/audio/notif.mp3');
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
    });
  }

  borderColorMap={
    success: 'border-green-600/40',
    warning:'border-yellow-600/40',
    error:'border-red-600/40',
    neutral: 'border-gray-600/40',
  }
  bgColorMap={
    success: 'bg-green-600',
    warning:'bg-yellow-600',
    error:'bg-red-600',
    neutral: 'bg-black',
  }
  lottieMap={
    success: 'check',
    warning:'yellowWarning',
    error:'warning',
    neutral: 'confirmation'
  }
  close(index:number){
    this.API.closeFeedback(index);
  }
}

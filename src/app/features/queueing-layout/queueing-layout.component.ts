import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { QueueDisplayComponent } from './queue-display/queue-display.component';
import { ContentService } from '../../services/content.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { UswagonCoreService } from 'uswagon-core';
import { LottieAnimationComponent } from '../../shared/components/lottie-animation/lottie-animation.component';
import { QueueService } from '../../services/queue.service';
import { ActivatedRoute } from '@angular/router';
import { DivisionService } from '../../services/division.service';

interface Division {
  id: string;
  name: string;
}

@Component({
  selector: 'app-queueing-layout',
  standalone: true,
  imports: [QueueDisplayComponent, CommonModule, LottieAnimationComponent],
  templateUrl: './queueing-layout.component.html',
  styleUrl: './queueing-layout.component.css'
})
export class QueueingLayoutComponent implements OnInit, OnDestroy {

  content: any;
  isLoading: boolean = true;
  loading$?: Subscription;
  contentIndex: number = 0;
  divisions: Division[] = [];
  selectedDivision?: string;

  constructor(
    private divisionService: DivisionService,
    private contentService: ContentService,
    private API: UswagonCoreService,
    private cdr: ChangeDetectorRef,
    private queueServe: QueueService,
    private route: ActivatedRoute
  ) {}



  ngOnInit(): void {

    // Attempt to enable fullscreen immediately (works in kiosk mode)
    this.enableFullscreen();

    // Monitor fullscreen state changes
    document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));

    this.loading$ = this.API.isLoading$.subscribe(loading => {
      this.isLoading = loading;
      this.cdr.detectChanges();
    });

    this.contentIndex = this.route.snapshot.queryParams['reset'];

    if (this.contentIndex != null) {
      this.selectedDivision = undefined;
      localStorage.removeItem('division');
    }

    this.loadContents();

    // Listen for updates
    this.API.addSocketListener('content-changes', (data: any) => {
      if (data.event !== 'content-changes') return;
      this.content = undefined;
      this.loadContents();
    });
  }

  ngOnDestroy(): void {
    this.loading$?.unsubscribe();
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
  }

  selectDivision(division_id: string): void {
    this.selectedDivision = division_id;
    this.content = this.contentMap[division_id];
    localStorage.setItem('division', this.selectedDivision);
  }

  contentMap: any = {};

  async loadContents(): Promise<void> {
    this.selectedDivision = localStorage.getItem('division') ?? undefined;

    this.API.setLoading(true);
    this.divisions = await this.divisionService.getDivisions();
    const contents = await this.contentService.getContentSettings();

    this.contentMap = contents.reduce((prev: any, item: any) => {
      return { ...prev, [item.division_id]: item };
    }, {});

    if (this.selectedDivision) {
      this.content = this.contentMap[this.selectedDivision];
    }
    this.API.setLoading(false);
  }

  enableFullscreen(): void {
    const elem = document.documentElement; // Target the root element
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request failed:', err.message);
        });
      } else if ((elem as any).webkitRequestFullscreen) {
        // Safari
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        // IE/Edge
        (elem as any).msRequestFullscreen();
      }
    }
  }

  handleFullscreenChange(): void {
    // If fullscreen mode is exited, try to re-enable it (only useful in kiosk mode)
    if (!document.fullscreenElement) {
      console.warn('Fullscreen mode exited; attempting to re-enable.');
      this.enableFullscreen();
    }
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.enableFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn('Exit fullscreen failed:', err.message);
        });
      } else if ((document as any).webkitExitFullscreen) {
        // Safari
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        // IE/Edge
        (document as any).msExitFullscreen();
      }
    }
  }
}

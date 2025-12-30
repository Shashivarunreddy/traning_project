
import {
  AfterViewInit,
  Directive,
  ElementRef,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appTypewriter]',
  standalone: true,
})
export class TypewriterDirective implements AfterViewInit, OnDestroy {
  @Input('appTypewriter') set inputWords(value: string[] | string) {
    if (Array.isArray(value)) this.words = value;
    else if (typeof value === 'string')
      this.words = value.split(',').map(w => w.trim()).filter(Boolean);
  }

  @Input() typeSpeed = 70;
  @Input() deleteSpeed = 45;
  @Input() holdTime = 1000;
  @Input() pauseBetween = 400;
  @Input() loop = true;

  @Input() startOnVisible = false;

  private words: string[] = ['Transform'];
  private wordIndex = 0;
  private charIndex = 0;
  private typing = true;

  private rafId: number | null = null;
  private timeoutId: any = null;
  private observer?: IntersectionObserver;

  private readonly isBrowser: boolean;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private zone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    // Accessibility hint for screen readers:
    this.renderer.setAttribute(this.el.nativeElement, 'aria-live', 'polite');

    if (!this.words.length) this.words = ['Transform'];

    this.renderer.setProperty(this.el.nativeElement, 'textContent', '');
    this.charIndex = 0;
    this.typing = true;
    this.wordIndex = 0;

    // On server, do nothing (render static). On browser, start animation.
    if (!this.isBrowser) return;

    if (this.startOnVisible && typeof IntersectionObserver !== 'undefined') {
      this.zone.runOutsideAngular(() => {
        this.observer = new IntersectionObserver((entries) => {
          const visible = entries.some(e => e.isIntersecting);
          if (visible) {
            this.observer?.disconnect();
            this.startLoopOutsideAngular();
          }
        }, { rootMargin: '0px 0px -20% 0px', threshold: 0.1 });
        this.observer.observe(this.el.nativeElement);
      });
    } else {
      this.startLoopOutsideAngular();
    }
  }

  /** A safe rAF wrapper that falls back to setTimeout when rAF is unavailable. */
  private schedule(cb: (ts: number) => void): number {
    const raf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : undefined;

    if (raf) {
      return raf(cb);
    }
    // Fallback for SSR / non-browser environments
    return setTimeout(() => cb(typeof performance !== 'undefined' ? performance.now() : Date.now()), 16) as unknown as number;
  }

  private cancelScheduled(id: number | null): void {
    if (!id) return;
    // Try cancelAnimationFrame if present, else clearTimeout
    const cancel = typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'
      ? window.cancelAnimationFrame.bind(window)
      : undefined;

    if (cancel) {
      cancel(id);
    } else {
      clearTimeout(id as unknown as number);
    }
  }

  private startLoopOutsideAngular(): void {
    this.clearTimers();

    this.zone.runOutsideAngular(() => {
      const tick = (ms: number, cb: () => void) => {
        this.timeoutId = setTimeout(() => {
          this.rafId = this.schedule(() => cb());
        }, ms);
      };

      const step = () => {
        const current = this.words[this.wordIndex];

        if (this.typing) {
          this.renderer.setProperty(
            this.el.nativeElement,
            'textContent',
            current.slice(0, this.charIndex + 1)
          );
          this.charIndex++;
          if (this.charIndex === current.length) {
            if (this.loop) {
              this.typing = false;
              tick(this.holdTime, step);
            } else {
              this.clearTimers();
              return;
            }
          } else {
            tick(this.typeSpeed, step);
          }
        } else {
          this.renderer.setProperty(
            this.el.nativeElement,
            'textContent',
            current.slice(0, this.charIndex - 1)
          );
          this.charIndex--;
          if (this.charIndex === 0) {
            this.typing = true;
            this.wordIndex = (this.wordIndex + 1) % this.words.length;
            tick(this.pauseBetween, step);
          } else {
            tick(this.deleteSpeed, step);
          }
        }
      };

      // Kick-off: schedule immediately (0ms), using the safe scheduler
      this.rafId = this.schedule(() => tick(0, step));
    });
  }

  private clearTimers(): void {
    if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; }
    if (this.rafId) { this.cancelScheduled(this.rafId); this.rafId = null; }
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.observer?.disconnect();
  }
}

import {
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);


  dropdownOpen = signal(false);
  isLoggedIn = signal(false);
  userName = signal<string | undefined>(undefined);
  userRole = signal<UserRole | null>(null);


  userInitial = computed(() => {
    const name = this.userName();
    if (!name || !name.trim()) return '?';
    return name.trim().charAt(0).toUpperCase();
  });

  isManager = computed(() => this.userRole() === UserRole.MANAGER);
  isAdmin = computed(() => this.userRole() === UserRole.ADMIN);
  isEmployee = computed(() => this.userRole() === UserRole.EMPLOYEE);

  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.auth.user$.subscribe((u) => {
      this.isLoggedIn.set(!!u);
      this.userName.set(u?.name);
      this.userRole.set(u?.role || null);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleDropdown(): void {
    this.dropdownOpen.set(!this.dropdownOpen());
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  async logout(): Promise<void> {
    this.auth.logout();
    this.closeDropdown();
    await this.router.navigateByUrl('/');
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.closeDropdown();
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const inDropdown = target.closest('[data-dropdown-root]');
    if (!inDropdown) this.closeDropdown();
  }
}
;

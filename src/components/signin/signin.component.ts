import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-signin',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.css'
})
export class SigninComponent {
  form: FormGroup;
  submitted = false;
  loading = false;
  showPass = false;

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  togglePassword() {
    this.showPass = !this.showPass;
  }

  submit() {
    this.submitted = true;
    
    if (this.form.invalid) {
      return;
    }

    this.loading = true;

    setTimeout(() => {
      const data = this.form.value;
      
      // Retrieve stored user data for validation
      const storedUser = localStorage.getItem('user');
      
      if (storedUser) {
        const user = JSON.parse(storedUser);
        
        // Simple validation (in real app, would authenticate with backend)
        if (user.email === data.email) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.loading = false;
          
          const role = user.role.toLowerCase();
          
          if (role === 'admin') {
            this.router.navigate(['/admin/dashboard']);
          } else if (role === 'manager') {
            this.router.navigate(['/manager/dashboard']);
          } else {
            this.router.navigate(['/employee/dashboard']);
          }
        } else {
          this.loading = false;
          alert('Invalid credentials');
        }
      } else {
        this.loading = false;
        alert('User not found. Please sign up first.');
      }
    }, 1500);
  }

  getControl(fieldName: string) {
    return this.form.get(fieldName);
  }

  isInvalid(fieldName: string): boolean {
    const field = this.getControl(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getError(fieldName: string): string {
    const field = this.getControl(fieldName);
    
    if (!field || !field.errors) {
      return '';
    }

    if (field.errors['required']) {
      return fieldName.charAt(0).toUpperCase() + fieldName.slice(1) + ' is required';
    }
    if (field.errors['minlength']) {
      return 'Minimum ' + field.errors['minlength'].requiredLength + ' characters needed';
    }
    if (field.errors['email']) {
      return 'Please enter a valid email';
    }

    return 'Invalid field';
  }
}

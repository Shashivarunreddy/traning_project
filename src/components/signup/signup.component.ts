import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  signupForm: FormGroup;
  submitted = false;
  isLoading = false;
  showPassword = false;

  constructor(private fb: FormBuilder, private router: Router) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator() });
  }

  passwordMatchValidator() {
    return (formGroup: FormGroup) => {
      const password = formGroup.get('password');
      const confirmPassword = formGroup.get('confirmPassword');
      if (password && confirmPassword && password.value !== confirmPassword.value) {
        confirmPassword.setErrors({ passwordMismatch: true });
      }
      return null;
    };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.submitted = true;
    if (this.signupForm.invalid) return;

    this.isLoading = true;
    setTimeout(() => {
      const formData = this.signupForm.value;
      localStorage.setItem('user', JSON.stringify({ name: formData.name, email: formData.email, role: formData.role.toLowerCase() }));
      this.isLoading = false;
      
      const role = formData.role.toLowerCase();
      if (role === 'admin') this.router.navigate(['/admin/dashboard']);
      else if (role === 'manager') this.router.navigate(['/manager/dashboard']);
      else if (role === 'employee') this.router.navigate(['/employee/dashboard']);
    }, 1500);
  }

  getFormControl(name: string) {
    return this.signupForm.get(name);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.getFormControl(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getFieldError(fieldName: string): string {
    const field = this.getFormControl(fieldName);
    if (!field || !field.errors) return '';
    if (field.errors['required']) return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    if (field.errors['minlength']) return `Min ${field.errors['minlength'].requiredLength} characters`;
    if (field.errors['email']) return 'Invalid email';
    if (field.errors['passwordMismatch']) return 'Passwords do not match';
    return 'Invalid field';
  }
}

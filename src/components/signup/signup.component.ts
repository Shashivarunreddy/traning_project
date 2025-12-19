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
  form: FormGroup;
  submitted = false;
  loading = false;
  showPass = false;
  showConfirmPass = false;

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.checkPasswordMatch });
  }

  checkPasswordMatch = (formGroup: FormGroup) => {
    const pass = formGroup.get('password');
    const confirmPass = formGroup.get('confirmPassword');
    
    if (pass && confirmPass && pass.value !== confirmPass.value) {
      confirmPass.setErrors({ notMatched: true });
    }
    return null;
  }

  togglePassword() {
    this.showPass = !this.showPass;
  }

  toggleConfirmPassword() {
    this.showConfirmPass = !this.showConfirmPass;
  }

  submit() {
    this.submitted = true;
    
    if (this.form.invalid) {
      return;
    }

    this.loading = true;

    setTimeout(() => {
      const data = this.form.value;
      
      localStorage.setItem('user', JSON.stringify({
        name: data.name,
        email: data.email,
        role: data.role.toLowerCase()
      }));

      this.loading = false;
      const role = data.role.toLowerCase();
      
      if (role === 'admin') {
        this.router.navigate(['/admin/dashboard']);
      } else if (role === 'manager') {
        this.router.navigate(['/manager/dashboard']);
      } else {
        this.router.navigate(['/employee/dashboard']);
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
    if (field.errors['notMatched']) {
      return 'Passwords do not match';
    }

    return 'Invalid field';
  }
}

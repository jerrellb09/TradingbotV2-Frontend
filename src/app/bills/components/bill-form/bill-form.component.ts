import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BillService } from '../../../services/bill.service';
import { AuthService } from '../../../services/auth.service';
import { CategoryService } from '../../../services/category.service';
import { Bill } from '../../../models/bill.model';
import { Category } from '../../../models/category.model';

@Component({
  selector: 'app-bill-form',
  templateUrl: './bill-form.component.html',
  styleUrls: ['./bill-form.component.scss']
})
export class BillFormComponent implements OnInit {
  billForm!: FormGroup;
  categories: Category[] = [];
  loading = false;
  submitting = false;
  error = '';
  success = '';
  isEditMode = false;
  billId: number | null = null;
  userId: number | null = null;
  
  constructor(
    private formBuilder: FormBuilder,
    private billService: BillService,
    private authService: AuthService,
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) { }
  
  ngOnInit(): void {
    this.initForm();
    this.loadCategories();
    
    // Force loading to false after 3 seconds to prevent infinite spinner
    setTimeout(() => {
      if (this.loading) {
        console.log('Timeout: Forcing loading to false in bill form');
        this.loading = false;
        if (!this.error) {
          this.error = 'Unable to load bill data. The bill management API may not be responding.';
        }
      }
    }, 3000);
    
    // Get the current user ID
    this.authService.currentUser.subscribe(user => {
      if (user && user.id) {
        this.userId = Number(user.id);
      } else {
        this.loading = false;
        this.error = 'User information not available.';
      }
    }, error => {
      console.error('Auth subscription error:', error);
      this.loading = false;
      this.error = 'Authentication error. Please try again later.';
    });
    
    // Check if we're in edit mode
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.billId = +id;
      this.loadBill(this.billId);
    }
  }
  
  initForm(): void {
    this.billForm = this.formBuilder.group({
      name: ['', [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      dueDay: [1, [Validators.required, Validators.min(1), Validators.max(31)]],
      isPaid: [false],
      isRecurring: [true],
      categoryId: [null]
    });
  }
  
  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (err) => {
        console.error('Error loading categories', err);
      }
    });
  }
  
  loadBill(id: number): void {
    this.loading = true;
    this.error = '';
    
    if (!this.userId) {
      this.error = 'User ID is not available. Please try again later.';
      this.loading = false;
      return;
    }
    
    this.billService.getUserBills(this.userId).subscribe({
      next: (bills) => {
        console.log('Bills loaded for edit:', bills);
        if (!bills || bills.length === 0) {
          this.error = 'No bills found.';
          this.loading = false;
          return;
        }
        
        const bill = bills.find(b => b.id === id);
        if (bill) {
          this.billForm.patchValue({
            name: bill.name,
            amount: bill.amount,
            dueDay: bill.dueDay,
            isPaid: bill.isPaid,
            isRecurring: bill.isRecurring,
            categoryId: bill.categoryId || null
          });
        } else {
          this.error = 'Bill not found.';
          setTimeout(() => {
            this.router.navigate(['/bills']);
          }, 1500);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading bill:', err);
        this.error = 'Failed to load bill. The bill management API may not be available yet.';
        this.loading = false;
      }
    });
  }
  
  onSubmit(): void {
    if (this.billForm.invalid) {
      // Mark all form controls as touched to trigger validation display
      Object.keys(this.billForm.controls).forEach(key => {
        const control = this.billForm.get(key);
        control?.markAsTouched();
      });
      return;
    }
    
    if (!this.userId) {
      this.error = 'User ID is not available. Please try again later.';
      return;
    }
    
    this.submitting = true;
    this.error = '';
    this.success = '';
    
    const bill: Bill = this.billForm.value;
    
    if (this.isEditMode && this.billId) {
      // Update existing bill
      this.billService.updateBill(this.billId, bill).subscribe({
        next: () => {
          console.log('Bill updated successfully');
          this.submitting = false;
          this.success = 'Bill updated successfully!';
          setTimeout(() => {
            this.router.navigate(['/bills']);
          }, 1500);
        },
        error: (err) => {
          console.error('Error updating bill:', err);
          this.submitting = false;
          this.error = 'Failed to update bill. The bill management API may not be available yet.';
        }
      });
    } else {
      // Create new bill
      this.billService.createBill(bill, this.userId).subscribe({
        next: () => {
          console.log('Bill created successfully');
          this.submitting = false;
          this.success = 'Bill created successfully!';
          setTimeout(() => {
            this.router.navigate(['/bills']);
          }, 1500);
        },
        error: (err) => {
          console.error('Error creating bill:', err);
          this.submitting = false;
          this.error = 'Failed to create bill. The bill management API may not be available yet.';
        }
      });
    }
  }
}
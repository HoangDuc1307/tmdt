import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AddressService } from '../../../api/address.service';

@Component({
  selector: 'app-address',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './address.component.html',
  styleUrls: ['./address.component.css']
})
export class AddressComponent implements OnInit {
  addresses: any[] = [];
  addressForm!: FormGroup;
  showForm = false;
  editingId: number | null = null;
  loading = false;

  constructor(private fb: FormBuilder, private addressService: AddressService) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadAddresses();
  }

  initForm() {
    this.addressForm = this.fb.group({
      full_name: ['', Validators.required],
      phone: ['', Validators.required],
      address_line: ['', Validators.required],
      ward: [''],
      district: [''],
      province: ['']
    });
  }

  loadAddresses() {
    this.loading = true;
    this.addressService.getAddresses().subscribe({
      next: (data) => {
        this.addresses = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  openAddForm() {
    this.editingId = null;
    this.addressForm.reset();
    this.showForm = true;
  }

  openEditForm(addr: any) {
    this.editingId = addr.id;
    this.addressForm.patchValue(addr);
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  saveAddress() {
    if (this.addressForm.invalid) return;
    
    // Simulate a Google Maps Geocoding latency/mock
    const formData = {
      ...this.addressForm.value,
      lat: 10.762622, // Placeholder
      lng: 106.660172 // Placeholder
    };

    if (this.editingId) {
      this.addressService.updateAddress(this.editingId, formData).subscribe(() => {
        this.loadAddresses();
        this.closeForm();
      });
    } else {
      this.addressService.addAddress(formData).subscribe(() => {
        this.loadAddresses();
        this.closeForm();
      });
    }
  }

  deleteAddress(id: number) {
    if(confirm('Bạn có chắc muốn xóa địa chỉ này?')) {
      this.addressService.deleteAddress(id).subscribe(() => {
        this.loadAddresses();
      });
    }
  }

  setDefault(id: number) {
    this.addressService.setDefault(id).subscribe(() => {
      this.loadAddresses();
    });
  }
}

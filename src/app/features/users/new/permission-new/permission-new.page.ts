// src/app/features/users/new/permission-new/permission-new.page.ts
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-permission-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  templateUrl: './permission-new.page.html',
  styleUrl: './permission-new.page.scss',
})
export class PermissionNewPage {
  form: FormGroup;

  // Mock de módulos para renderizar a tabela de permissões
  modules = [
    { name: 'Gestão de cadastro', submenu: 'Stakeholders, Plano de contas', view: true, add: true, edit: true, del: true, limit: true },
    { name: 'Contratos e parcerias', submenu: 'Exemplo', view: true, add: true, edit: true, del: true, limit: true },
    { name: 'Entidades', submenu: 'Exemplo', view: false, add: false, edit: false, del: false, limit: false },
    { name: 'Suprimentos/compras', submenu: 'Exemplo', view: false, add: false, edit: false, del: false, limit: false },
    { name: 'Financeiro', submenu: 'Conciliação, Contas a receber', view: false, add: false, edit: false, del: false, limit: false },
    { name: 'Prestação de contas', submenu: 'Exemplo', view: false, add: false, edit: false, del: false, limit: false },
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      costCenter: ['', Validators.required],
      project: [''],
      activity: ['']
    });
  }

  togglePermission(index: number, field: 'view' | 'add' | 'edit' | 'del' | 'limit') {
    this.modules[index][field] = !this.modules[index][field];
  }

  resetForm() {
    this.form.reset();
    // Reseta as checkboxes
    this.modules.forEach(m => { m.view = false; m.add = false; m.edit = false; m.del = false; m.limit = false; });
  }

  onSubmit() {
    if (this.form.valid) {
      console.log('Permission Data:', this.form.value, 'Matrix:', this.modules);
    } else {
      this.form.markAllAsTouched();
    }
  }
}
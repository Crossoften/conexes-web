// src/app/features/stakeholders/new/step1/step1.component.ts
import { Component, input, signal } from '@angular/core';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NgClass } from '@angular/common';

type Step1Tab = 'rateio' | 'bancario';

@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './step1.component.html',
  styleUrl: './step1.component.scss',
})
export class Step1Component {
  form = input.required<AbstractControl>();

  activeTab = signal<Step1Tab>('rateio');

  get f() { return (this.form() as any).controls; }

  isInvalid(field: string): boolean {
    const ctrl = this.f[field];
    return ctrl?.invalid && ctrl?.touched;
  }
}

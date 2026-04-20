// src/app/features/stakeholders/new/step2/step2.component.ts
import { Component, input, signal } from '@angular/core';
import { ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { NgClass } from '@angular/common';

type Step2Tab = 'privacidade' | 'compliance';

@Component({
  selector: 'app-step2',
  standalone: true,
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './step2.component.html',
  styleUrl: './step2.component.scss',
})
export class Step2Component {
  form = input.required<AbstractControl>();

  activeTab = signal<Step2Tab>('privacidade');

  get f() { return (this.form() as any).controls; }

  isInvalid(field: string): boolean {
    const ctrl = this.f[field];
    return ctrl?.invalid && ctrl?.touched;
  }
}

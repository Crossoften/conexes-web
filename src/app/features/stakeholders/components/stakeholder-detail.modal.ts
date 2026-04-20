// src/app/features/stakeholders/components/stakeholder-detail-modal/stakeholder-detail.modal.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';

type ModalTab = 'GERAIS' | 'RISCO' | 'OBSERVACOES';

@Component({
  selector: 'app-stakeholder-detail-modal',
  standalone: true,
  imports: [NgClass],
  templateUrl: './stakeholder-detail.modal.html',
  styleUrl: './stakeholder-detail.modal.scss',
})
export class StakeholderDetailModalComponent {
  // O ideal é tipar com a interface correta do Stakeholder do seu modelo
  @Input() stakeholder: any = null; 
  
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<any>();
  @Output() delete = new EventEmitter<any>();

  activeTab: ModalTab = 'GERAIS';

  setTab(tab: ModalTab) {
    this.activeTab = tab;
  }

  onClose() {
    this.close.emit();
  }

  onEdit() {
    this.edit.emit(this.stakeholder);
  }

  onDelete() {
    this.delete.emit(this.stakeholder);
  }
}
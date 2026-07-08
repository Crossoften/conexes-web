// src/app/features/purchases/components/purchase-request-action.modal.ts
import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators, ValidatorFn } from '@angular/forms';
import {
  PurchaseRequest,
  PurchaseRef,
  PurchaseActionKind,
  PurchaseActionResult,
  ApproverLevel,
} from '../purchases.model';

interface ActionConfig {
  title:        string;
  subtitle:     string;
  warning:      string;
  reasonLabel:  string;
  reasonRequired?: boolean;
  hasStage?:    boolean;
  hasBuyer?:    boolean;
  hasApprovers?: boolean;
}

const ACTION_CONFIG: Record<PurchaseActionKind, ActionConfig> = {
  cancel: {
    title: 'Cancelamento',
    subtitle: 'Requisição a ser cancelada.',
    warning: 'Ao cancelar, a requisição é retirada do fluxo de aprovações de compras e contratações e não mais estará disponível. Será possível reiniciar, porém a requisição voltará para a Etapa 1 e precisará passar por todas as demais etapas posteriormente.',
    reasonLabel: 'Motivo do cancelamento',
    reasonRequired: true,
  },
  reject: {
    title: 'Reprovar requisição',
    subtitle: 'Requisição a ser reprovada.',
    warning: 'Ao reprovar, a requisição retorna ao requisitante para ajustes. Informe o motivo da reprovação abaixo.',
    reasonLabel: 'Motivo da reprovação',
    reasonRequired: true,
  },
  restart: {
    title: 'Reiniciar requisição',
    subtitle: 'Requisição a ser reiniciada.',
    warning: 'Ao reiniciá-la, a requisição voltará para a Etapa 1 e precisará passar por todas as demais etapas posteriormente.',
    reasonLabel: 'Justificativa de reinício',
  },
  move: {
    title: 'Mover requisição',
    subtitle: 'Mover requisição para etapas anteriores.',
    warning: 'Ao retornar a requisição, os dados e aprovações já existentes nas etapas subsequentes serão perdidos. Preencha uma justificativa abaixo para continuar.',
    reasonLabel: 'Justificativa de movimentação',
    hasStage: true,
  },
  buyer: {
    title: 'Alterar comprador',
    subtitle: 'Requisição a ser aprovada.',
    warning: 'Ao alterar o responsável pela cotação, outro usuário poderá fazer alterações na cotação e enviá-la para aprovação.',
    reasonLabel: 'Justificativa de alteração',
    hasBuyer: true,
  },
  approvers: {
    title: 'Alterar aprovadores',
    subtitle: 'Requisição a ser aprovada.',
    warning: 'Defina os aprovadores por nível de alçada. Preencha uma justificativa abaixo para continuar.',
    reasonLabel: 'Justificativa de movimentação',
    hasApprovers: true,
  },
};

@Component({
  selector: 'app-purchase-request-action-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './purchase-request-action.modal.html',
  styleUrl: './purchase-request-action.modal.scss',
})
export class PurchaseRequestActionModalComponent implements OnChanges {
  @Input() request: PurchaseRequest | null = null;
  @Input() kind: PurchaseActionKind = 'cancel';
  @Input() users: PurchaseRef[] = [];
  @Input() submitting = false;

  @Output() close   = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<PurchaseActionResult>();

  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    reason:    [''],
    stage:     [''],
    buyerId:   [''],
    approver1: [''],
    approver2: [''],
    approver3: [''],
    approver4: [''],
  });

  get config(): ActionConfig {
    return ACTION_CONFIG[this.kind];
  }

  /** Etapas anteriores disponíveis para "mover" (1..currentStage-1; fallback 1..5). */
  get stageOptions(): number[] {
    const current = this.request?.currentStage ?? 6;
    const max = Math.max(1, Math.min(5, current - 1));
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  ngOnChanges(): void {
    const c = this.config;
    this.form.reset();

    this.setValidators('reason',  c.reasonRequired ? [Validators.required] : []);
    this.setValidators('stage',   c.hasStage ? [Validators.required] : []);
    this.setValidators('buyerId', c.hasBuyer ? [Validators.required] : []);
    this.setValidators('approver1', c.hasApprovers ? [Validators.required] : []);
  }

  private setValidators(name: 'reason' | 'stage' | 'buyerId' | 'approver1', validators: ValidatorFn[]): void {
    const control = this.form.controls[name];
    control.setValidators(validators);
    control.updateValueAndValidity({ emitEvent: false });
  }

  onClose(): void {
    this.close.emit();
  }

  fmtText(value?: string | null): string {
    return value && value.trim() ? value : 'N/A';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const reason = v.reason.trim() || undefined;
    let result: PurchaseActionResult;

    switch (this.kind) {
      case 'move':
        result = { kind: 'move', stage: Number(v.stage), reason };
        break;
      case 'buyer':
        result = { kind: 'buyer', buyerId: Number(v.buyerId), reason };
        break;
      case 'approvers': {
        const approvers: ApproverLevel[] = [v.approver1, v.approver2, v.approver3, v.approver4]
          .map((userId, i) => ({ level: i + 1, userId: Number(userId) }))
          .filter(a => a.userId > 0);
        result = { kind: 'approvers', approvers, reason };
        break;
      }
      default:
        result = { kind: this.kind, reason };
    }

    this.confirm.emit(result);
  }
}

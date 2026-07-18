// src/app/features/bank-accounts/components/bank-account-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, signal } from '@angular/core';
import { NgClass, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  BankAccount,
  Bank,
  BANK_ACCOUNT_TYPE_LABELS,
  BankAccountPayload,
} from '../bank-accounts.model';

type ModalTab = 'GERAIS' | 'PARAMS' | 'BOLETO';

@Component({
  selector: 'app-bank-account-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, DecimalPipe],
  templateUrl: './bank-account-detail.modal.html',
  styleUrl: './bank-account-detail.modal.scss',
})
export class BankAccountDetailModalComponent implements OnChanges {
  @Input() account: BankAccount | null = null;
  @Input() banks:   Bank[]             = [];
  @Input() mode:    'view' | 'edit'    = 'view';
  @Input() saving   = false;
  @Input() error:   string | null      = null;

  @Output() close       = new EventEmitter<void>();
  @Output() edit        = new EventEmitter<void>();
  @Output() delete      = new EventEmitter<BankAccount>();
  @Output() save        = new EventEmitter<BankAccountPayload>();

  activeTab: ModalTab = 'GERAIS';

  readonly typeLabels   = BANK_ACCOUNT_TYPE_LABELS;

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account'] && this.account) {
      this.form.patchValue({
        banco:                    this.account.bankId,
        tipoConta:                this.account.accountType,
        dataAbertura:             this.account.openDate,
        apelidoConta:             this.account.nickname,
        agenciaDigito:            this.account.agency,
        numeroContaDigito:        this.account.account,
        saldoInicial:             this.account.initialBalance,
        telefonePrincipal:        this.account.phone,
        telefoneCelular:          this.account.cellPhone,
        emailContato:             this.account.contactEmail,
        contato:                  this.account.contactName,
        contaContabil:            this.account.accountingAccount,
        tipoRecurso:              this.account.resourceType,
        dadosDiferentes:          this.account.isAccountHolderDataDifferent,
        numeroConvenioPagamento:  this.account.convPaymentNumber,
        cnpjConta:                this.account.accountCnpj,
        intervaloPagamento:       this.account.paymentInterval,
        tipoCnab:                 this.account.cnabType,
        hashApi:                  this.account.hash,
        codigoMovimento:          this.account.movementCode,
        sequencialNossoNumero:    this.account.boletoSequential,
        codigoBeneficiario:       this.account.beneficiaryCode,
        carteira:                 this.account.wallet,
        numeroConvenioCobranca:   this.account.convCollectionNumber,
        variacaoCarteira:         this.account.walletVariation,
        modalidade:               this.account.modality,
      });
    }

    if (changes['mode']) {
      if (this.mode === 'view') {
        this.form.disable();
      } else {
        this.form.enable();
        // Campos de boleto sempre desabilitados
        ['sequencialNossoNumero','codigoBeneficiario','carteira',
         'numeroConvenioCobranca','variacaoCarteira','modalidade'].forEach(f =>
          this.form.get(f)?.disable()
        );
      }
    }
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  get accountTypeLabel(): string {
    if (!this.account) return '';
    return this.typeLabels[this.account.accountType as keyof typeof this.typeLabels] ?? this.account.accountType;
  }

  get bankName(): string {
    const bank = this.banks.find(b => b.id === this.account?.bankId);
    return bank ? `${bank.code} — ${bank.name}` : this.account?.bankName ?? '—';
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  setTab(tab: ModalTab): void {
    this.activeTab = tab;
  }

  onClose(): void {
    this.close.emit();
  }

  onEdit(): void {
    this.edit.emit();
  }

  onDelete(): void {
    if (this.account) this.delete.emit(this.account);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    if (!this.account) return;

    const payload: BankAccountPayload = {
      bankId:            Number(v.banco)                    || this.account.bankId,
      entityId:          this.account.entityId,
      payingSourceId:    this.account.payingSourceId,
      accountType:       v.tipoConta                        || this.account.accountType,
      openDate:          v.dataAbertura                     ?? this.account.openDate,
      nickname:          v.apelidoConta                     ?? this.account.nickname,
      agency:            v.agenciaDigito                    ?? this.account.agency,
      account:           v.numeroContaDigito                ?? this.account.account,
      initialBalance:    Number(v.saldoInicial)             || this.account.initialBalance,
      phone:             v.telefonePrincipal                ?? this.account.phone,
      cellPhone:         v.telefoneCelular                  ?? this.account.cellPhone,
      contactEmail:      v.emailContato                     ?? this.account.contactEmail,
      contactName:       v.contato                          ?? this.account.contactName,
      accountingAccount: v.contaContabil                    ?? this.account.accountingAccount,
      resourceType:      v.tipoRecurso                      ?? this.account.resourceType,
      isAccountHolderDataDifferent: !!v.dadosDiferentes,
      convPaymentNumber: v.numeroConvenioPagamento          ?? this.account.convPaymentNumber,
      accountCnpj:       v.cnpjConta                        ?? this.account.accountCnpj,
      paymentInterval:   v.intervaloPagamento               ?? this.account.paymentInterval,
      cnabType:          v.tipoCnab                         ?? this.account.cnabType,
      hash:              v.hashApi                          ?? this.account.hash,
      paymentApi:        this.account.paymentApi            ?? '',
      movementCode:      v.codigoMovimento                  ?? this.account.movementCode,
      boletoSequential:  this.account.boletoSequential      ?? 0,
      beneficiaryCode:   this.account.beneficiaryCode       ?? '',
      wallet:            this.account.wallet                ?? '',
      convCollectionNumber: this.account.convCollectionNumber ?? '',
      walletVariation:   this.account.walletVariation       ?? '',
      modality:          this.account.modality              ?? '',
    };

    this.save.emit(payload);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private buildForm(): FormGroup {
    return this.fb.group({
      banco:                   ['', Validators.required],
      tipoConta:               ['', Validators.required],
      dataAbertura:            ['', Validators.required],
      apelidoConta:            ['', Validators.required],
      agenciaDigito:           ['', Validators.required],
      numeroContaDigito:       ['', Validators.required],
      saldoInicial:            ['', Validators.required],
      telefonePrincipal:       ['', Validators.required],
      telefoneCelular:         ['', Validators.required],
      emailContato:            ['', [Validators.required, Validators.email]],
      contato:                 [''],
      contaContabil:           [''],
      tipoRecurso:             [''],
      dadosDiferentes:         [false],
      numeroConvenioPagamento: [''],
      cnpjConta:               [''],
      intervaloPagamento:      [''],
      tipoCnab:                [''],
      hashApi:                 [''],
      codigoMovimento:         [''],
      sequencialNossoNumero:   [{ value: '', disabled: true }],
      codigoBeneficiario:      [{ value: '', disabled: true }],
      carteira:                [{ value: '', disabled: true }],
      numeroConvenioCobranca:  [{ value: '', disabled: true }],
      variacaoCarteira:        [{ value: '', disabled: true }],
      modalidade:              [{ value: '', disabled: true }],
    });
  }
}
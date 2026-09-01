// src/app/features/bank-accounts/components/bank-account-detail.modal.ts
import { Component, EventEmitter, Input, Output, OnChanges, OnInit, SimpleChanges, signal } from '@angular/core';
import { NgClass, DecimalPipe, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  BankAccount,
  Bank,
  BANK_ACCOUNT_TYPE_LABELS,
  BANK_ACCOUNT_STATUS_CONFIG,
  BANK_ACCOUNT_STATUS_OPTIONS,
  BankAccountPayload,
  AccountPlanOption,
} from '../bank-accounts.model';
import { BankAccountsService } from '../bank-accounts.service';
import { Entity } from '../new/bank-account-new.page';
import { maskCnpj, maskMoney, maskPhone, formatDecimalBR, parseDecimalBR, onlyDigits } from '../../../shared/utils/format';

type ModalTab = 'GERAIS' | 'PARAMS' | 'BOLETO';

@Component({
  selector: 'app-bank-account-detail-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, DecimalPipe, DatePipe],
  templateUrl: './bank-account-detail.modal.html',
  styleUrl: './bank-account-detail.modal.scss',
})
export class BankAccountDetailModalComponent implements OnInit, OnChanges {
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

  readonly typeLabels     = BANK_ACCOUNT_TYPE_LABELS;
  readonly statusConfig   = BANK_ACCOUNT_STATUS_CONFIG;
  readonly statusOptions  = BANK_ACCOUNT_STATUS_OPTIONS;

  readonly entities = signal<Entity[]>([]);
  // CB-fix: contas analíticas do Plano de Contas para o select "Conta contábil".
  readonly accountPlans = signal<AccountPlanOption[]>([]);

  form: FormGroup;

  constructor(private fb: FormBuilder, private svc: BankAccountsService) {
    this.form = this.buildForm();
  }

  ngOnInit(): void {
    this.svc.getEntities().subscribe({
      next: entities => this.entities.set(entities),
      error: () => {},
    });

    // CB-fix: contas analíticas do Plano de Contas para o select "Conta contábil".
    this.svc.getAnalyticAccounts().subscribe({
      next: accounts => this.accountPlans.set(accounts),
      error: () => this.accountPlans.set([]),
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['account'] && this.account) {
      this.form.patchValue({
        banco:                    this.account.bankId,
        fontePagadora:            this.account.payingSourceId ?? '',
        tipoConta:                this.account.accountType,
        status:                   this.account.status,
        // input type=date exige yyyy-MM-dd — fatiamos o ISO (evita input vazio).
        dataAbertura:             this.account.openDate?.substring(0, 10) ?? '',
        apelidoConta:             this.account.nickname,
        agenciaDigito:            this.account.agency,
        numeroContaDigito:        this.account.account,
        saldoInicial:             formatDecimalBR(this.account.initialBalance),
        telefonePrincipal:        maskPhone(this.account.phone),
        telefoneCelular:          maskPhone(this.account.cellPhone),
        emailContato:             this.account.contactEmail,
        contaContabil:            this.account.accountingAccount,
        tipoRecurso:              this.account.resourceType,
        dadosDiferentes:          this.account.isAccountHolderDataDifferent,
        numeroConvenioPagamento:  this.account.convPaymentNumber,
        cnpjConta:                maskCnpj(this.account.accountCnpj),
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

  onPhoneInput(event: Event, control: 'telefonePrincipal' | 'telefoneCelular'): void {
    const el = event.target as HTMLInputElement;
    el.value = maskPhone(el.value);
    this.form.get(control)?.setValue(el.value, { emitEvent: false });
  }

  onMoneyInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    el.value = maskMoney(el.value);
    this.form.get('saldoInicial')?.setValue(el.value, { emitEvent: false });
  }

  onCnpjInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    el.value = maskCnpj(el.value);
    this.form.get('cnpjConta')?.setValue(el.value, { emitEvent: false });
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
      payingSourceId:    Number(v.fontePagadora) > 0 ? Number(v.fontePagadora) : this.account.entityId,
      accountType:       v.tipoConta                        || this.account.accountType,
      status:            v.status                           ?? this.account.status,
      openDate:          v.dataAbertura                     ?? this.account.openDate,
      nickname:          v.apelidoConta                     ?? this.account.nickname,
      agency:            v.agenciaDigito                    ?? this.account.agency,
      account:           v.numeroContaDigito                ?? this.account.account,
      initialBalance:    parseDecimalBR(v.saldoInicial),
      phone:             onlyDigits(v.telefonePrincipal),
      cellPhone:         onlyDigits(v.telefoneCelular),
      contactEmail:      v.emailContato                     ?? this.account.contactEmail,
      contactName:       this.account.contactName           ?? '',
      accountingAccount: v.contaContabil                    ?? this.account.accountingAccount,
      resourceType:      (v.tipoRecurso || this.account.resourceType) ?? '',
      isAccountHolderDataDifferent: !!v.dadosDiferentes,
      convPaymentNumber: v.numeroConvenioPagamento          ?? this.account.convPaymentNumber,
      accountCnpj:       onlyDigits(v.cnpjConta),
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
      fontePagadora:           [''],
      tipoConta:               ['', Validators.required],
      status:                  ['Active'],
      dataAbertura:            ['', Validators.required],
      apelidoConta:            ['', Validators.required],
      agenciaDigito:           ['', Validators.required],
      numeroContaDigito:       ['', Validators.required],
      saldoInicial:            ['', Validators.required],
      telefonePrincipal:       ['', Validators.required],
      telefoneCelular:         ['', Validators.required],
      emailContato:            ['', [Validators.required, Validators.email]],
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
// src/app/features/bank-accounts/new/bank-account-new.page.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgClass } from '@angular/common';
import { BankAccountsService } from '../bank-accounts.service';
import { BankAccountsStore } from '../bank-accounts.store';
import { BankAccountPayload, Bank } from '../bank-accounts.model';

type BankAccountTab = 'PARAMS' | 'BOLETO';

export interface Entity {
  id:        number;
  legalName: string;
  tradeName: string;
}

@Component({
  selector: 'app-bank-account-new',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgClass],
  providers: [BankAccountsStore],
  templateUrl: './bank-account-new.page.html',
  styleUrl: './bank-account-new.page.scss',
})
export class BankAccountNewPage implements OnInit {
  private fb    = inject(FormBuilder);
  private router = inject(Router);
  private svc   = inject(BankAccountsService);

  readonly loading      = signal(false);
  readonly errorMsg     = signal<string | null>(null);
  readonly entities     = signal<Entity[]>([]);
  readonly banks        = signal<Bank[]>([]);
  readonly loadingLists = signal(true);

  activeTab: BankAccountTab = 'PARAMS';

  form: FormGroup = this.fb.group({
    banco:             ['', Validators.required],
    entidadeDona:      ['', Validators.required], // FA-02: entidade dona da conta (obrigatória)
    fontePagadora:     [''],                       // FA-02: Fonte Pagadora agora é opcional e separada
    tipoConta:         ['', Validators.required],
    dataAbertura:      ['', Validators.required],
    apelidoConta:      ['', Validators.required],
    agenciaDigito:     ['', Validators.required],
    numeroContaDigito: ['', Validators.required],
    saldoInicial:      ['', Validators.required],
    telefonePrincipal: ['', Validators.required],
    telefoneCelular:   ['', Validators.required],
    emailContato:      ['', [Validators.required, Validators.email]],
    contaContabil1:    [''],
    contato:           [''],
    tipoRecurso:       [''],
    contaContabil2:    [''],
    dadosDiferentes:   [false],
    numeroConvenioPagamento:  [''],
    cnpjConta:                [''],
    intervaloPagamentoCnab1:  [''],
    hashApiPagamentos:        [''],
    codigoMovimento:          [''],
    intervaloPagamentoCnab2:  [''],
    sequencialNossoNumero:  [{ value: '', disabled: true }],
    codigoBeneficiario:     [{ value: '', disabled: true }],
    carteira:               [{ value: '', disabled: true }],
    numeroConvenioCobranca: [{ value: '', disabled: true }],
    variacaoCarteira:       [{ value: '', disabled: true }],
    modalidade:             [{ value: '', disabled: true }],
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Bancos: carrega do endpoint dedicado
    this.svc.getAllBanks().subscribe({
      next: banks => this.banks.set(banks),
      error: () => {},
    });

    // Entidades: carrega do back
    this.svc.getEntities().subscribe({
      next: entities => {
        this.entities.set(entities);
        this.loadingLists.set(false);
      },
      error: () => this.loadingLists.set(false),
    });
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  setTab(tab: BankAccountTab): void {
    this.activeTab = tab;
  }

  resetForm(): void {
    this.form.reset({ dadosDiferentes: false });
    this.activeTab = 'PARAMS';
    this.errorMsg.set(null);
  }

  /** FA-02: interpreta valor monetário no padrão brasileiro ("1.000,00" → 1000). */
  private parseMoney(value: any): number {
    if (typeof value === 'number') return value;
    const s = String(value ?? '').trim();
    if (!s) return 0;
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Preencha os campos obrigatórios destacados (banco, entidade dona, tipo de conta e saldo inicial).');
      return;
    }

    const v = this.form.value;

    this.loading.set(true);
    this.errorMsg.set(null);

    const paying = Number(v.fontePagadora);
    const payload: BankAccountPayload = {
      bankId:            Number(v.banco)           || 0,
      entityId:          Number(v.entidadeDona)    || 0, // FA-02: entidade DONA da conta
      payingSourceId:    paying > 0 ? paying : undefined, // FA-02: Fonte Pagadora opcional, separada
      accountType:       v.tipoConta               || 'Checking',
      status:            'Active',
      openDate:          v.dataAbertura            ?? '',
      nickname:          v.apelidoConta            ?? '',
      agency:            v.agenciaDigito           ?? '',
      account:           v.numeroContaDigito       ?? '',
      initialBalance:    this.parseMoney(v.saldoInicial),
      phone:             v.telefonePrincipal       ?? '',
      cellPhone:         v.telefoneCelular         ?? '',
      contactEmail:      v.emailContato            ?? '',
      contactName:       v.contato                 ?? '',
      accountingAccount: v.contaContabil1          ?? '',
      resourceType:      v.tipoRecurso             ?? '',
      isAccountHolderDataDifferent: !!v.dadosDiferentes,
      convPaymentNumber: v.numeroConvenioPagamento ?? '',
      accountCnpj:       v.cnpjConta              ?? '',
      paymentInterval:   v.intervaloPagamentoCnab1 ?? '',
      cnabType:          v.intervaloPagamentoCnab2 ?? '',
      hash:              v.hashApiPagamentos       ?? '',
      paymentApi:        '',
      movementCode:      v.codigoMovimento         ?? '',
      boletoSequential:  0,
      beneficiaryCode:   '',
      wallet:            '',
      convCollectionNumber: '',
      walletVariation:   '',
      modality:          '',
    };

    this.svc.create(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/bank-accounts']);
      },
      error: err => {
        this.loading.set(false);
        const raw = err?.error?.message;
        const msg = Array.isArray(raw) ? raw.join(', ') : (raw ?? '');
        // FA-02: não expor mensagem técnica de API (ex.: "entityId ... GET /v1/institutional/entities").
        if (/entityid/i.test(msg) || /\/v1\//.test(msg)) {
          this.errorMsg.set('Selecione a Fonte Pagadora (entidade responsável pela conta) antes de salvar.');
        } else {
          this.errorMsg.set(msg || 'Não foi possível salvar a conta bancária. Verifique os dados e tente novamente.');
        }
      },
    });
  }
}

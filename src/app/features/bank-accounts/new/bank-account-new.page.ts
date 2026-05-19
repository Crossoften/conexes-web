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

  // Lista temporária — substituir quando GET /v1/banks estiver disponível no back
  private readonly BANKS_FALLBACK: Bank[] = [
    { id: 1,  code: '001', name: 'Banco do Brasil',         status: 'Active' },
    { id: 2,  code: '033', name: 'Santander',               status: 'Active' },
    { id: 3,  code: '041', name: 'Banrisul',                status: 'Active' },
    { id: 4,  code: '077', name: 'Banco Inter',             status: 'Active' },
    { id: 5,  code: '104', name: 'Caixa Econômica Federal', status: 'Active' },
    { id: 6,  code: '208', name: 'BTG Pactual',             status: 'Active' },
    { id: 7,  code: '212', name: 'Banco Original',          status: 'Active' },
    { id: 8,  code: '237', name: 'Bradesco',                status: 'Active' },
    { id: 9,  code: '260', name: 'Nu Pagamentos (Nubank)',   status: 'Active' },
    { id: 10, code: '290', name: 'PagSeguro (PagBank)',      status: 'Active' },
    { id: 11, code: '336', name: 'C6 Bank',                 status: 'Active' },
    { id: 12, code: '341', name: 'Itaú Unibanco',           status: 'Active' },
    { id: 13, code: '380', name: 'PicPay',                  status: 'Active' },
    { id: 14, code: '422', name: 'Banco Safra',             status: 'Active' },
    { id: 15, code: '633', name: 'Banco Rendimento',        status: 'Active' },
    { id: 16, code: '748', name: 'Sicredi',                 status: 'Active' },
    { id: 17, code: '756', name: 'Sicoob',                  status: 'Active' },
  ];

  form: FormGroup = this.fb.group({
    banco:             ['', Validators.required],
    fontePagadora:     ['', Validators.required],
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
    telefoneContato:   [''],
    celularContato:    [''],
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
    // Bancos: usa fallback imediato, atualiza se o back retornar dados
    this.banks.set(this.BANKS_FALLBACK);

    this.svc.getAll().subscribe({
      next: res => {
        const banks = Array.isArray(res) ? [] : ((res as any).banks ?? []);
        if (banks.length > 0) this.banks.set(banks);
      },
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

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const v = this.form.value;

    const payload: BankAccountPayload = {
      bankId:            Number(v.banco)           || 0,
      entityId:          Number(v.fontePagadora)   || 0,
      payingSourceId:    Number(v.fontePagadora)   || 0,
      accountType:       v.tipoConta               || 'Checking',
      openDate:          v.dataAbertura            ?? '',
      nickname:          v.apelidoConta            ?? '',
      agency:            v.agenciaDigito           ?? '',
      account:           v.numeroContaDigito       ?? '',
      initialBalance:    Number(v.saldoInicial)    || 0,
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
        const msg = err?.error?.message ?? 'Erro ao salvar conta bancária. Tente novamente.';
        this.errorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}

// src/app/features/entity-registry/components/entity-registry-history.modal.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { EntityHistoryEntry } from '../entity-registry.model';
import { maskCnpj, maskPhone } from '../../../shared/utils/format';

/** BK-9: modal de histórico de alterações da entidade (timeline simples). */
@Component({
  selector: 'app-entity-registry-history-modal',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './entity-registry-history.modal.html',
  styleUrl: './entity-registry-history.modal.scss',
})
export class EntityRegistryHistoryModalComponent {
  @Input() entityName = '';
  @Input() entries: EntityHistoryEntry[] = [];
  @Input() loading = false;

  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  // ── Humanização (BK-9) ──────────────────────────────────────────────────────
  private readonly ACTION_LABELS: Record<string, string> = {
    update: 'Atualização',
    create: 'Criação',
    created: 'Criação',
    delete: 'Exclusão',
    deleted: 'Exclusão',
    updated: 'Atualização',
  };

  private readonly FIELD_LABELS: Record<string, string> = {
    cnpj:                  'CNPJ',
    legalName:             'Razão Social',
    tradeName:             'Nome Fantasia',
    status:                'Status',
    stateRegistration:     'Inscrição Estadual',
    constitutionDate:      'Data de Constituição',
    zipCode:               'CEP',
    address:               'Endereço',
    number:                'Número',
    complement:            'Complemento',
    district:              'Bairro',
    city:                  'Cidade',
    state:                 'Estado (UF)',
    mainPhone:             'Telefone Principal',
    cellPhone:             'Telefone Celular',
    directorEmail:         'E-mail do Dirigente',
    digitalCertPassword:   'Senha do Certificado',
    logoUrl:               'Logo',
    accountantName:        'Contador — Nome',
    accountantCpf:         'Contador — CPF',
    accountantCrc:         'Contador — CRC',
    accountantZipCode:     'Contador — CEP',
    accountantAddress:     'Contador — Endereço',
    accountantNumber:      'Contador — Número',
    accountantComplement:  'Contador — Complemento',
    accountantPhone:       'Contador — Telefone',
    accountantEmail:       'Contador — E-mail',
    accountantOffice:      'Contador — Escritório',
    accountantOfficePhone: 'Contador — Telefone do Escritório',
  };

  private readonly STATUS_LABELS: Record<string, string> = {
    Active: 'Ativo', Pending: 'Pendente', Inactive: 'Inativo',
  };

  actionLabel(action: string | undefined): string {
    if (!action) return 'Alteração';
    return this.ACTION_LABELS[action.toLowerCase()] ?? action;
  }

  fieldLabel(field: string): string {
    return this.FIELD_LABELS[field] ?? field;
  }

  formatValue(field: string, value: string): string {
    if (value == null || value === '' || value === 'null') return '—';

    if (field === 'status') return this.STATUS_LABELS[value] ?? value;
    if (field === 'cnpj')   return maskCnpj(value);
    if (['mainPhone', 'cellPhone', 'accountantPhone', 'accountantOfficePhone'].includes(field)) {
      return maskPhone(value);
    }
    if (['zipCode', 'accountantZipCode'].includes(field)) return this.maskCep(value);
    if (field === 'accountantCpf') return this.maskCpf(value);
    return value;
  }

  private maskCep(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 8);
    return d.length > 5 ? d.replace(/(\d{5})(\d{1,3})/, '$1-$2') : d || v;
  }

  private maskCpf(v: string): string {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length !== 11) return v;
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
}

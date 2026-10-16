import { TestBed } from '@angular/core/testing';
import { PermissionsService } from './permissions.service';
import { AuthService, EffectivePermission } from './auth.service';

function perm(partial: Partial<EffectivePermission>): EffectivePermission {
  return {
    module: '',
    subMenu: null,
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    isUnlimited: false,
    ...partial,
  };
}

function setup(user: { role: string; effectivePermissions: EffectivePermission[] } | null): PermissionsService {
  const authStub = { user: () => user } as unknown as AuthService;
  TestBed.configureTestingModule({
    providers: [PermissionsService, { provide: AuthService, useValue: authStub }],
  });
  return TestBed.inject(PermissionsService);
}

describe('PermissionsService — "Ilimitado = acesso total"', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('Master faz bypass total, ignorando a matriz', () => {
    const svc = setup({ role: 'Master', effectivePermissions: [] });
    expect(svc.canDelete('Financeiro')).toBeTrue();
    expect(svc.canView('Qualquer', 'Coisa')).toBeTrue();
  });

  it('nega por padrão enquanto não carregou (lista vazia, não-Master)', () => {
    const svc = setup({ role: 'Operational', effectivePermissions: [] });
    expect(svc.canView('Compras')).toBeFalse();
  });

  it('Ilimitado concede qualquer ação no escopo, mesmo com os quatro flags em false', () => {
    const svc = setup({
      role: 'Operational',
      effectivePermissions: [perm({ module: 'Compras', subMenu: 'Requisições', isUnlimited: true })],
    });
    expect(svc.canView('Compras', 'Requisições')).toBeTrue();
    expect(svc.canCreate('Compras', 'Requisições')).toBeTrue();
    expect(svc.canEdit('Compras', 'Requisições')).toBeTrue();
    expect(svc.canDelete('Compras', 'Requisições')).toBeTrue();
  });

  it('nível de módulo: Ilimitado em qualquer subMenu libera o módulo', () => {
    const svc = setup({
      role: 'Operational',
      effectivePermissions: [perm({ module: 'Financeiro', subMenu: 'Contas a Pagar', isUnlimited: true })],
    });
    expect(svc.canView('Financeiro')).toBeTrue();
    expect(svc.canCreate('Financeiro')).toBeTrue();
  });

  it('sem Ilimitado, respeita exatamente os flags', () => {
    const svc = setup({
      role: 'Operational',
      effectivePermissions: [perm({ module: 'Financeiro', subMenu: 'Contas a Pagar', canView: true })],
    });
    expect(svc.canView('Financeiro', 'Contas a Pagar')).toBeTrue();
    expect(svc.canDelete('Financeiro', 'Contas a Pagar')).toBeFalse();
  });

  it('Ilimitado não é bypass global: não libera módulo sem entrada própria', () => {
    const svc = setup({
      role: 'Operational',
      effectivePermissions: [perm({ module: 'Compras', subMenu: 'Requisições', isUnlimited: true })],
    });
    expect(svc.canView('Financeiro')).toBeFalse();
    expect(svc.canView('Usuários e Permissões', 'Usuários')).toBeFalse();
  });
});

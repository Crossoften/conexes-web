// src/app/features/general-settings/general-settings.routes.ts
//
// TR-08 / I041: a página de Configurações gerais já existia e o backend já
// persistia a preferência, mas a rota nunca foi registrada — o item do menu
// apontava para um caminho sem página e a tela respondia 404, bloqueando o
// acesso à opção de descrição da transferência.
import { Routes } from '@angular/router';
import { GeneralSettingsPage } from './general-settings.page';

export const generalSettingsRoutes: Routes = [
  {
    path: '',
    component: GeneralSettingsPage,
  },
];

// src/app/features/quotations/quotations-shell.page.ts
import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { QUOTATION_STAGES } from './quotations.model';

@Component({
  selector: 'app-quotations-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass],
  template: `
    <div class="quotations-page">

      <!-- Cabeçalho -->
      <div class="page-header">
        <h1 class="page-title">Requisições de compras</h1>
        <button class="btn-novo" routerLink="new">
          <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
            <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Nova requisição
        </button>
      </div>

      <!-- Barra de etapas -->
      <div class="stages-bar">
        @for (stage of stages; track stage.path; let i = $index) {
          <a class="stage-tab"
            [routerLink]="stage.path"
            routerLinkActive="stage-tab--active">
            <span class="stage-tab__label">{{ stage.label }}</span>
            <span class="stage-tab__sub">{{ stage.subLabel }}</span>
          </a>
        }
      </div>

      <!-- Conteúdo da etapa ativa -->
      <router-outlet />

    </div>
  `,
  styles: [`
    .quotations-page { display: flex; flex-direction: column; gap: 20px; }

    .page-header {
      display: flex; align-items: center; justify-content: space-between;
    }

    .page-title {
      font-family: var(--font-display);
      font-size: 22px; font-weight: 700;
      color: var(--text-primary); letter-spacing: -0.3px;
    }

    .btn-novo {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 22px; background: var(--brand-orange);
      color: #fff; border: none; border-radius: 50px;
      font-size: 14px; font-weight: 600; font-family: var(--font-body);
      cursor: pointer; box-shadow: 0 4px 14px rgba(249,115,22,.3);
      transition: background var(--transition), transform 100ms;

      &:hover { background: #EA6B0A; transform: translateY(-1px); }
      &:active { transform: translateY(0); }
    }

    .stages-bar {
      display: flex;
      background: var(--surface-primary);
      border: 1.5px solid var(--surface-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-card);
    }

    /* I011: este bloco é 'styles:' INLINE e o projeto não define inlineStyleLanguage
       no angular.json — ou seja, ele é compilado como CSS puro, não SCSS. O aninhamento
       "&--active" (concatenação de sufixo) só existe no SCSS: em CSS a regra inteira era
       descartada, então a etapa ativa recebia a classe e continuava sem cor nenhuma.
       Por isso os seletores abaixo são escritos por extenso. */
    .stage-tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 14px 8px;
      text-decoration: none;
      border-right: 1px solid var(--surface-border);
      border-bottom: 3px solid transparent;
      cursor: pointer;
      transition: background var(--transition), border-color var(--transition);
      gap: 3px;
    }

    .stage-tab:last-child { border-right: none; }
    .stage-tab:hover:not(.stage-tab--active) { background: #FAFAFE; }

    .stage-tab--active {
      background: var(--brand-purple-light, #F3F0FF);
      border-bottom-color: var(--brand-purple);
    }
    .stage-tab--active .stage-tab__label { color: var(--brand-purple); font-weight: 700; }
    .stage-tab--active .stage-tab__sub   { color: var(--brand-purple); }

    .stage-tab__label {
      font-size: 13px; font-weight: 600;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .stage-tab__sub {
      font-size: 11px;
      color: var(--text-muted);
      text-align: center;
      line-height: 1.3;
    }
  `],
})
export class QuotationsShellPage {
  readonly stages = QUOTATION_STAGES;
}

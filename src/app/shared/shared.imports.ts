// src/app/shared/shared.imports.ts
// Barrel de imports — use em qualquer feature component
// import { SHARED_IMPORTS } from '@shared/shared.imports';

import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// Re-exporta tudo que os componentes de feature precisam
export const SHARED_IMPORTS = [
  CommonModule,
  ReactiveFormsModule,
  FormsModule,
  RouterModule,
] as const;

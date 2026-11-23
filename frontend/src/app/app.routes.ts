import { Routes } from '@angular/router';
import { authGuard } from './auth.service';
import { AuthPageComponent } from './auth-page.component';
import { ChatComponent } from './chat.component';
import { InboxComponent } from './inbox.component';
import { LandingComponent } from './landing.component';
import { PeopleComponent } from './people.component';
import { ProfileComponent } from './profile.component';
import { SettingsComponent } from './settings.component';
import { WorkspaceComponent } from './workspace.component';

export const routes: Routes = [
  { path: '', component: LandingComponent, title: 'TalkyApp | Conecta con quien importa' },
  { path: 'login', component: AuthPageComponent, data: { mode: 'login' }, title: 'Iniciar sesión | TalkyApp' },
  { path: 'register', component: AuthPageComponent, data: { mode: 'register' }, title: 'Crear cuenta | TalkyApp' },
  {
    path: 'app',
    component: WorkspaceComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inbox' },
      { path: 'inbox', component: InboxComponent, title: 'Conversaciones | TalkyApp' },
      { path: 'chat/:id', component: ChatComponent, title: 'Chat | TalkyApp' },
      { path: 'people', component: PeopleComponent, title: 'Buscar personas | TalkyApp' },
      { path: 'profile', component: ProfileComponent, title: 'Mi perfil | TalkyApp' },
      { path: 'settings', component: SettingsComponent, title: 'Configuración | TalkyApp' },
    ],
  },
  { path: '**', redirectTo: '' },
];

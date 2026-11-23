import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <main class="min-h-screen overflow-hidden bg-[#080914] text-white">
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div class="absolute -right-36 -top-56 h-[36rem] w-[36rem] rounded-full bg-violet-700/20 blur-[130px]"></div>
        <div class="absolute -bottom-72 left-1/4 h-[36rem] w-[36rem] rounded-full bg-indigo-800/15 blur-[130px]"></div>
      </div>

      <header class="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <a routerLink="/" class="flex items-center gap-3 text-lg font-bold tracking-tight">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 shadow-lg shadow-violet-900/50">
            <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5" aria-hidden="true"><path d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75v7.5A2.75 2.75 0 0 1 16.25 16H11l-4.8 4v-4.2A2.75 2.75 0 0 1 5 13.25v-7.5Z" fill="currentColor"/></svg>
          </span>
          Talky<span class="text-violet-300">App</span>
        </a>
        <nav class="flex items-center gap-3">
          <a routerLink="/login" class="hidden rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:text-white sm:inline-flex">Iniciar sesión</a>
          <a routerLink="/register" class="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-violet-900/30 transition hover:bg-violet-500">Crear cuenta</a>
        </nav>
      </header>

      <section class="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-32 lg:pt-20">
        <div class="max-w-2xl">
          <span class="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/5 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-violet-200">
            <span class="h-1.5 w-1.5 rounded-full bg-violet-400"></span>
            MENSAJERÍA SIMPLE PARA PC
          </span>
          <h1 class="mt-7 text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-[4.5rem]">
            Conecta con las personas que <span class="bg-gradient-to-r from-violet-300 to-indigo-400 bg-clip-text text-transparent">importan.</span>
          </h1>
          <p class="mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Conversaciones directas, archivos compartidos y mensajes en tiempo real.
            Sin número de teléfono: solo tú y las personas que quieres encontrar.
          </p>
          <div class="mt-9 flex flex-wrap gap-3">
            <a routerLink="/register" class="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 font-semibold shadow-xl shadow-violet-950/50 transition hover:-translate-y-0.5 hover:bg-violet-500">
              Empieza a conversar <span aria-hidden="true">→</span>
            </a>
            <a routerLink="/login" class="rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3.5 font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06]">Ya tengo una cuenta</a>
          </div>
          <div class="mt-9 flex items-center gap-3 text-sm text-slate-500">
            <span class="flex -space-x-2">
              <span class="grid h-8 w-8 place-items-center rounded-full border-2 border-[#080914] bg-indigo-500 text-xs font-bold text-white">T</span>
              <span class="grid h-8 w-8 place-items-center rounded-full border-2 border-[#080914] bg-fuchsia-500 text-xs font-bold text-white">A</span>
              <span class="grid h-8 w-8 place-items-center rounded-full border-2 border-[#080914] bg-cyan-600 text-xs font-bold text-white">M</span>
            </span>
            <span>Tu próxima conversación empieza aquí.</span>
          </div>
        </div>

        <div class="relative mx-auto w-full max-w-xl">
          <div class="absolute -inset-8 rounded-[2rem] bg-violet-600/15 blur-3xl"></div>
          <div class="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d1020] p-3 shadow-2xl shadow-black/60 sm:p-4">
            <div class="flex h-9 items-center gap-1.5 border-b border-white/[0.06] px-2">
              <span class="h-2.5 w-2.5 rounded-full bg-rose-400/80"></span><span class="h-2.5 w-2.5 rounded-full bg-amber-300/80"></span><span class="h-2.5 w-2.5 rounded-full bg-emerald-400/80"></span>
              <span class="ml-3 text-xs font-medium text-slate-500">TalkyApp · Conversaciones</span>
            </div>
            <div class="grid min-h-[350px] grid-cols-[150px_1fr] sm:min-h-[390px] sm:grid-cols-[190px_1fr]">
              <aside class="border-r border-white/[0.06] p-3 sm:p-4">
                <p class="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Conversaciones</p>
                <div class="space-y-2.5">
                  <div class="flex items-center gap-2 rounded-xl bg-violet-500/10 p-2">
                    <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-700 text-xs font-semibold">JP</span>
                    <span class="min-w-0"><span class="block truncate text-xs font-semibold text-white">Juan Pérez</span><span class="block truncate text-[10px] text-slate-500">¡Hola! ¿Cómo estás?</span></span>
                  </div>
                  <div class="flex items-center gap-2 p-2"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pink-800 text-xs font-semibold">ML</span><span class="min-w-0"><span class="block truncate text-xs font-semibold text-slate-300">María López</span><span class="block truncate text-[10px] text-slate-600">Te envié el archivo</span></span></div>
                  <div class="flex items-center gap-2 p-2"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-800 text-xs font-semibold">CB</span><span class="min-w-0"><span class="block truncate text-xs font-semibold text-slate-300">Carlos Blanco</span><span class="block truncate text-[10px] text-slate-600">Nos vemos pronto</span></span></div>
                  <div class="flex items-center gap-2 p-2"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange-800 text-xs font-semibold">AS</span><span class="min-w-0"><span class="block truncate text-xs font-semibold text-slate-300">Ana Suárez</span><span class="block truncate text-[10px] text-slate-600">Gracias 😊</span></span></div>
                </div>
              </aside>
              <div class="flex min-w-0 flex-col p-3 sm:p-5">
                <div class="flex items-center gap-2 border-b border-white/[0.06] pb-3">
                  <span class="grid h-8 w-8 place-items-center rounded-full bg-cyan-700 text-xs font-semibold">JP</span>
                  <div><p class="text-xs font-semibold">Juan Pérez</p><p class="text-[10px] text-emerald-400">Disponible para conversar</p></div>
                </div>
                <div class="flex flex-1 flex-col justify-end gap-3 py-5">
                  <div class="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-white/[0.06] bg-[#171a2b] px-3.5 py-2.5 text-xs leading-5 text-slate-300">¡Hola! ¿Cómo estás? Te comparto las notas de hoy.</div>
                  <div class="max-w-[85%] self-end rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-indigo-600 px-3.5 py-2.5 text-xs leading-5 text-white">¡Hola! Muy bien, gracias. Ya las estoy revisando 🙌</div>
                  <div class="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-white/[0.06] bg-[#171a2b] px-3.5 py-2.5 text-xs text-slate-300">Perfecto, hablamos luego.</div>
                  <div class="flex items-center gap-2 self-start text-[10px] text-slate-500"><span class="flex gap-0.5"><i class="h-1 w-1 animate-pulse rounded-full bg-violet-400"></i><i class="h-1 w-1 animate-pulse rounded-full bg-violet-400 [animation-delay:150ms]"></i><i class="h-1 w-1 animate-pulse rounded-full bg-violet-400 [animation-delay:300ms]"></i></span>Mensajes en tiempo real</div>
                </div>
                <div class="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#090b16] px-3 py-2.5">
                  <span class="text-base text-slate-500">＋</span><span class="flex-1 text-[10px] text-slate-600">Escribe un mensaje...</span><span class="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-xs">➤</span>
                </div>
              </div>
            </div>
          </div>
          <div class="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-xl border border-white/10 bg-[#141729] px-4 py-3 shadow-xl sm:flex">
            <span class="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/15 text-lg text-violet-300">↗</span>
            <span><span class="block text-xs font-semibold">Tus archivos, a un clic</span><span class="block text-[10px] text-slate-500">Envía y descarga con facilidad</span></span>
          </div>
        </div>
      </section>

      <section class="relative mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div class="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Todo lo que necesitas</p><h2 class="mt-3 text-3xl font-bold tracking-tight">Una forma más sencilla de estar cerca.</h2></div>
          <p class="max-w-md text-sm leading-6 text-slate-500">Encuentra a alguien, abre un chat y deja que la conversación fluya.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (feature of features; track feature.title) {
            <article class="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-violet-400/20 hover:bg-white/[0.04]">
              <span class="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-xl text-violet-300">{{ feature.icon }}</span>
              <h3 class="mt-5 font-semibold">{{ feature.title }}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-500">{{ feature.description }}</p>
            </article>
          }
        </div>
      </section>

      <footer class="relative border-t border-white/[0.06] px-6 py-7 text-center text-xs text-slate-600">
        TalkyApp · Mensajería simple para PC
      </footer>
    </main>
  `,
})
export class LandingComponent {
  protected readonly features = [
    { icon: '◉', title: 'Chats uno a uno', description: 'Conversaciones directas y claras con las personas que encuentras.' },
    { icon: '↗', title: 'Comparte archivos', description: 'Adjunta documentos y descárgalos desde el mismo chat.' },
    { icon: 'ϟ', title: 'En tiempo real', description: 'Tus mensajes llegan al instante mientras conversas.' },
    { icon: '⌕', title: 'Encuentra personas', description: 'Busca por nombre o nombre de usuario y empieza a hablar.' },
  ];
}

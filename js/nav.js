// js/nav.js — scroll behaviour + auth state in nav
import { auth, profiles } from './supabase.js';

export function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  // Scroll solid
  const onScroll = () => nav.classList.toggle('solid', scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Auth state — show avatar or login link
  auth.onAuthChange(async (_event, session) => {
    const authEl = document.getElementById('nav-auth-area');
    if (!authEl) return;

    if (session?.user) {
      const { data: p } = await profiles.get(session.user.id);
      const initials = p
        ? (p.first_name?.[0] || '') + (p.last_name?.[0] || '')
        : session.user.email?.[0]?.toUpperCase() || '?';

      authEl.innerHTML = `
        <div class="nav-avatar" id="nav-avatar" title="My Account">${initials}</div>
        <div id="nav-dropdown" class="nav-dropdown hidden">
          <a href="/app/parent-dashboard.html">My Dashboard</a>
          <a href="/app/account.html">Account Settings</a>
          <hr>
          <a href="#" id="nav-signout">Sign Out</a>
        </div>`;

      document.getElementById('nav-avatar')?.addEventListener('click', () => {
        document.getElementById('nav-dropdown')?.classList.toggle('hidden');
      });
      document.getElementById('nav-signout')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await auth.signOut();
        window.location.href = '/index.html';
      });
    } else {
      authEl.innerHTML = `
        <a href="/app/login.html" class="btn bo" style="padding:7px 16px;font-size:.84rem">Log In</a>
        <a href="/app/signup.html" class="btn bre" style="padding:7px 16px;font-size:.84rem">Get Started</a>`;
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#nav-avatar') && !e.target.closest('#nav-dropdown')) {
      document.getElementById('nav-dropdown')?.classList.add('hidden');
    }
  });
}

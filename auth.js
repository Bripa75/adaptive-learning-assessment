// js/auth.js — login, signup, session guard
import { auth, profiles, children } from './supabase.js';

// Guard: redirect to login if not authenticated
export async function requireAuth(redirectTo = '/app/login.html') {
  const { data: { session } } = await auth.getSession();
  if (!session) {
    window.location.href = redirectTo + '?next=' + encodeURIComponent(window.location.pathname);
    return null;
  }
  return session;
}

// Guard: redirect to dashboard if already authenticated
export async function requireGuest(redirectTo = '/app/parent-dashboard.html') {
  const { data: { session } } = await auth.getSession();
  if (session) { window.location.href = redirectTo; return null; }
  return true;
}

// Guard: admin only
export async function requireAdmin() {
  const session = await requireAuth('/admin/index.html');
  if (!session) return null;
  const { data: p } = await profiles.get(session.user.id);
  if (p?.role !== 'admin') { window.location.href = '/index.html'; return null; }
  return session;
}

// Handle signup form
export async function handleSignup(e) {
  e.preventDefault();
  const email    = document.getElementById('s-email')?.value?.trim();
  const pw       = document.getElementById('s-pw')?.value;
  const pw2      = document.getElementById('s-pw2')?.value;
  const first    = document.getElementById('s-first')?.value?.trim();
  const last     = document.getElementById('s-last')?.value?.trim();
  const errEl    = document.getElementById('auth-error');
  const btnEl    = document.getElementById('auth-btn');

  if (pw !== pw2) { showErr(errEl, 'Passwords do not match.'); return; }
  if (pw.length < 8) { showErr(errEl, 'Password must be at least 8 characters.'); return; }

  setLoading(btnEl, true);
  const { data, error } = await auth.signUp(email, pw);
  if (error) { showErr(errEl, error.message); setLoading(btnEl, false); return; }

  // Update profile with name
  if (data.user) {
    await profiles.update(data.user.id, { first_name: first, last_name: last, email });
  }

  window.location.href = '/app/child-setup.html';
}

// Handle login form
export async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('l-email')?.value?.trim();
  const pw    = document.getElementById('l-pw')?.value;
  const errEl = document.getElementById('auth-error');
  const btnEl = document.getElementById('auth-btn');

  setLoading(btnEl, true);
  const { error } = await auth.signIn(email, pw);
  if (error) { showErr(errEl, 'Invalid email or password.'); setLoading(btnEl, false); return; }

  // Respect ?next= param
  const params = new URLSearchParams(window.location.search);
  window.location.href = params.get('next') || '/app/parent-dashboard.html';
}

// Helpers
function showErr(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.className = 'alert alert-err';
  el.style.display = 'block';
}

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait…' : btn.dataset.label || 'Continue';
}

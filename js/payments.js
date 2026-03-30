// js/payments.js — Stripe integration
// Replace STRIPE_PK with your real publishable key from stripe.com → Developers → API Keys

const STRIPE_PK = 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY';

// Price IDs — create these in Stripe Dashboard → Products
// Then replace these placeholder IDs
const PRICES = {
  single:  'price_SINGLE_ASSESSMENT_ID',   // $49 one-time
  monthly: 'price_MONTHLY_SUBSCRIPTION_ID', // $19/month
  annual:  'price_ANNUAL_SUBSCRIPTION_ID',  // $149/year
};

let stripe = null;

async function getStripe() {
  if (!stripe) {
    // Load Stripe.js dynamically
    await loadScript('https://js.stripe.com/v3/');
    stripe = Stripe(STRIPE_PK);
  }
  return stripe;
}

// Redirect to Stripe Checkout for a given plan
export async function checkout(plan, parentId, email) {
  const s = await getStripe();
  const priceId = PRICES[plan];
  if (!priceId) { console.error('Unknown plan:', plan); return; }

  const { error } = await s.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: plan === 'single' ? 'payment' : 'subscription',
    customerEmail: email,
    clientReferenceId: parentId,
    successUrl: window.location.origin + '/app/payment-success.html?plan=' + plan,
    cancelUrl:  window.location.origin + '/for-parents.html',
  });

  if (error) console.error('Stripe error:', error);
}

// Show pricing cards — call on for-parents.html and signup
export function renderPricingCards(containerId, onSelect) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="pricing-grid">
      ${pricingCard('single',  '🔍','Single Assessment','$49','One time',  ['Full assessment — one category','Plain-language parent report','PDF download','Results stay in your account'], false)}
      ${pricingCard('monthly', '📊','Monthly Plan',    '$19','per month', ['Reassess every 30 days','All 7 categories','Growth tracking over time','Priority email support'], true)}
      ${pricingCard('annual',  '⭐','Annual Plan',     '$149','per year',  ['Everything in Monthly','Best value — saves $79','Full year of reassessments','Early access to new features'], false)}
    </div>`;

  el.querySelectorAll('.pricing-btn').forEach(btn => {
    btn.addEventListener('click', () => onSelect(btn.dataset.plan));
  });
}

function pricingCard(plan, icon, title, price, period, features, popular) {
  return `
    <div class="pricing-card ${popular ? 'popular' : ''}">
      ${popular ? '<div class="popular-badge">Most Popular</div>' : ''}
      <div class="pc-icon">${icon}</div>
      <div class="pc-title">${title}</div>
      <div class="pc-price">${price}<span class="pc-period"> / ${period}</span></div>
      <ul class="pc-features">${features.map(f=>`<li>✓ ${f}</li>`).join('')}</ul>
      <button class="btn bre bfull pricing-btn" data-plan="${plan}">Get Started</button>
    </div>`;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

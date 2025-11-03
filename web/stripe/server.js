const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(express.json());
app.use(cors());

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.warn('WARNING: STRIPE_SECRET_KEY is not set. Set it in web/stripe/.env before starting the server.');
}
const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;
const OWNER_ACCESS_CODE = process.env.OWNER_ACCESS_CODE || null;
// Simple local entitlement store (email-based)
const ENTITLEMENTS_PATH = path.join(__dirname, 'entitlements.json');
function readEntitlements() {
  try {
    return JSON.parse(fs.readFileSync(ENTITLEMENTS_PATH, 'utf-8'));
  } catch {
    return { emails: {} };
  }
}
function writeEntitlements(data) {
  try {
    fs.writeFileSync(ENTITLEMENTS_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write entitlements:', e);
  }
}
function grantEntitlement(email) {
  if (!email) return;
  const store = readEntitlements();
  store.emails[email.toLowerCase()] = { entitled: true, updatedAt: new Date().toISOString() };
  writeEntitlements(store);
}
function hasEntitlement(email) {
  if (!email) return false;
  const store = readEntitlements();
  const rec = store.emails[email.toLowerCase()];
  return !!(rec && rec.entitled);
}

const PORT = process.env.PORT || 4242;
const SUCCESS_URL = process.env.SUCCESS_URL || `http://localhost:${PORT}/success.html`;
const CANCEL_URL = process.env.CANCEL_URL || `http://localhost:${PORT}/cancel.html`;

// Tier definitions
const TIERS = {
  bronze8: { name: 'Bronze 8', amount: 999 },
  silver8: { name: 'Silver 8', amount: 1599 },
  gold8: { name: 'Gold 8', amount: 2199 },
  platinum8: { name: 'Platinum 8', amount: 2799 },
  diamond8: { name: 'Diamond 8', amount: 5999 }
};

// Serve static client
app.use(express.static(path.join(__dirname, 'public')));

async function ensureProductAndPrice(key) {
  if (!stripe) throw new Error('Stripe is not configured');
  const tier = TIERS[key];
  if (!tier) throw new Error('Unknown tier');

  // Find or create product by name
  const productName = `Agent 8 ${tier.name}`;
  let product;
  let startingAfter = null;
  do {
    const list = await stripe.products.list({ limit: 100, starting_after: startingAfter || undefined });
    product = list.data.find(p => p.name === productName);
    startingAfter = list.has_more ? list.data[list.data.length - 1].id : null;
    if (product) break;
  } while (startingAfter);

  if (!product) {
    product = await stripe.products.create({ name: productName });
  }

  // Find a monthly recurring price with matching amount
  let price;
  startingAfter = null;
  do {
    const list = await stripe.prices.list({ product: product.id, limit: 100, starting_after: startingAfter || undefined });
    price = list.data.find(p => p.active && p.type === 'recurring' && p.unit_amount === tier.amount && p.currency === 'usd' && p.recurring && p.recurring.interval === 'month');
    startingAfter = list.has_more ? list.data[list.data.length - 1].id : null;
    if (price) break;
  } while (startingAfter);

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: tier.amount,
      currency: 'usd',
      recurring: { interval: 'month' },
      nickname: `${tier.name} Monthly`
    });
  }

  return price.id;
}

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { tierKey } = req.body;
    if (!tierKey || !TIERS[tierKey]) {
      return res.status(400).json({ error: 'Invalid tierKey' });
    }
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const priceId = await ensureProductAndPrice(tierKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: SUCCESS_URL + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: CANCEL_URL,
      allow_promotion_codes: true,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Owner login: verifies a secret code from env. Returns a simple token.
// NOTE: In production, consider issuing a signed JWT and HTTPS only.
app.post('/owner-login', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!OWNER_ACCESS_CODE) {
      return res.status(500).json({ error: 'Owner access not configured' });
    }
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code required' });
    }
    if (code !== OWNER_ACCESS_CODE) {
      return res.status(401).json({ error: 'Invalid code' });
    }
    // Generate a simple opaque token (non-guessable)
    const token = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64url');
    return res.json({ access: true, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/success.html', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Success</title>
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
        <style> body{font-family:system-ui,sans-serif;margin:2rem} .ok{color:green} .error{color:red} a{display:inline-block;margin-top:1rem} </style>
      </head>
      <body>
        <h1 class=\"ok\">Subscription created successfully!</h1>
        <p>Thank you for subscribing to Agent 8.</p>
        <div id=\"status\">Finalizing your access...</div>
        <script>
          (async function(){
            const params = new URLSearchParams(location.search);
            const sid = params.get('session_id');
            if (!sid) {
              document.getElementById('status').innerHTML = '<span class=\"error\">Missing session_id.</span>';
              return;
            }
            try {
              const r = await fetch('/verify-session?session_id=' + encodeURIComponent(sid));
              const j = await r.json();
              if (j && j.ok) {
                document.getElementById('status').innerHTML = 'Access is now enabled. Return to VS Code and run \"Agent 8: Sign In\".';
              } else {
                document.getElementById('status').innerHTML = '<span class=\"error\">Verification failed.</span>';
              }
            } catch(e){
              document.getElementById('status').innerHTML = '<span class=\"error\">Network error verifying session.</span>';
            }
          })();
        </script>
        <a href=\"/\">Back to plans</a>
      </body>
    </html>
  `);
});

app.get('/cancel.html', (req, res) => {
  res.send(`
    <html>
      <head><title>Cancelled</title></head>
      <body>
        <h1>Checkout cancelled</h1>
        <p>You can choose a different plan or try again.</p>
        <a href="/">Back to plans</a>
      </body>
    </html>
  `);
});

// Verify a Checkout session and grant entitlement
app.get('/verify-session', async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ ok: false, error: 'Stripe not configured' });
    const sessionId = req.query.session_id;
    if (!sessionId || typeof sessionId !== 'string') return res.status(400).json({ ok: false, error: 'Missing session_id' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const statusOk = session.status === 'complete' && session.payment_status === 'paid';
    const email = session.customer_details && session.customer_details.email;
    if (statusOk && email) {
      grantEntitlement(email);
      return res.json({ ok: true });
    }
    return res.status(400).json({ ok: false, error: 'Not paid or missing email' });
  } catch (e) {
    console.error('verify-session error', e);
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
});

// Check entitlement by email
app.get('/entitlement', (req, res) => {
  try {
    const email = req.query.email;
    if (!email || typeof email !== 'string') return res.status(400).json({ entitled: false });
    return res.json({ entitled: hasEntitlement(email) });
  } catch (e) {
    console.error('entitlement error', e);
    return res.status(500).json({ entitled: false });
  }
});

app.listen(PORT, () => {
  console.log(`Agent 8 Stripe server listening on http://localhost:${PORT}`);
});
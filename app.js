const STORE_KEY = { cart:'roy_cart', wishlist:'roy_wishlist', user:'roy_user', address:'roy_address' };

const fallbackProducts = [
  { id:'p1', name:'Neon Tech Hoodie', price:2499, category:'Hoodies', badge:'Best Seller', rating:4.8, image:'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1400&auto=format&fit=crop', colors:['Black','Neon'], sizes:['S','M','L','XL'], description:'Ultra premium oversized hoodie with futuristic cut and silky fleece feel.' },
  { id:'p2', name:'Ghost Runner Sneakers', price:5999, category:'Sneakers', badge:'New Drop', rating:4.9, image:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1400&auto=format&fit=crop', colors:['White','Grey'], sizes:['39','40','41','42','43'], description:'Sharp profile sneaker with comfort cushioning and luxury finish.' },
  { id:'p3', name:'Midnight Cargo', price:3299, category:'Techwear', badge:'Trending', rating:4.7, image:'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1400&auto=format&fit=crop', colors:['Black','Olive'], sizes:['28','30','32','34'], description:'Clean tactical cargo with modern streetwear silhouette.' },
  { id:'p4', name:'Oversized Arc Tee', price:1799, category:'T-Shirts', badge:'Hot', rating:4.6, image:'https://images.unsplash.com/photo-1523398002811-999ca8dec234?q=80&w=1400&auto=format&fit=crop', colors:['White','Ash'], sizes:['S','M','L','XL'], description:'Heavyweight tee with dropped shoulder premium drape.' },
  { id:'p5', name:'Carbon Bomber', price:4499, category:'Jackets', badge:'Limited', rating:4.8, image:'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1400&auto=format&fit=crop', colors:['Black'], sizes:['M','L','XL'], description:'Gloss-matte bomber jacket built for cold weather and strong style.' },
  { id:'p6', name:'Minimal Dial Watch', price:7999, category:'Watches', badge:'Luxury', rating:4.9, image:'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=1400&auto=format&fit=crop', colors:['Silver','Black'], sizes:['One Size'], description:'Premium watch with sleek case, refined dial and daily elegance.' }
];

function getStore(key, fallback){ try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function setStore(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function money(n){ return new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n || 0); }
function uid(){ return 'ORD-' + Math.random().toString(36).slice(2,7).toUpperCase() + '-' + Date.now().toString().slice(-4); }
function toast(msg){ const el = document.createElement('div'); el.className='toast'; el.textContent = msg; document.querySelector('.toasts')?.appendChild(el); setTimeout(() => el.remove(), 2300); }

async function loadProducts() {
  try {
    const res = await fetch('./content/products.json', { cache:'no-store' });
    if (!res.ok) throw new Error('no cms');
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json.products || []);
    return list.length ? list : fallbackProducts;
  } catch {
    return fallbackProducts;
  }
}

function ensureSeed(){ if (!localStorage.getItem(STORE_KEY.cart)) setStore(STORE_KEY.cart, []); if (!localStorage.getItem(STORE_KEY.wishlist)) setStore(STORE_KEY.wishlist, []); }
function updateBadges(){
  const cartCount = getStore(STORE_KEY.cart, []).reduce((s,i) => s + (i.qty || 1), 0);
  const wishCount = getStore(STORE_KEY.wishlist, []).length;
  document.querySelectorAll('[data-cart-count]').forEach(n => n.textContent = cartCount);
  document.querySelectorAll('[data-wishlist-count]').forEach(n => n.textContent = wishCount);
}
function updateUserUI(){ const user = getStore(STORE_KEY.user, null); document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user?.name ? user.name : 'Login'); }
function getCart(){ return getStore(STORE_KEY.cart, []); }
function getWishlist(){ return getStore(STORE_KEY.wishlist, []); }
function saveCart(cart){ setStore(STORE_KEY.cart, cart); renderCart(); updateBadges(); }
function saveWishlist(w){ setStore(STORE_KEY.wishlist, w); renderWishlist(); updateBadges(); }
function saveUser(u){ setStore(STORE_KEY.user, u); updateUserUI(); }

let catalog = [];
let activeProduct = null;
let selectedPayment = 'cod';

function findProduct(id){ return catalog.find(p => p.id === id) || fallbackProducts.find(p => p.id === id); }

function productCard(p){
  return `
  <article class="card reveal" data-id="${p.id}">
    <div class="card-media"><img loading="lazy" src="${p.image}" alt="${p.name}"></div>
    <div class="card-body">
      <div class="card-top">
        <div>
          <div class="chips"><span class="chip">${p.category}</span><span class="chip">${p.badge || 'Premium'}</span></div>
          <h3>${p.name}</h3>
        </div>
        <strong style="color:var(--accent)">★ ${p.rating.toFixed(1)}</strong>
      </div>
      <div class="price">${money(p.price)}</div>
      <div class="meta">${p.description}</div>
      <div class="card-actions">
        <button class="small-btn add-cart" data-id="${p.id}">Add to cart</button>
        <button class="small-btn ghost quick-view" data-id="${p.id}">Quick view</button>
        <button class="small-btn icon wish-btn" data-id="${p.id}">♡</button>
      </div>
    </div>
  </article>`;
}

function runReveal(){
  const els = document.querySelectorAll('.reveal:not(.show)');
  const obs = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('show'); }), { threshold:0.15 });
  els.forEach(el => obs.observe(el));
}

function renderHomeOrShop(){
  const grid = document.querySelector('[data-product-grid]');
  if (!grid) return;
  const search = (document.querySelector('[data-search]')?.value || '').toLowerCase().trim();
  const category = document.querySelector('[data-category]')?.value || 'All';
  const sort = document.querySelector('[data-sort]')?.value || 'featured';
  let list = [...catalog];
  if (search) list = list.filter(p => `${p.name} ${p.category} ${p.badge} ${p.description}`.toLowerCase().includes(search));
  if (category !== 'All') list = list.filter(p => p.category === category);
  if (sort === 'priceLow') list.sort((a,b) => a.price - b.price);
  if (sort === 'priceHigh') list.sort((a,b) => b.price - a.price);
  if (sort === 'rating') list.sort((a,b) => (b.rating || 0) - (a.rating || 0));
  grid.innerHTML = list.map(productCard).join('');
  runReveal();
}

function renderCart(){
  const wrap = document.querySelector('[data-cart-list]');
  if (!wrap) return;
  const cart = getCart();
  if (!cart.length) {
    wrap.innerHTML = '<p style="color:var(--muted)">Your cart is empty. Add something premium ✨</p>';
    document.querySelectorAll('[data-cart-total],[data-cart-subtotal],[data-cart-delivery]').forEach(el => el.textContent = money(0));
    return;
  }
  let subtotal = 0;
  wrap.innerHTML = cart.map(item => {
    const p = findProduct(item.id);
    const qty = item.qty || 1;
    subtotal += p.price * qty;
    return `<div class="line-item"><img src="${p.image}" alt="${p.name}"><div style="flex:1"><strong>${p.name}</strong><div style="color:var(--muted);margin-top:4px">${money(p.price)} × ${qty}</div><div class="qty"><button class="minus" data-id="${p.id}">−</button><span>${qty}</span><button class="plus" data-id="${p.id}">+</button></div></div><button class="small-btn icon remove-item" data-id="${p.id}">×</button></div>`;
  }).join('');
  const delivery = subtotal > 999 ? 0 : 99;
  document.querySelectorAll('[data-cart-subtotal]').forEach(el => el.textContent = money(subtotal));
  document.querySelectorAll('[data-cart-delivery]').forEach(el => el.textContent = money(delivery));
  document.querySelectorAll('[data-cart-total]').forEach(el => el.textContent = money(subtotal + delivery));
}

function renderWishlist(){
  const wrap = document.querySelector('[data-wishlist-list]');
  if (!wrap) return;
  const list = getWishlist();
  if (!list.length) { wrap.innerHTML = '<p style="color:var(--muted)">Your wishlist is empty.</p>'; return; }
  wrap.innerHTML = list.map(id => {
    const p = findProduct(id);
    return `<div class="line-item"><img src="${p.image}" alt="${p.name}"><div style="flex:1"><strong>${p.name}</strong><div style="color:var(--muted);margin-top:4px">${money(p.price)}</div><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="small-btn add-cart" data-id="${p.id}" style="padding:10px 12px">Move to cart</button><button class="small-btn ghost remove-wish" data-id="${p.id}" style="padding:10px 12px">Remove</button></div></div></div>`;
  }).join('');
}

function openDrawer(sel){ document.querySelector(sel)?.classList.add('open'); }
function closeDrawer(sel){ document.querySelector(sel)?.classList.remove('open'); }

function openProduct(id){
  activeProduct = findProduct(id);
  const modal = document.querySelector('[data-product-modal]');
  if (!modal || !activeProduct) return;
  modal.querySelector('[data-modal-gallery]').innerHTML = `<img src="${activeProduct.image}" alt="${activeProduct.name}">`;
  modal.querySelector('[data-modal-info]').innerHTML = `
    <div class="chips"><span class="chip">${activeProduct.category}</span><span class="chip">${activeProduct.badge || 'Premium'}</span><span class="chip">★ ${activeProduct.rating.toFixed(1)}</span></div>
    <h2 style="font-size:2rem;margin-top:8px">${activeProduct.name}</h2>
    <div class="price" style="font-size:1.7rem">${money(activeProduct.price)}</div>
    <p class="meta" style="margin-top:12px">${activeProduct.description}</p>
    <div style="margin-top:16px"><strong style="display:block;margin-bottom:8px">Colors</strong><div class="swatches">${activeProduct.colors.map((c,i) => `<button class="swatch ${i===0?'active':''}">${c}</button>`).join('')}</div></div>
    <div style="margin-top:16px"><strong style="display:block;margin-bottom:8px">Sizes</strong><div class="sizes">${activeProduct.sizes.map((s,i) => `<button class="size ${i===0?'active':''}">${s}</button>`).join('')}</div></div>
    <div style="display:flex;gap:12px;margin-top:18px;flex-wrap:wrap"><button class="btn primary" data-buy-now="${activeProduct.id}">Buy now</button><button class="btn ghost add-cart" data-id="${activeProduct.id}">Add to cart</button><button class="btn ghost wish-btn" data-id="${activeProduct.id}">Wishlist</button></div>
    <div class="panel" style="margin-top:18px"><strong>Reviews</strong><p style="margin-top:8px">4.8/5 — clean fit, premium feel, and ultra smooth finishing.</p></div>
  `;
  modal.classList.add('open');
}

function renderCheckoutSummary(){
  const box = document.querySelector('[data-checkout-summary]');
  if (!box) return;
  const cart = getCart();
  if (!cart.length) { box.innerHTML = '<p style="color:var(--muted)">No items in cart.</p>'; return; }
  let subtotal = 0;
  box.innerHTML = cart.map(item => {
    const p = findProduct(item.id);
    subtotal += p.price * item.qty;
    return `<div class="summary-item"><div><strong>${p.name}</strong><div style="color:var(--muted);font-size:.9rem">Qty ${item.qty}</div></div><strong>${money(p.price * item.qty)}</strong></div>`;
  }).join('') + `<div class="summary-item"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="summary-item"><span>Delivery</span><strong>${money(subtotal > 999 ? 0 : 99)}</strong></div><div class="total"><span>Total</span><span>${money(subtotal + (subtotal > 999 ? 0 : 99))}</span></div>`;
}

let stepCurrent = 1;
function nextStep(step){
  stepCurrent = step;
  document.querySelectorAll('[data-step]').forEach(el => el.classList.toggle('active', Number(el.dataset.step) === step));
  document.querySelectorAll('[data-step-panel]').forEach(el => el.style.display = Number(el.dataset.stepPanel) === step ? 'block' : 'none');
}

function bindGlobalEvents(){
  document.addEventListener('click', e => {
    const add = e.target.closest('.add-cart');
    const wish = e.target.closest('.wish-btn');
    const quick = e.target.closest('.quick-view');
    const remove = e.target.closest('.remove-item');
    const minus = e.target.closest('.minus');
    const plus = e.target.closest('.plus');
    const removeWish = e.target.closest('.remove-wish');
    const buyNow = e.target.closest('[data-buy-now]');
    if (add) { const cart = getCart(); const hit = cart.find(i => i.id === add.dataset.id); if (hit) hit.qty += 1; else cart.push({ id:add.dataset.id, qty:1 }); saveCart(cart); toast('Added to cart ✨'); }
    if (wish) { let w = getWishlist(); const id = wish.dataset.id; if (w.includes(id)) { w = w.filter(x => x !== id); toast('Removed from wishlist'); } else { w.push(id); toast('Added to wishlist'); } saveWishlist(w); }
    if (quick) openProduct(quick.dataset.id);
    if (remove) { saveCart(getCart().filter(i => i.id !== remove.dataset.id)); toast('Removed from cart'); }
    if (minus) { saveCart(getCart().map(i => i.id === minus.dataset.id ? {...i, qty: Math.max(1, i.qty - 1)} : i)); }
    if (plus) { saveCart(getCart().map(i => i.id === plus.dataset.id ? {...i, qty: (i.qty || 1) + 1} : i)); }
    if (removeWish) { saveWishlist(getWishlist().filter(id => id !== removeWish.dataset.id)); toast('Removed from wishlist'); }
    if (buyNow) { openDrawer('[data-checkout-drawer]'); nextStep(1); toast('Proceeding to checkout'); }
  });

  document.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', () => openDrawer(btn.dataset.open)));
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeDrawer(btn.dataset.close)));
  document.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', () => btn.closest('.modal')?.classList.remove('open')));
  document.querySelector('[data-login-open]')?.addEventListener('click', () => document.querySelector('[data-login-modal]')?.classList.add('open'));

  const search = document.querySelector('[data-search]');
  const category = document.querySelector('[data-category]');
  const sort = document.querySelector('[data-sort]');
  [search, category, sort].filter(Boolean).forEach(el => el.addEventListener('input', renderHomeOrShop));
  document.querySelectorAll('[data-open-cart]').forEach(el => el.addEventListener('click', () => openDrawer('[data-cart-drawer]')));
  document.querySelectorAll('[data-open-wishlist]').forEach(el => el.addEventListener('click', () => openDrawer('[data-wishlist-drawer]')));
  document.querySelectorAll('[data-step]').forEach(el => el.addEventListener('click', () => nextStep(Number(el.dataset.step))));
}

function bindLogin(){
  const form = document.querySelector('[data-login-form]');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    if (!name || !email) return toast('Fill login details');
    saveUser({ name, email });
    document.querySelector('[data-login-modal]')?.classList.remove('open');
    toast(`Welcome ${name}`);
  });
}

function bindCheckout(){
  document.querySelectorAll('[data-payment]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-payment]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPayment = btn.dataset.payment;
    document.querySelectorAll('[data-card-fields]').forEach(el => el.style.display = (selectedPayment === 'card' || selectedPayment === 'emi') ? 'block' : 'none');
    document.querySelectorAll('[data-upi-fields]').forEach(el => el.style.display = selectedPayment === 'upi' ? 'block' : 'none');
  }));

  const place = document.querySelector('[data-place-order]');
  if (place) place.addEventListener('click', () => {
    const form = document.querySelector('[data-address-form]');
    const data = {};
    new FormData(form).forEach((value, key) => data[key] = value);
    setStore(STORE_KEY.address, data);
    const orderId = uid();
    const modal = document.querySelector('[data-success-modal]');
    const body = modal?.querySelector('[data-success-body]');
    if (body) body.innerHTML = `<div style="text-align:center;padding:18px"><div style="width:74px;height:74px;border-radius:50%;margin:0 auto 14px;background:rgba(124,255,79,.14);display:grid;place-items:center;font-size:2rem;color:var(--accent)">✓</div><h2>Order placed successfully</h2><p style="color:var(--muted);margin-top:8px">Your premium order is confirmed.</p><div class="panel" style="margin-top:18px;text-align:left"><strong>Order ID</strong><div style="margin-top:8px;color:var(--accent)">${orderId}</div><div style="margin-top:12px"><strong>Payment</strong><div style="color:var(--muted)">${selectedPayment.toUpperCase()}</div></div></div></div>`;
    modal?.classList.add('open');
    setStore(STORE_KEY.cart, []);
    renderCart(); updateBadges();
  });

  document.querySelectorAll('[data-step]').forEach(el => el.addEventListener('click', () => nextStep(Number(el.dataset.step))));
}

async function init(){
  ensureSeed();
  catalog = await loadProducts();
  renderHomeOrShop();
  renderCart();
  renderWishlist();
  renderCheckoutSummary();
  updateBadges();
  updateUserUI();
  bindGlobalEvents();
  bindLogin();
  bindCheckout();
  runReveal();
  document.querySelectorAll('[data-hero-stats]').forEach(el => el.innerHTML = `
    <div class="stat"><strong>50+</strong><span>Premium pieces</span></div>
    <div class="stat"><strong>1-click</strong><span>Quick checkout</span></div>
    <div class="stat"><strong>CMS-ready</strong><span>Netlify friendly</span></div>
  `);
}
document.addEventListener('DOMContentLoaded', init);

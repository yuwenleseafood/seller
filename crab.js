(() => {
  'use strict';
  const storageKey = 'yuwenle-inquiry-v1';
  const countNode = document.getElementById('crab-cart-count');
  const itemCountNode = document.getElementById('crab-cart-items-count');
  const statusNode = document.getElementById('crab-cart-status');
  const dialog = document.getElementById('crab-cart-dialog');
  const body = document.getElementById('crab-cart-body');
  const footer = document.getElementById('crab-cart-footer');
  const config = window.SITE_CONFIG || {};
  const hiddenIds = new Set((config.hiddenProductIds || []).map(String));
  const catalogProducts = (window.CATALOG?.products || []).filter(p => !hiddenIds.has(String(p.id)) && !/外箱/u.test(String(p.name || '') + ' ' + String(p.originalName || '')));
  const products = [...catalogProducts, ...(config.inquiryOnlyProducts || [])];
  const productById = new Map(products.map(p => [String(p.id), { ...p, id: String(p.id) }]));
  let statusTimer;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function readCart() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (!value || Array.isArray(value) || typeof value !== 'object') return {};
      let migrated = false;
      for (const [oldId, quantity] of Object.entries(value)) {
        const currentId = oldId.replace(/^crab-2026-/, 'crab-');
        if (currentId === oldId) continue;
        if (productById.has(currentId) && Number.isFinite(+quantity) && +quantity >= 1) value[currentId] = Math.min(9999, (Number(value[currentId]) || 0) + Math.trunc(+quantity));
        delete value[oldId];
        migrated = true;
      }
      if (migrated) localStorage.setItem(storageKey, JSON.stringify(value));
      return Object.fromEntries(Object.entries(value).filter(([id, quantity]) => productById.has(id) && Number.isFinite(+quantity) && +quantity >= 1).map(([id, quantity]) => [id, Math.min(9999, Math.trunc(+quantity))]));
    } catch { return {}; }
  }
  function saveCart(cart) {
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); updateCart(cart); return true; }
    catch { announce('無法儲存購物車，請稍後再試。'); return false; }
  }
  function updateCart(cart = readCart()) {
    const count = Object.keys(cart).length;
    if (countNode) countNode.textContent = String(count);
    if (itemCountNode) itemCountNode.textContent = `${count} 項`;
    if (dialog?.open) renderCart(cart);
  }
  function announce(message) {
    statusNode.textContent = message;
    statusNode.classList.add('visible');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => statusNode.classList.remove('visible'), 2600);
  }
  function renderCart(cart = readCart()) {
    const entries = Object.entries(cart).map(([id, quantity]) => ({ product: productById.get(id), quantity })).filter(entry => entry.product);
    footer.hidden = entries.length === 0;
    body.innerHTML = entries.length ? entries.map(({ product, quantity }) => {
      const image = product.image || product.images?.[0]?.path || 'assets/identity/logo-square.png';
      const name = product.name || `未命名商品（${product.id}）`;
      return `<article class="crab-cart-item"><img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy"><div><small>${escapeHtml(product.category || '商品')} · ${escapeHtml(product.id)}</small><h3>${escapeHtml(name)}</h3><p>${escapeHtml(product.priceText || '價格請洽詢')}${product.specification ? ` · ${escapeHtml(product.specification)}` : ''}</p><label>數量 <input type="number" min="1" max="9999" value="${quantity}" data-cart-quantity="${escapeHtml(product.id)}" aria-label="${escapeHtml(name)}的數量"></label></div><button type="button" class="crab-cart-remove" data-cart-remove="${escapeHtml(product.id)}" aria-label="移除${escapeHtml(name)}">×</button></article>`;
    }).join('') : '<div class="crab-cart-empty"><h3>目前清單是空的</h3><p>選擇大閘蟹規格並按「點我預購」，商品就會加入這份清單。</p><button type="button" data-cart-close>返回挑選規格</button></div>';
  }
  function openCart() { renderCart(); if (!dialog.open) dialog.showModal(); }
  function makeInquiryText() {
    const cart = readCart();
    const lines = ['魚文樂商城｜商品詢價清單', `日期：${new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei' }).format(new Date())}`, ''];
    let index = 0;
    for (const [id, quantity] of Object.entries(cart)) {
      const product = productById.get(id);
      if (!product) continue;
      lines.push(`${++index}. 【${product.category || '商品'}】${product.name || `未命名商品（${id}）`}（編號 ${id}）`, `   詢問數量：${quantity}${product.specification ? '\n   規格：' + product.specification : ''}`);
    }
    const note = document.getElementById('crab-cart-note').value.trim();
    if (note) lines.push('', '補充需求：' + note);
    lines.push('', '請協助確認規格、計價單位、庫存與報價。');
    return lines.join('\n');
  }
  async function copyCart() {
    const text = makeInquiryText();
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; }
    catch {
      const textarea = document.createElement('textarea');
      textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0';
      document.body.append(textarea); textarea.focus(); textarea.select();
      try { copied = document.execCommand('copy'); } catch {}
      textarea.remove();
    }
    announce(copied ? '已複製詢價清單，前往 LINE 貼上詢問魚小編。' : '複製失敗，請稍後再試或下載清單。');
  }

  document.addEventListener('click', event => {
    const openButton = event.target.closest('[data-cart-open]');
    if (openButton) { openCart(); return; }
    if (event.target.closest('[data-cart-close]')) { dialog.close(); return; }
    const removeButton = event.target.closest('[data-cart-remove]');
    if (removeButton) { const cart = readCart(); delete cart[removeButton.dataset.cartRemove]; saveCart(cart); return; }
    const addButton = event.target.closest('[data-cart-add]');
    if (!addButton) return;
    const cart = readCart();
    const id = addButton.dataset.cartAdd;
    cart[id] = Math.min(9999, Math.max(0, Math.trunc(Number(cart[id]) || 0)) + 1);
    if (saveCart(cart)) {
      const variant = addButton.closest('.size-card')?.querySelector('h4')?.textContent.trim() || '大閘蟹規格';
      const totalQuantity = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
      announce(`${variant}已加入購物車；目前 ${Object.keys(cart).length} 種商品，共 ${totalQuantity} 件。`);
    }
  });
  body.addEventListener('change', event => {
    const input = event.target.closest('[data-cart-quantity]');
    if (!input) return;
    const cart = readCart();
    cart[input.dataset.cartQuantity] = Math.max(1, Math.min(9999, Math.floor(+input.value || 1)));
    saveCart(cart);
  });
  document.getElementById('crab-cart-copy').addEventListener('click', copyCart);
  document.getElementById('crab-cart-download').addEventListener('click', () => {
    const blob = new Blob(['\uFEFF' + makeInquiryText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = '魚文樂-詢價清單.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  window.addEventListener('storage', event => { if (event.key === storageKey) updateCart(); });
  updateCart();
})();

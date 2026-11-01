(() => {
  'use strict';
  const { categories, seafoodSubcategories, getSeafoodTags, filterProducts, searchable, escapeHtml: esc } = window.CatalogCore;
  const config = window.SITE_CONFIG || {};
  const hiddenProductIds = new Set((config.hiddenProductIds || []).map(String));
  const products = (window.CATALOG?.products || [])
    .filter(p => !hiddenProductIds.has(String(p.id)))
    .map((p, i) => ({ ...p, order: i, searchText: searchable(p), seafoodTags: (p.categoryKey === 'seafood' || p.category === '海鮮') ? getSeafoodTags(p) : [] }));
  const inquiryOnlyProducts = (config.inquiryOnlyProducts || []).map(p => ({ ...p, id: String(p.id) }));
  const productById = new Map([...products, ...inquiryOnlyProducts].map(p => [String(p.id), p]));
  const pageSize = config.pageSize || 24;
  const $ = s => document.querySelector(s);
  const state = { category: 'all', seafoodTag: '', query: '', sort: 'source', page: 1 };
  let storageAvailable = true;
  const getSaved = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { storageAvailable = false; return fallback; } };
  let inquiry = getSaved('yuwenle-inquiry-v1', {});
  if (!inquiry || Array.isArray(inquiry) || typeof inquiry !== 'object') inquiry = {};
  let migratedCrabIds = false;
  for (const [oldId, quantity] of Object.entries(inquiry)) {
    const currentId = oldId.replace(/^crab-2026-/, 'crab-');
    if (currentId === oldId) continue;
    if (productById.has(currentId) && Number.isFinite(+quantity) && +quantity >= 1) inquiry[currentId] = Math.min(9999, (Number(inquiry[currentId]) || 0) + Math.trunc(+quantity));
    delete inquiry[oldId];
    migratedCrabIds = true;
  }
  for (const [id, quantity] of Object.entries(inquiry)) { if (!productById.has(id) || !Number.isFinite(+quantity) || +quantity < 1) delete inquiry[id]; else inquiry[id] = Math.min(9999, Math.trunc(+quantity)); }
  if (migratedCrabIds) { try { localStorage.setItem('yuwenle-inquiry-v1', JSON.stringify(inquiry)); } catch { storageAvailable = false; } }
  let currentProduct = null;
  let toastTimer;
  const countCategory = key => products.filter(p => p.categoryKey === key).length;
  const displayName = p => p.name || `未命名商品（${p.id}）`;
  const imageOf = p => p.image || p.images?.[0]?.path || '';
  const imageMarkup = (p, extra = '') => imageOf(p) ? `<img src="${esc(imageOf(p))}" alt="${esc(displayName(p))}" loading="lazy" decoding="async" ${extra}>` : `<div class="image-missing"><img src="assets/identity/logo-square.png" alt=""><span>原目錄未提供圖片</span></div>`;
  const counts = Object.fromEntries(categories.map(c => [c.key, countCategory(c.key)]));
  const seafoodTagCounts = Object.fromEntries(seafoodSubcategories.map(tag => [`seafood-${tag.key}`, products.filter(p => p.seafoodTags.includes(`seafood-${tag.key}`)).length]));
  function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600); }
  function saveInquiry() { try { localStorage.setItem('yuwenle-inquiry-v1', JSON.stringify(inquiry)); } catch { storageAvailable = false; } updateListCount(); }
  function updateListCount() { const count = Object.keys(inquiry).length; $('#list-count').textContent = count; $('#drawer-count').textContent = `${count} 項`; $('#open-list').setAttribute('aria-label', `開啟詢價清單，${count} 項商品`); }
  function openDialog(id) { const d = document.getElementById(id); if (!d.open) d.showModal(); }
  function closeDialog(id) { document.getElementById(id).close(); }
  document.querySelectorAll('dialog').forEach(d => { d.addEventListener('click', e => { if (e.target !== d) return; const r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); }); });
  document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeDialog(b.dataset.close)));

  function populateBrand() {
    $('#year').textContent = new Date().getFullYear();
    const links = [];
    if (config.phone) links.push(`<a href="tel:${esc(config.phone.replace(/[^\d+]/g, ''))}">電話聯絡 ${esc(config.phone)}</a>`);
    if (config.email) links.push(`<a href="mailto:${esc(config.email)}">電子郵件</a>`);
    if (/^https:\/\//i.test(config.lineUrl || '')) { links.push(`<button type="button" class="text-link" data-qr="other">客服洽詢 ↗</button>`); links.push(`<a href="${esc(config.lineUrl)}" target="_blank" rel="noopener">LINE 零售洽詢 ↗</a>`); $('#line-inquiry').href = config.lineUrl; $('#line-inquiry').hidden = false; }
    if (/^https:\/\//i.test(config.wholesaleUrl || '')) links.push(`<a href="${esc(config.wholesaleUrl)}" target="_blank" rel="noopener">LINE 批發洽詢 ↗</a>`);
    $('#contact-links').innerHTML = links.join('');
    if (config.address) { const a = document.createElement('p'); a.textContent = config.address; $('#contact-links').append(a); }
    $('#catalog-total').textContent = ` ${products.length}`;
    $('#qr-grid').innerHTML = Object.entries(config.qrItems || {}).map(([key, q]) => `<article class="qr-card"><h3>${esc(q.title)}</h3><button type="button" data-qr="${esc(key)}" aria-label="放大${esc(q.title)} QR 碼"><img src="${esc(q.image)}" alt="${esc(q.title)} QR 碼" width="342" height="341" loading="lazy"></button><a class="text-link" href="${esc(q.url)}" target="_blank" rel="noopener">開啟連結 ↗</a></article>`).join('');
  }
  function renderCategoryTiles() {
    $('#category-tiles').innerHTML = categories.map((c, i) => {
      const p = productById.get(c.heroId) || products.find(p => p.categoryKey === c.key && imageOf(p));
      const cover = config.categoryImages?.[c.key];
      return `<button type="button" class="category-tile" data-category="${c.key}"><div class="category-tile-image">${cover ? `<img src="${esc(cover)}" alt="${esc(c.name)}分類" loading="lazy">` : p ? imageMarkup(p) : ''}<span class="category-sequence">0${i + 1}</span></div><div class="category-tile-label"><span><b>${c.name}</b><small>${c.english}</small></span><span class="category-arrow" aria-hidden="true">↗</span></div></button>`;
    }).join('');
  }
  function renderCategoryFilters() {
    const items = [{ key: 'all', name: '全部商品' }, ...categories].map(c => {
      const active = state.category === c.key && !state.seafoodTag;
      const label = c.name;
      const button = `<button type="button" class="category-filter${active ? ' active' : ''}" data-category="${c.key}" aria-pressed="${active}"><span>${label}</span><small>${c.key === 'all' ? products.length : counts[c.key]}</small></button>`;
      if (c.key !== 'seafood' || state.category !== 'seafood') return button;
      const subfilters = seafoodSubcategories.map(tag => {
        const key = `seafood-${tag.key}`;
        const selected = state.seafoodTag === key;
        return `<button type="button" class="seafood-subfilter${selected ? ' active' : ''}" data-seafood-tag="${key}" aria-pressed="${selected}"><span>${tag.name}</span><small>${seafoodTagCounts[key]}</small></button>`;
      }).join('');
      return `<div class="seafood-filter-group">${button}<div class="seafood-subfilters" aria-label="海鮮子分類">${subfilters}</div></div>`;
    }).join('');
    $('#category-filters').innerHTML = items;
  }
  function urlState() {
    const hash = location.hash.slice(1);
    if (!hash.startsWith('catalog?')) return;
    const p = new URLSearchParams(hash.slice(8));
    state.query = (p.get('q') || '').slice(0, 150);
    state.category = categories.some(c => c.key === p.get('category')) ? p.get('category') : 'all';
    const requestedTag = p.get('tag');
    state.seafoodTag = state.category === 'seafood' && seafoodSubcategories.some(tag => `seafood-${tag.key}` === requestedTag) ? requestedTag : '';
    state.sort = ['source', 'name', 'category'].includes(p.get('sort')) ? p.get('sort') : 'source';
    state.page = Math.max(1, Number.parseInt(p.get('page'), 10) || 1);
    $('#product-search').value = state.query; $('#sort-select').value = state.sort;
  }
  function writeUrl() {
    const p = new URLSearchParams();
    if (state.category !== 'all') p.set('category', state.category);
    if (state.seafoodTag) p.set('tag', state.seafoodTag);
    if (state.query) p.set('q', state.query);
    if (state.sort !== 'source') p.set('sort', state.sort);
    if (state.page > 1) p.set('page', state.page);
    try { history.replaceState(null, '', `${location.pathname}${location.search}#catalog${p.size ? '?' + p : ''}`); } catch { /* file:// stays fully usable */ }
  }
  function scrollCatalog() { $('#catalog').scrollIntoView({ behavior: 'auto', block: 'start' }); }
  function renderCatalog({ scroll = false, updateUrl = false } = {}) {
    const matches = filterProducts(products, state);
    const pages = Math.max(1, Math.ceil(matches.length / pageSize));
    state.page = Math.min(pages, state.page);
    const start = (state.page - 1) * pageSize;
    const visible = matches.slice(start, start + pageSize);
    const selectedSeafoodTag = seafoodSubcategories.find(tag => `seafood-${tag.key}` === state.seafoodTag);
    $('#active-category').textContent = state.category === 'all' ? '全部商品' : selectedSeafoodTag ? `海鮮・${selectedSeafoodTag.name}` : categories.find(c => c.key === state.category)?.name;
    $('#result-count').textContent = matches.length ? `找到 ${matches.length} 項 · 顯示 ${start + 1}–${start + visible.length} 項` : '找到 0 項';
    $('#search-clear').hidden = !state.query;
    $('#active-query').hidden = !state.query;
    $('#active-query').innerHTML = state.query ? `<span>搜尋「${esc(state.query)}」</span><button type="button" data-clear-query aria-label="清除搜尋關鍵字">×</button>` : '';
    $('#empty-state').hidden = !!matches.length;
    $('#product-grid').innerHTML = visible.map(p => `<article class="product-card"><button type="button" class="product-image" data-detail="${esc(p.id)}" aria-label="查看${esc(displayName(p))}">${imageMarkup(p)}<span class="product-image-category">${esc(p.category)}</span><span class="image-watermark" aria-hidden="true">魚文樂</span><span class="product-view" aria-hidden="true">查看商品 ↗</span></button><div class="product-info"><p class="product-id">NO. ${esc(p.id)}</p><h3><button type="button" data-detail="${esc(p.id)}">${esc(displayName(p))}</button></h3>${p.specification ? `<p class="product-spec">${esc(p.specification)}</p>` : ''}<div class="product-bottom"><span>${esc(p.priceText || '價格請洽詢')}</span><button class="add-button${inquiry[p.id] ? ' added' : ''}" type="button" data-add="${esc(p.id)}" aria-label="將${esc(displayName(p))}加入詢價清單">${inquiry[p.id] ? '✓' : '＋'}</button></div></div></article>`).join('');
    renderCategoryFilters();
    renderPagination(pages, matches.length);
    if (updateUrl) writeUrl();
    if (scroll) scrollCatalog();
  }
  function renderPagination(pages, count) {
    if (!count || pages < 2) { $('#pagination').innerHTML = ''; return; }
    const indexes = new Set([1, pages, state.page - 1, state.page, state.page + 1]);
    if (state.page < 4) [2, 3, 4].forEach(p => indexes.add(p));
    if (state.page > pages - 3) [pages - 3, pages - 2, pages - 1].forEach(p => indexes.add(p));
    const items = [...indexes].filter(p => p >= 1 && p <= pages).sort((a, b) => a - b);
    let last = 0;
    let content = `<button type="button" class="page-arrow" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''} aria-label="上一頁">←</button>`;
    for (const p of items) { if (last && p - last > 1) content += '<span class="page-gap">…</span>'; content += `<button type="button" data-page="${p}" ${p === state.page ? 'aria-current="page" class="current"' : ''} aria-label="第${p}頁">${p}</button>`; last = p; }
    content += `<button type="button" class="page-arrow" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''} aria-label="下一頁">→</button><small>共 ${pages} 頁</small>`;
    $('#pagination').innerHTML = content;
  }
  function changeCategory(key) { state.category = key; state.seafoodTag = ''; state.page = 1; renderCatalog({ scroll: true, updateUrl: true }); }
  function changeSeafoodTag(key) { state.category = 'seafood'; state.seafoodTag = key; state.page = 1; renderCatalog({ scroll: true, updateUrl: true }); }
  function search(value, scroll = false) { state.query = value.trim().slice(0, 150); state.page = 1; $('#product-search').value = state.query; renderCatalog({ scroll, updateUrl: true }); }
  $('#search-form').addEventListener('submit', e => { e.preventDefault(); search($('#product-search').value, true); });
  let searchTimer;
  $('#product-search').addEventListener('input', e => { clearTimeout(searchTimer); searchTimer = setTimeout(() => search(e.target.value), 140); });
  $('#search-clear').addEventListener('click', () => { search(''); $('#product-search').focus(); });
  $('#reset-search').addEventListener('click', () => { state.category = 'all'; state.seafoodTag = ''; search(''); });
  $('#sort-select').addEventListener('change', e => { state.sort = e.target.value; state.page = 1; renderCatalog({ updateUrl: true }); });
  document.querySelectorAll('[data-focus-search]').forEach(b => b.addEventListener('click', () => { scrollCatalog(); $('#product-search').focus({ preventScroll: true }); }));

  function showProduct(id) {
    const p = productById.get(id); if (!p) return;
    currentProduct = p;
    $('#detail-category').textContent = `${p.category} / ${categories.find(c => c.key === p.categoryKey)?.english || ''}`;
    $('#detail-name').textContent = displayName(p); $('#detail-id').textContent = `商品編號 ${p.id}`;
    $('#detail-price').textContent = p.priceText || '價格請洽詢';
    $('#detail-specs').innerHTML = p.specification ? `<dt>商品規格</dt><dd>${esc(p.specification)}</dd>` : '';
    $('#detail-description').textContent = p.description || '';
    $('#detail-description').hidden = !p.description;
    $('#detail-quantity').value = 1;
    const paths = [...new Set([imageOf(p), ...(p.gallery || [])].filter(Boolean))];
    $('#detail-image').hidden = !paths.length;
    $('#detail-image').src = paths[0] || 'assets/identity/logo-square.png';
    $('#detail-image').alt = displayName(p);
    $('#detail-thumbs').innerHTML = paths.length > 1 ? paths.map((path, i) => `<button type="button" class="${i ? '' : 'active'}" data-gallery="${esc(path)}" aria-label="查看第${i + 1}張商品圖片"><img src="${esc(path)}" alt="${esc(displayName(p))}，第${i + 1}張" loading="lazy"></button>`).join('') : '';
    if (!paths.length) { $('#detail-thumbs').innerHTML = '<p class="detail-note">原目錄未提供商品圖片。</p>'; }
    openDialog('product-dialog');
  }
  function quantity() { return Math.max(1, Math.min(9999, Math.floor(Number($('#detail-quantity').value) || 1))); }
  $('#detail-minus').addEventListener('click', () => { $('#detail-quantity').value = Math.max(1, quantity() - 1); });
  $('#detail-plus').addEventListener('click', () => { $('#detail-quantity').value = Math.min(9999, quantity() + 1); });
  $('#detail-quantity').addEventListener('change', () => { $('#detail-quantity').value = quantity(); });
  function add(id, amount = 1) { if (!productById.has(id)) return; inquiry[id] = Math.min(9999, (Number(inquiry[id]) || 0) + amount); saveInquiry(); renderCatalog(); toast(`已加入詢價清單：${displayName(productById.get(id))}`); }
  $('#detail-add').addEventListener('click', () => { if (currentProduct) add(String(currentProduct.id), quantity()); });
  document.addEventListener('click', e => {
    const qrButton = e.target.closest('[data-qr]');
    if (qrButton) {
      const qr = config.qrItems?.[qrButton.dataset.qr];
      if (qr) { $('#qr-title').textContent = qr.title; $('#qr-image').src = qr.image; $('#qr-image').alt = qr.title + ' QR 碼'; $('#qr-link').href = qr.url; openDialog('qr-dialog'); }
    }
    const seafoodTag = e.target.closest('[data-seafood-tag]'); if (seafoodTag) changeSeafoodTag(seafoodTag.dataset.seafoodTag);
    const category = e.target.closest('[data-category]'); if (category) changeCategory(category.dataset.category);
    const query = e.target.closest('[data-query]'); if (query) { state.category = 'all'; state.seafoodTag = ''; search(query.dataset.query, true); }
    const page = e.target.closest('[data-page]'); if (page && !page.disabled) { state.page = Number(page.dataset.page); renderCatalog({ scroll: true, updateUrl: true }); }
    const detail = e.target.closest('[data-detail]'); if (detail) showProduct(detail.dataset.detail);
    const addButton = e.target.closest('[data-add]'); if (addButton) add(addButton.dataset.add);
    const gallery = e.target.closest('[data-gallery]'); if (gallery) { $('#detail-image').src = gallery.dataset.gallery; document.querySelectorAll('[data-gallery]').forEach(x => x.classList.toggle('active', x === gallery)); }
    if (e.target.closest('[data-clear-query]')) search('');
    const remove = e.target.closest('[data-remove]'); if (remove) { delete inquiry[remove.dataset.remove]; saveInquiry(); renderList(); renderCatalog(); }
  });

  function renderList() {
    updateListCount();
    const entries = Object.entries(inquiry).map(([id, amount]) => ({ p: productById.get(id), amount })).filter(x => x.p);
    $('#list-footer').hidden = !entries.length;
    $('#list-body').innerHTML = entries.length ? entries.map(({ p, amount }) => `<div class="list-item"><button type="button" class="list-item-photo" data-detail="${esc(p.id)}">${imageMarkup(p)}</button><div><small>${esc(p.category)} · ${esc(p.id)}</small><h3>${esc(displayName(p))}</h3><span>${esc(p.priceText || '價格請洽詢')}</span><label>數量 <input type="number" min="1" max="9999" value="${amount}" data-list-quantity="${esc(p.id)}" aria-label="${esc(displayName(p))}的數量"></label></div><button type="button" data-remove="${esc(p.id)}" class="remove-item" aria-label="移除${esc(displayName(p))}">×</button></div>`).join('') : '<div class="list-empty"><img src="assets/identity/logo-square.png" width="65" height="65" alt=""><h3>先挑幾樣喜歡的吧。</h3><p>點選商品旁的「＋」，就能加入清單。</p><button class="button button-primary" data-close="list-dialog">開始挑選 ↗</button></div>';
    $('#list-body').querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeDialog(b.dataset.close)));
  }
  function showList() { renderList(); openDialog('list-dialog'); }
  $('#open-list').addEventListener('click', showList); $('#view-inquiry').addEventListener('click', showList);
  $('#list-body').addEventListener('change', e => { const input = e.target.closest('[data-list-quantity]'); if (!input) return; inquiry[input.dataset.listQuantity] = Math.max(1, Math.min(9999, Math.floor(+input.value || 1))); input.value = inquiry[input.dataset.listQuantity]; saveInquiry(); });
  function inquiryText() { const lines = [(config.brand || '魚文樂商城') + '｜商品詢價清單', `日期：${new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei' }).format(new Date())}`, '']; let i = 0; for (const [id, amount] of Object.entries(inquiry)) { const p = productById.get(id); if (p) lines.push(`${++i}. 【${p.category}】${displayName(p)}（編號 ${id}）`, `   詢問數量：${amount}${p.specification ? '\n   規格：' + p.specification : ''}`); } const note = $('#inquiry-note').value.trim(); if (note) lines.push('', '補充需求：' + note); lines.push('', '請協助確認規格、計價單位、庫存與報價。'); return lines.join('\n'); }
  $('#copy-list').addEventListener('click', async () => { const text = inquiryText(); let copied = false; try { await navigator.clipboard.writeText(text); copied = true; } catch { const a = document.createElement('textarea'); a.value = text; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.append(a); a.focus(); a.select(); try { copied = document.execCommand('copy'); } catch {} a.remove(); } if (copied) toast('已複製詢價清單'); else { $('#inquiry-note').value = text; $('#inquiry-note').select(); toast('請選取文字後手動複製，或點「下載清單」'); } });
  $('#download-list').addEventListener('click', () => { const blob = new Blob(['\uFEFF' + inquiryText()], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = '魚文樂-詢價清單.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); });
  window.addEventListener('hashchange', () => { if (location.hash === '#cart') showList(); else if (location.hash.startsWith('#catalog?')) { urlState(); renderCatalog({ scroll: true }); } });
  populateBrand(); renderCategoryTiles(); urlState(); renderCatalog(); updateListCount();
  if (location.hash === '#cart') showList();
})();

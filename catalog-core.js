(function (root) {
  'use strict';
  const categories = [
    { key: 'seafood', name: '海鮮', english: 'SEAFOOD', lead: '把鮮味帶上桌', short: '鮮', heroId: '253106' },
    { key: 'beef', name: '牛肉', english: 'BEEF', lead: '從原塊到切片', short: '牛', heroId: '491078' },
    { key: 'lamb', name: '羊肉', english: 'LAMB', lead: '鍋物與燒烤之選', short: '羊' },
    { key: 'chicken', name: '雞肉', english: 'CHICKEN', lead: '日常料理好搭配', short: '雞', heroId: '253128' },
    { key: 'pork', name: '豬肉', english: 'PORK', lead: '家常餐桌的美味', short: '豬', heroId: '422820' },
    { key: 'duck', name: '鴨肉', english: 'DUCK', lead: '換個口味也精彩', short: '鴨' },
    { key: 'hotpot', name: '火鍋料', english: 'HOT POT', lead: '圍爐的豐富滋味', short: '鍋', heroId: '419374' }
  ];
  const seafoodSubcategories = [
    { key: 'fish', name: '魚類', pattern: /魚|鮭|鱈|鯖|鯧|鯛|鰻|鮪|鰆|鯰|虱目|秋刀|午魚|石斑|比目|鱸|鬼頭刀|土魠|多利|巴沙|鯡|鰈|鰹|鰤|香魚|青甘|紅甘|紅條|赤尾冬|赤鬃|赤棕|紅目鰱|燕尾|東星斑|紅鰷|尖尾公卷/ },
    { key: 'shrimp', name: '蝦類', pattern: /蝦|龍蝦|甜蝦|明蝦/ },
    { key: 'crab', name: '蟹類', pattern: /蟹|蟳|螃蟹|沙公|沙母/ },
    { key: 'shellfish', name: '貝類', pattern: /貝|蛤|蠔|牡蠣|蚵|螺|鮑魚|海膽|蜆|淡菜/ },
    { key: 'cephalopod', name: '軟體', pattern: /花枝|魷魚|透抽|小卷|大卷|中卷|章魚|墨魚|軟絲|烏賊|砲管/ },
    { key: 'processed', name: '加工品', pattern: /醬油漬|醬漬|魚子醬|醬汁|醬料|蒲燒|佃煮|味噌|醃漬|醃製|泡菜|裹粉|裹漿|麵衣|天婦羅|酥炸|炸蝦|蝦球|蝦餅|蝦捲|蝦卷|魚丸|花枝丸|甜不辣|魚漿|花枝漿|蟹味棒|蟹肉棒|海鮮卷|海鮮捲|一口吃|煙燻|燻製|魚鬆|可樂餅|鹹酥|烏魚子|照燒|黑胡椒|椒鹽|香辣|麻辣|奶油|起司/ },
    { key: 'other', name: '其他海鮮', fallback: true }
  ];
  function normalize(value) {
    return String(value || '').normalize('NFKC').toLowerCase().replace(/臺/g, '台').replace(/[\s\p{P}\p{S}]+/gu, ' ').trim();
  }
  function searchable(product) {
    return normalize([product.name, product.originalName, product.category, product.specification, product.description, product.id].join(' '));
  }
  const seafoodTagOverrides = {
    '55419476534': ['cephalopod'], '43502534848': ['fish'], '41352560472': ['cephalopod'],
    '29969815614': ['shellfish'], '29214602004': ['fish'], '28064596549': ['fish'],
    '27262345969': ['shellfish'], '27116812992': ['shellfish'], '26622402199': ['shellfish'],
    '25955681648': ['fish'], '25145655086': ['processed'], '24786286644': ['shellfish'],
    '24759180792': ['cephalopod'], '24605517249': ['fish'], '22554191755': ['processed'],
    '22485525069': ['fish'], '20078865369': ['shrimp'], '17396621936': ['fish'],
    '11494664670': ['cephalopod'], '11283049487': ['processed'], '9837165743': ['processed'],
    '9467220160': ['fish'], '9367549142': ['shellfish'], '8525951049': ['cephalopod'],
    '7569960238': ['processed'], '5890356134': ['cephalopod'], '5081919749': ['shellfish'],
    '4381101246': ['shellfish']
  };
  function getSeafoodTags(product) {
    const override = seafoodTagOverrides[String(product.id)];
    if (override) return override.map(key => `seafood-${key}`);
    const text = String(product.name || product.originalName || '').split(/[／/|｜]/, 1)[0].replace(/【?魚文樂商城】?/g, '');
    const tags = seafoodSubcategories.filter(tag => !tag.fallback && tag.pattern.test(text)).map(tag => `seafood-${tag.key}`);
    if (!tags.some(tag => tag !== 'seafood-processed')) tags.push('seafood-other');
    return tags;
  }
  function filterProducts(products, { query = '', category = 'all', seafoodTag = '', sort = 'source' } = {}) {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    const result = products.filter(p => (category === 'all' || p.categoryKey === category) && (!seafoodTag || p.seafoodTags?.includes(seafoodTag)) && tokens.every(word => (p.searchText || searchable(p)).includes(word)));
    if (sort === 'name') result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hant') || Number(a.order) - Number(b.order));
    if (sort === 'category') result.sort((a, b) => categories.findIndex(c => c.key === a.categoryKey) - categories.findIndex(c => c.key === b.categoryKey) || Number(a.order) - Number(b.order));
    return result;
  }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
  root.CatalogCore = { categories, seafoodSubcategories, getSeafoodTags, normalize, searchable, filterProducts, escapeHtml };
})(typeof window === 'undefined' ? globalThis : window);

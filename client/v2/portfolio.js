'use strict';

const API_BASE = 'http://localhost:8092';

let allDeals = [];
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
let currentPage = 1;
let pageSize = 6;
let currentFilter = null;
let currentSort = 'profit-desc';
let currentSearchTerm = '';
let showFavoritesOnly = false;

const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const selectSort = document.querySelector('#sort-select');
const sectionDeals = document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');
const spanNbSales = document.querySelector('#nbSales');
const spanP5SalesPrice = document.querySelector('#p5SalesPrice');
const spanP25SalesPrice = document.querySelector('#p25SalesPrice');
const spanP50SalesPrice = document.querySelector('#p50SalesPrice');
const spanAverageSalesPrice = document.querySelector('#averageSalesPrice');
const spanLifetimeValue = document.querySelector('#lifetimeValue');
const spanSavedItems = document.querySelector('#savedItems');
const spanResultsCount = document.querySelector('#resultsCount');

const btnApplyFilters = document.querySelector('.btn-apply-filters');
const btnResetFilters = document.querySelector('.btn-reset-filters');
const searchInput = document.querySelector('#search-input');
const searchBtn = document.querySelector('.search-btn');
const btnFilterBestDiscount = document.querySelector('#filterBestDiscount');
const btnFilterMostCommented = document.querySelector('#filterMostCommented');
const btnFilterHotDeals = document.querySelector('#filterHotDeals');
const btnFilterFavorites = document.querySelector('#filterFavorites');

const getDealKey = (deal) => deal?._id || deal?.uuid || '';

const setFavorites = (nextFavorites) => {
  favorites = nextFavorites;
  localStorage.setItem('favorites', JSON.stringify(favorites));
  updateSavedCount();
};

const fetchDeals = async () => {
  try {
    const response = await fetch(`${API_BASE}/deals/search?limit=1000`);
    const body = await response.json();
    return Array.isArray(body.results) ? body.results : [];
  } catch (error) {
    console.error('Failed to fetch deals', error);
    return [];
  }
};

const fetchSales = async (legoSetId, dealTitle = '') => {
  try {
    const response = await fetch(
      `${API_BASE}/sales/search?legoSetId=${encodeURIComponent(legoSetId)}&keywords=${encodeURIComponent(dealTitle)}&limit=1000`
    );
    const body = await response.json();
    return Array.isArray(body.results) ? body.results : [];
  } catch (error) {
    console.error(`Failed to fetch sales for ${legoSetId}`, error);
    return [];
  }
};

const calculateVintedAverage = (sales) => {
  if (!sales || sales.length === 0) {
    return 0;
  }

  const prices = sales.map((sale) => getPriceFromSale(sale)).filter((price) => price > 0);
  if (prices.length === 0) {
    return 0;
  }

  return prices.reduce((sum, price) => sum + price, 0) / prices.length;
};

const enrichDealsWithVintedAverages = async (deals) => {
  const enriched = await Promise.all(
    deals.map(async (deal) => {
      const sales = await fetchSales(deal.id || '', deal.title || '');
      return {
        ...deal,
        vintedAverage: calculateVintedAverage(sales),
      };
    })
  );

  return enriched;
};

const calculateProfit = (deal) => {
  const dealabsPrice = parseFloat(deal.price) || 0;
  const vintedPrice = parseFloat(deal.vintedAverage) || 0;
  return vintedPrice > 0 ? vintedPrice - dealabsPrice : 0;
};

const sortDeals = (deals, sortType) => {
  const sorted = [...deals];

  if (sortType === 'price-asc') {
    return sorted.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
  }

  if (sortType === 'price-desc') {
    return sorted.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
  }

  if (sortType === 'profit-desc') {
    return sorted.sort((a, b) => calculateProfit(b) - calculateProfit(a));
  }

  if (sortType === 'date-asc') {
    return sorted.sort((a, b) => (a.published || 0) - (b.published || 0));
  }

  if (sortType === 'date-desc') {
    return sorted.sort((a, b) => (b.published || 0) - (a.published || 0));
  }

  return sorted;
};

const filterDeals = (deals, filterType) => {
  if (filterType === 'best-discount') {
    return deals.filter((deal) => (deal.discount || 0) > 50);
  }

  if (filterType === 'most-commented') {
    return deals.filter((deal) => (deal.comments || 0) > 15);
  }

  if (filterType === 'hot-deals') {
    return deals.filter((deal) => (deal.temperature || 0) > 100);
  }

  return deals;
};

const isDealFavorite = (dealId) => isFavorite(dealId, favorites);

const toggleDealFavorite = (dealId) => {
  if (isDealFavorite(dealId)) {
    setFavorites(favorites.filter((favoriteId) => favoriteId !== dealId));
    return;
  }

  setFavorites([...favorites, dealId]);
};

const updateSavedCount = () => {
  if (spanSavedItems) {
    spanSavedItems.textContent = favorites.length;
  }

  const btnExport = document.querySelector('.btn-export');
  if (btnExport) {
    btnExport.textContent = `📥 Export Saved (${favorites.length})`;
  }
};

const renderPagination = (totalItems) => {
  if (!selectPage) {
    return;
  }

  const pageCount = Math.max(Math.ceil(totalItems / pageSize), 1);
  const selectedPage = Math.min(currentPage, pageCount);
  const options = Array.from({ length: pageCount }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join('');

  selectPage.innerHTML = options;
  selectPage.value = String(selectedPage);
};

const renderLegoSetIds = (deals) => {
  if (!selectLegoSetIds) {
    return;
  }

  const ids = [...new Set(deals.map((deal) => deal.id).filter(Boolean))];
  selectLegoSetIds.innerHTML = ids.map((id) => `<option value="${id}">${id}</option>`).join('');
};

const renderSalesStats = (sales) => {
  const result = Array.isArray(sales) ? sales : [];

  if (spanNbSales) spanNbSales.textContent = result.length;

  if (result.length === 0) {
    if (spanP5SalesPrice) spanP5SalesPrice.textContent = '0';
    if (spanP25SalesPrice) spanP25SalesPrice.textContent = '0';
    if (spanP50SalesPrice) spanP50SalesPrice.textContent = '0';
    if (spanAverageSalesPrice) spanAverageSalesPrice.textContent = '0';
    if (spanLifetimeValue) spanLifetimeValue.textContent = '0 days';
    return;
  }

  const prices = result.map((sale) => getPriceFromSale(sale)).filter((price) => price > 0);
  const lifetime = calculateLifetime(result);

  if (spanLifetimeValue) spanLifetimeValue.textContent = lifetime;

  if (prices.length > 0) {
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    if (spanP5SalesPrice) spanP5SalesPrice.textContent = calculatePercentile(prices, 5).toFixed(2);
    if (spanP25SalesPrice) spanP25SalesPrice.textContent = calculatePercentile(prices, 25).toFixed(2);
    if (spanP50SalesPrice) spanP50SalesPrice.textContent = calculatePercentile(prices, 50).toFixed(2);
    if (spanAverageSalesPrice) spanAverageSalesPrice.textContent = average.toFixed(2);
  }
};

const renderDeals = (deals) => {
  if (!sectionDeals) {
    return;
  }

  if (deals.length === 0) {
    sectionDeals.innerHTML = '';
    return;
  }

  const container = document.createElement('div');
  container.className = 'deals-container';

  container.innerHTML = deals.map((deal) => {
    const dealabsPrice = parseFloat(deal.price) || 0;
    const vintedPrice = parseFloat(deal.vintedAverage) || 0;
    const profit = vintedPrice > 0 ? vintedPrice - dealabsPrice : 0;
    const profitPercent = dealabsPrice > 0 ? Math.round((profit / dealabsPrice) * 100) : 0;
    const dealKey = getDealKey(deal);
    const isSaved = isDealFavorite(dealKey);

    return `
      <div class="deal-card" id="${dealKey}">
        <div class="deal-header">
          <div class="deal-image">🧱</div>
          <div class="deal-title-section">
            <div class="deal-ref">Ref. ${deal.id || '-'}</div>
            <div class="deal-title">${deal.title}</div>
            <div class="deal-links">
              <a href="${deal.link}" target="_blank" rel="noopener noreferrer" class="deal-link">View on Dealabs</a>
            </div>
          </div>
        </div>
        <div class="deal-content">
          <div class="price-row">
            <a href="${deal.link}" target="_blank" rel="noopener noreferrer" class="price-badge badge-dealabs" style="cursor: pointer; text-decoration: none; display: flex; flex-direction: column;">
              <div class="price-label">DEALABS</div>
              <div class="price-value">€${dealabsPrice.toFixed(2)}</div>
            </a>
            <div class="price-badge badge-vinted">
              <div class="price-label">VINTED</div>
              <div class="price-value">€${vintedPrice.toFixed(2)}</div>
            </div>
          </div>
          <div class="profit-row">
            <div class="profit-label">PROFIT</div>
            <div>
              <span class="profit-value">💰 €${profit.toFixed(2)}</span>
              <span class="profit-percent">+${profitPercent}%</span>
            </div>
          </div>
        </div>
        <div class="deal-footer">
          <button class="btn-save ${isSaved ? 'saved' : ''}" data-uuid="${dealKey}">${isSaved ? '❤️ Saved' : '🤍 Save'}</button>
          <button class="btn-details" data-uuid="${dealKey}">Details</button>
        </div>
      </div>
    `;
  }).join('');

  sectionDeals.innerHTML = '';
  sectionDeals.appendChild(container);

  sectionDeals.querySelectorAll('.btn-save').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      toggleDealFavorite(event.currentTarget.dataset.uuid);
      event.currentTarget.classList.toggle('saved');
      event.currentTarget.textContent = isDealFavorite(event.currentTarget.dataset.uuid) ? '❤️ Saved' : '🤍 Save';
      renderView();
    });
  });

  sectionDeals.querySelectorAll('.btn-details').forEach((button) => {
    button.addEventListener('click', (event) => {
      window.location.href = `details.html?id=${event.currentTarget.dataset.uuid}`;
    });
  });
};

const renderView = () => {
  const searchTerm = currentSearchTerm.trim().toLowerCase();
  let visibleDeals = [...allDeals];

  if (searchTerm) {
    visibleDeals = visibleDeals.filter((deal) => {
      const title = (deal.title || '').toLowerCase();
      const setId = String(deal.id || '').toLowerCase();
      return title.includes(searchTerm) || setId.includes(searchTerm);
    });
  }

  visibleDeals = filterDeals(visibleDeals, currentFilter);

  if (showFavoritesOnly) {
    visibleDeals = visibleDeals.filter((deal) => isDealFavorite(getDealKey(deal)));
  }

  visibleDeals = sortDeals(visibleDeals, currentSort);

  const totalResults = visibleDeals.length;
  const pageCount = Math.max(Math.ceil(totalResults / pageSize), 1);
  currentPage = Math.min(currentPage, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageDeals = visibleDeals.slice(start, start + pageSize);

  if (spanResultsCount) spanResultsCount.textContent = totalResults;
  renderDeals(pageDeals);
  renderPagination(totalResults);
  renderLegoSetIds(allDeals);
  updateSavedCount();
};

const loadDeals = async () => {
  const deals = await fetchDeals();
  allDeals = deals;
  renderView();

  enrichDealsWithVintedAverages(deals)
    .then((enrichedDeals) => {
      allDeals = enrichedDeals;
      renderView();
    })
    .catch((error) => {
      console.error('Failed to enrich deals', error);
    });
};

selectShow?.addEventListener('change', () => {
  pageSize = parseInt(selectShow.value, 10) || 6;
  currentPage = 1;
  renderView();
});

selectPage?.addEventListener('change', () => {
  currentPage = parseInt(selectPage.value, 10) || 1;
  renderView();
});

selectSort?.addEventListener('change', (event) => {
  currentSort = event.target.value || 'profit-desc';
  renderView();
});

btnApplyFilters?.addEventListener('click', () => renderView());

btnResetFilters?.addEventListener('click', () => {
  currentFilter = null;
  currentSort = 'profit-desc';
  currentSearchTerm = '';
  showFavoritesOnly = false;
  currentPage = 1;
  if (searchInput) searchInput.value = '';
  if (selectSort) selectSort.value = 'profit-desc';
  btnFilterBestDiscount?.classList.remove('active');
  btnFilterMostCommented?.classList.remove('active');
  btnFilterHotDeals?.classList.remove('active');
  btnFilterFavorites?.classList.remove('active');
  renderView();
});

btnFilterBestDiscount?.addEventListener('click', () => {
  currentFilter = currentFilter === 'best-discount' ? null : 'best-discount';
  btnFilterBestDiscount.classList.toggle('active');
  btnFilterMostCommented?.classList.remove('active');
  btnFilterHotDeals?.classList.remove('active');
  renderView();
});

btnFilterMostCommented?.addEventListener('click', () => {
  currentFilter = currentFilter === 'most-commented' ? null : 'most-commented';
  btnFilterMostCommented.classList.toggle('active');
  btnFilterBestDiscount?.classList.remove('active');
  btnFilterHotDeals?.classList.remove('active');
  renderView();
});

btnFilterHotDeals?.addEventListener('click', () => {
  currentFilter = currentFilter === 'hot-deals' ? null : 'hot-deals';
  btnFilterHotDeals.classList.toggle('active');
  btnFilterBestDiscount?.classList.remove('active');
  btnFilterMostCommented?.classList.remove('active');
  renderView();
});

btnFilterFavorites?.addEventListener('click', () => {
  showFavoritesOnly = !showFavoritesOnly;
  btnFilterFavorites.classList.toggle('active');
  renderView();
});

searchBtn?.addEventListener('click', () => {
  currentSearchTerm = searchInput ? searchInput.value : '';
  currentPage = 1;
  renderView();
});

searchInput?.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    searchBtn?.click();
  }
});

selectLegoSetIds?.addEventListener('change', async (event) => {
  const id = event.target.value;
  if (!id) {
    renderSalesStats([]);
    return;
  }

  const currentDeal = allDeals.find((deal) => String(deal.id) === String(id));
  const sales = await fetchSales(id, currentDeal?.title || '');
  renderSalesStats(sales);
});

document.addEventListener('DOMContentLoaded', async () => {
  if (selectSort) selectSort.value = 'profit-desc';
  await loadDeals();
});
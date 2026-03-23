// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://lego-api-blue.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return

GET https://lego-api-blue.vercel.app/sales

Search for current Vinted sales for a given lego set id

This endpoint accepts the following optional query string parameters:

- `id` - lego set id to return
*/

// current deals on the page
let currentDeals = [];
let currentPagination = {};
let currentFilter = null;
let currentSort = null;
let showFavoritesOnly = false;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const selectSort = document.querySelector('#sort-select');
const sectionDeals= document.querySelector('#deals');
const sectionSales = document.querySelector('#sales');
const spanNbDeals = document.querySelector('#nbDeals');
const spanNbSales = document.querySelector('#nbSales');
const spanP5SalesPrice = document.querySelector('#p5SalesPrice');
const spanP25SalesPrice = document.querySelector('#p25SalesPrice');
const spanP50SalesPrice = document.querySelector('#p50SalesPrice');
const spanAverageSalesPrice = document.querySelector('#averageSalesPrice');
const spanLifetimeValue = document.querySelector('#lifetimeValue');
const spanTotalSets = document.querySelector('#totalSets');
const spanProfitableSets = document.querySelector('#profitableSets');
const spanAvgProfit = document.querySelector('#avgProfit');
const spanSavedItems = document.querySelector('#savedItems');
const spanResultsCount = document.querySelector('#resultsCount');

const btnApplyFilters = document.querySelector('.btn-apply-filters');
const btnResetFilters = document.querySelector('.btn-reset-filters');
const searchInput = document.querySelector('#search-input');
const searchBtn = document.querySelector('.search-btn');

// Quick filter buttons
const btnFilterBestDiscount = document.querySelector('#filterBestDiscount');
const btnFilterMostCommented = document.querySelector('#filterMostCommented');
const btnFilterHotDeals = document.querySelector('#filterHotDeals');
const btnFilterFavorites = document.querySelector('#filterFavorites');

/**
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({result, meta}) => {
  currentDeals = result;
  currentPagination = meta;
};

/**
 * Fetch deals from api
 * @param  {Number}  [page=1] - current page to fetch
 * @param  {Number}  [size=12] - size of the page
 * @return {Object}
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return {currentDeals, currentPagination};
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return {currentDeals, currentPagination};
  }
};

/**
 * Fetch sales from api
 * @param  {Number} id - lego set id
 * @return {Object}
 */
const fetchSales = async (id) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/sales?id=${id}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return {nbSales: 0};
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return {nbSales: 0};
  }
};

/**
 * Filter deals by discount
 * @param  {Array} deals
 * @param  {String} filterType - type of filter to apply
 * @return {Array}
 */
const filterDeals = (deals, filterType) => {
  if (filterType === 'best-discount') {
    return deals.filter(deal => deal.discount && deal.discount > 50);
  }
  if (filterType === 'most-commented') {
    return deals.filter(deal => deal.comments && deal.comments > 15);
  }
  if (filterType === 'hot-deals') {
    return deals.filter(deal => deal.temperature && deal.temperature > 100);
  }
  return deals;
};

/**
 * Calculate average price from Vinted sales
 */
const calculateVintedAverage = (sales) => {
  console.log('calculateVintedAverage - received:', sales);
  
  if (!sales || !sales.result || sales.result.length === 0) {
    console.log('No Vinted sales found');
    return 0;
  }

  const prices = sales.result
    .map(sale => getPriceFromSale(sale))
    .filter(price => price > 0);

  console.log('Extracted prices:', prices);

  if (prices.length === 0) {
    console.log('No valid prices found');
    return 0;
  }

  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  console.log('Calculated average:', average);
  
  return average;
};

/**
 * Enrich deals with Vinted average prices
 */
const enrichDealsWithVintedAverages = async (deals) => {
  try {
    console.log('Starting to enrich deals with Vinted averages...', deals.length);
    
    // Fetch Vinted sales for each deal in parallel
    const salesPromises = deals.map(deal => 
      fetchSales(deal.id)
        .then(sales => {
          const avg = calculateVintedAverage(sales);
          console.log(`Deal ${deal.id}: Vinted average = €${avg.toFixed(2)}`);
          return {
            uuid: deal.uuid,
            average: avg
          };
        })
    );

    const averagePrices = await Promise.all(salesPromises);

    // Create a map of uuid -> average price
    const priceMap = {};
    averagePrices.forEach(item => {
      priceMap[item.uuid] = item.average;
    });

    // Enrich deals with vinted average
    const enrichedDeals = deals.map(deal => ({
      ...deal,
      vintedAverage: priceMap[deal.uuid] || 0
    }));
    
    console.log('Enrichment complete', enrichedDeals[0]);
    return enrichedDeals;
  } catch (error) {
    console.error('Error enriching deals with Vinted averages:', error);
    return deals;
  }
};

/**
 * Sort deals
 * @param  {Array} deals
 * @param  {String} sortType - type of sort to apply
 * @return {Array}
 */
const sortDeals = (deals, sortType) => {
  const sorted = [...deals];
  if (sortType === 'price-asc') {
    return sorted.sort((a, b) => a.price - b.price);
  }
  if (sortType === 'price-desc') {
    return sorted.sort((a, b) => b.price - a.price);
  }
  if (sortType === 'profit-desc') {
    return sorted.sort((a, b) => (calculateProfit(b) || 0) - (calculateProfit(a) || 0));
  }
  if (sortType === 'date-asc') {
    return sorted.sort((a, b) => new Date(b.published) - new Date(a.published));
  }
  if (sortType === 'date-desc') {
    return sorted.sort((a, b) => new Date(a.published) - new Date(b.published));
  }
  return sorted;
};

/**
 * Calculate profit between two prices
 * @param {Object} deal - deal object
 * @return {Number} profit amount
 */
const calculateProfit = (deal) => {
  if (!deal || !deal.price) return 0;
  const dealabsPrice = parseFloat(deal.price) || 0;
  const vintedPrice = deal.vintedAverage > 0 ? deal.vintedAverage : parseFloat(deal.vinted_price) || 0;
  return vintedPrice > 0 ? vintedPrice - dealabsPrice : 0;
};

/**
 * Calculate profit percentage
 * @param {Object} deal - deal object
 * @return {Number} profit percentage
 */
const calculateProfitPercent = (deal) => {
  const profit = calculateProfit(deal);
  const cost = parseFloat(deal.price) || 0;
  return cost > 0 ? Math.round((profit / cost) * 100) : 0;
};

/**
 * Render list of deals
 * @param  {Array} deals
 */
const renderDeals = deals => {
  console.log('Rendering deals:', deals[0]);
  
  const container = document.createElement('div');
  container.className = 'deals-container';
  
  const template = deals
    .map(deal => {
      const isFav = isFavorite(deal.uuid, favorites);
      const dealabsPrice = parseFloat(deal.price) || 0;
      const vintedPrice = deal.vintedAverage > 0 ? deal.vintedAverage : parseFloat(deal.vinted_price) || 150;
      const profit = vintedPrice - dealabsPrice;
      const profitPercent = dealabsPrice > 0 ? Math.round((profit / dealabsPrice) * 100) : 0;
      
      console.log(`Card: ID ${deal.id}, vintedAverage: ${deal.vintedAverage}, using price: ${vintedPrice}`);
      
      return `
        <div class="deal-card" id="${deal.uuid}">
          <div class="deal-header">
            <div class="deal-image">🧱</div>
            <div class="deal-title-section">
              <div class="deal-ref">Ref. ${deal.id}</div>
              <div class="deal-title">${deal.title}</div>
              <div class="deal-links">
                <a href="${deal.link}" target="_blank" rel="noopener noreferrer" class="deal-link">View on Dealabs</a>
                ${deal.vinted_link ? `<a href="${deal.vinted_link}" target="_blank" rel="noopener noreferrer" class="deal-link">View on Vinted</a>` : ''}
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
            <button class="btn-save ${isFav ? 'saved' : ''}" data-uuid="${deal.uuid}" title="Add to favorites">
              ${isFav ? '❤️ Saved' : '🤍 Save'}
            </button>
            <button class="btn-details" data-uuid="${deal.uuid}" title="View details">Details</button>
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = template;
  sectionDeals.innerHTML = '';
  sectionDeals.appendChild(container);

  // Update results count
  spanResultsCount.textContent = deals.length;

  // Add event listeners to save buttons
  const saveBtns = sectionDeals.querySelectorAll('.btn-save');
  saveBtns.forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      const dealId = event.currentTarget.dataset.uuid;
      favorites = toggleFavorite(dealId, favorites);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      const isFav = isFavorite(dealId, favorites);
      event.currentTarget.classList.toggle('saved');
      event.currentTarget.textContent = isFav ? '❤️ Saved' : '🤍 Save';
      updateSavedCount();
    });
  });

  // Add event listeners to details buttons
  const detailsBtns = sectionDeals.querySelectorAll('.btn-details');
  detailsBtns.forEach(btn => {
    btn.addEventListener('click', (event) => {
      const dealId = event.currentTarget.dataset.uuid;
      // Navigate to details page with uuid as parameter
      window.location.href = `details.html?id=${dealId}`;
    });
  });
};

/**
 * Update saved items count
 */
const updateSavedCount = () => {
  spanSavedItems.textContent = favorites.length;
  const btnExport = document.querySelector('.btn-export');
  if (btnExport) {
    btnExport.textContent = `📥 Export Saved (${favorites.length})`;
  }
};

/**
 * Update saved items count
 */
const updateSavedCount = () => {
  spanSavedItems.textContent = favorites.length;
  const btnExport = document.querySelector('.btn-export');
  if (btnExport) {
    btnExport.textContent = `📥 Export Saved (${favorites.length})`;
  }
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const {currentPage, pageCount} = pagination;
  const options = Array.from(
    {'length': pageCount},
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

/**
 * Render lego set ids selector
 * @param  {Array} lego set ids
 */
const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  const options = ids.map(id => 
    `<option value="${id}">${id}</option>`
  ).join('');

  selectLegoSetIds.innerHTML = options;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderIndicators = pagination => {
  const {count} = pagination;
  if (spanNbDeals) {
    spanNbDeals.innerHTML = count;
  }
  if (spanTotalSets) {
    spanTotalSets.textContent = count;
  }
};

/**
 * Update statistics
 */
const updateStatistics = deals => {
  if (!deals || deals.length === 0) {
    if (spanTotalSets) spanTotalSets.textContent = '0';
    if (spanProfitableSets) spanProfitableSets.textContent = '0';
    if (spanAvgProfit) spanAvgProfit.textContent = '€0';
    return;
  }

  const totalSets = deals.length;
  const profitableDeals = deals.filter(deal => calculateProfit(deal) > 0);
  const profitableSets = profitableDeals.length;
  const avgProfit = profitableDeals.length > 0 
    ? profitableDeals.reduce((sum, deal) => sum + calculateProfit(deal), 0) / profitableSets
    : 0;

  if (spanTotalSets) spanTotalSets.textContent = totalSets;
  if (spanProfitableSets) spanProfitableSets.textContent = profitableSets;
  if (spanAvgProfit) spanAvgProfit.textContent = `€${avgProfit.toFixed(2)}`;
};

/**
 * Render sales for a lego set
 * @param  {Object} sales
 */
const renderSalesStats = sales => {
  const {result} = sales;
  const nbSales = result ? result.length : 0;

  spanNbSales.innerHTML = nbSales;

  if (nbSales > 0) {
    const prices = result.map(sale => getPriceFromSale(sale)).filter(price => price > 0);
    const lifetime = calculateLifetime(result);
    
    spanLifetimeValue.innerHTML = lifetime;
    
    if (prices.length > 0) {
      const p5 = calculatePercentile(prices, 5);
      const p25 = calculatePercentile(prices, 25);
      const p50 = calculatePercentile(prices, 50);
      const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;

      spanP5SalesPrice.innerHTML = p5.toFixed(2);
      spanP25SalesPrice.innerHTML = p25.toFixed(2);
      spanP50SalesPrice.innerHTML = p50.toFixed(2);
      spanAverageSalesPrice.innerHTML = average.toFixed(2);
    } else {
      spanP5SalesPrice.innerHTML = '0';
      spanP25SalesPrice.innerHTML = '0';
      spanP50SalesPrice.innerHTML = '0';
      spanAverageSalesPrice.innerHTML = '0';
    }
  } else {
    spanP5SalesPrice.innerHTML = '0';
    spanP25SalesPrice.innerHTML = '0';
    spanP50SalesPrice.innerHTML = '0';
    spanAverageSalesPrice.innerHTML = '0';
    spanLifetimeValue.innerHTML = '0 days';
  }
};

/**
 * Render sales for a lego set
 * @param  {Object} sales
 */
const renderSalesStats = sales => {
  const {result} = sales;
  const nbSales = result ? result.length : 0;

  spanNbSales.innerHTML = nbSales;

  if (nbSales > 0) {
    const prices = result.map(sale => getPriceFromSale(sale)).filter(price => price > 0);
    const lifetime = calculateLifetime(result);
    
    spanLifetimeValue.innerHTML = lifetime;
    
    if (prices.length > 0) {
      const p5 = calculatePercentile(prices, 5);
      const p25 = calculatePercentile(prices, 25);
      const p50 = calculatePercentile(prices, 50);
      const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;

      spanP5SalesPrice.innerHTML = p5.toFixed(2);
      spanP25SalesPrice.innerHTML = p25.toFixed(2);
      spanP50SalesPrice.innerHTML = p50.toFixed(2);
      spanAverageSalesPrice.innerHTML = average.toFixed(2);
    } else {
      spanP5SalesPrice.innerHTML = '0';
      spanP25SalesPrice.innerHTML = '0';
      spanP50SalesPrice.innerHTML = '0';
      spanAverageSalesPrice.innerHTML = '0';
    }
  } else {
    spanP5SalesPrice.innerHTML = '0';
    spanP25SalesPrice.innerHTML = '0';
    spanP50SalesPrice.innerHTML = '0';
    spanAverageSalesPrice.innerHTML = '0';
    spanLifetimeValue.innerHTML = '0 days';
  }
};

const render = (deals, pagination) => {
  console.log('Render called with deals:', deals.length, deals[0]);
  
  let filteredDeals = currentFilter ? filterDeals(deals, currentFilter) : deals;
  filteredDeals = showFavoritesOnly ? filteredDeals.filter(deal => isFavorite(deal.uuid, favorites)) : filteredDeals;
  const sortedDeals = currentSort ? sortDeals(filteredDeals, currentSort) : filteredDeals;
  
  console.log('After filtering/sorting:', sortedDeals[0]);
  
  renderDeals(sortedDeals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals);
  updateStatistics(sortedDeals);
};

/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(1, parseInt(event.target.value));
  const enrichedDeals = await enrichDealsWithVintedAverages(deals.result);
  deals.result = enrichedDeals;
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

/**
 * Select the page to display
 */
selectPage.addEventListener('change', async (event) => {
  const page = parseInt(event.target.value);
  const size = parseInt(selectShow.value);
  const deals = await fetchDeals(page, size);
  const enrichedDeals = await enrichDealsWithVintedAverages(deals.result);
  deals.result = enrichedDeals;
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

/**
 * Sort deals
 */
selectSort.addEventListener('change', (event) => {
  currentSort = event.target.value ? event.target.value : null;
  render(currentDeals, currentPagination);
});

/**
 * Apply filters
 */
btnApplyFilters?.addEventListener('click', () => {
  render(currentDeals, currentPagination);
});

/**
 * Reset filters
 */
btnResetFilters?.addEventListener('click', () => {

  currentFilter = null;
  currentSort = null;
  showFavoritesOnly = false;
  selectSort.value = 'profit-desc';
  
  // Deactivate all quick filters
  btnFilterBestDiscount?.classList.remove('active');
  btnFilterMostCommented?.classList.remove('active');
  btnFilterHotDeals?.classList.remove('active');
  btnFilterFavorites?.classList.remove('active');
  
  render(currentDeals, currentPagination);
});

/**
 * Quick Filter - Best Discount (> 50%)
 */
btnFilterBestDiscount?.addEventListener('click', () => {
  currentFilter = currentFilter === 'best-discount' ? null : 'best-discount';
  btnFilterBestDiscount.classList.toggle('active');
  
  // Deactivate other quick filters (except favorites)
  if (currentFilter === 'best-discount') {
    btnFilterMostCommented?.classList.remove('active');
    btnFilterHotDeals?.classList.remove('active');
  }
  
  render(currentDeals, currentPagination);
});

/**
 * Quick Filter - Most Commented (> 15 comments)
 */
btnFilterMostCommented?.addEventListener('click', () => {
  currentFilter = currentFilter === 'most-commented' ? null : 'most-commented';
  btnFilterMostCommented.classList.toggle('active');
  
  // Deactivate other quick filters (except favorites)
  if (currentFilter === 'most-commented') {
    btnFilterBestDiscount?.classList.remove('active');
    btnFilterHotDeals?.classList.remove('active');
  }
  
  render(currentDeals, currentPagination);
});

/**
 * Quick Filter - Hot Deals (temperature > 100)
 */
btnFilterHotDeals?.addEventListener('click', () => {
  currentFilter = currentFilter === 'hot-deals' ? null : 'hot-deals';
  btnFilterHotDeals.classList.toggle('active');
  
  // Deactivate other quick filters (except favorites)
  if (currentFilter === 'hot-deals') {
    btnFilterBestDiscount?.classList.remove('active');
    btnFilterMostCommented?.classList.remove('active');
  }
  
  render(currentDeals, currentPagination);
});

/**
 * Quick Filter - My Favorites
 */
btnFilterFavorites?.addEventListener('click', () => {
  showFavoritesOnly = !showFavoritesOnly;
  btnFilterFavorites.classList.toggle('active');
  
  render(currentDeals, currentPagination);
});

/**
 * Search functionality
 */
searchBtn?.addEventListener('click', () => {
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) {
    const filtered = currentDeals.filter(deal => 
      deal.title.toLowerCase().includes(searchTerm) || 
      deal.id.toString().includes(searchTerm)
    );
    const sortedDeals = currentSort ? sortDeals(filtered, currentSort) : filtered;
    renderDeals(sortedDeals);
    updateStatistics(sortedDeals);
  }
});

searchInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});

/**
 * Display sales for selected lego set id
 */
selectLegoSetIds.addEventListener('change', async (event) => {
  const id = event.target.value;
  if (id) {
    const sales = await fetchSales(id);
    renderSalesStats(sales);
  }
});

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();
  const enrichedDeals = await enrichDealsWithVintedAverages(deals.result);
  deals.result = enrichedDeals;
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
  updateSavedCount();
  selectSort.value = 'profit-desc';
});

/**
 * Filter by best discount
 */
filterSpans[0].addEventListener('click', () => {
  currentFilter = currentFilter === 'best-discount' ? null : 'best-discount';
  render(currentDeals, currentPagination);
});

/**
 * Filter by most commented
 */
filterSpans[1].addEventListener('click', () => {
  currentFilter = currentFilter === 'most-commented' ? null : 'most-commented';
  render(currentDeals, currentPagination);
});

/**
 * Filter by hot deals
 */
filterSpans[2].addEventListener('click', () => {
  currentFilter = currentFilter === 'hot-deals' ? null : 'hot-deals';
  render(currentDeals, currentPagination);
});

/**
 * Filter by favorites
 */
filterSpans[3].addEventListener('click', () => {
  showFavoritesOnly = !showFavoritesOnly;
  render(currentDeals, currentPagination);
});

/**
 * Sort deals
 */
selectSort.addEventListener('change', (event) => {
  currentSort = event.target.value ? event.target.value : null;
  render(currentDeals, currentPagination);
});

/**
 * Apply filters
 */
btnApplyFilters?.addEventListener('click', () => {
  const minProfit = parseFloat(inputMinProfit.value) || 0;
  const maxPrice = parseFloat(inputMaxPrice.value) || Infinity;
  
  const filtered = currentDeals.filter(deal => {
    const profit = calculateProfit(deal);
    const dealabsPrice = parseFloat(deal.price) || 0;
    return profit >= minProfit && dealabsPrice <= maxPrice;
  });
  
  const sortedDeals = currentSort ? sortDeals(filtered, currentSort) : filtered;
  renderDeals(sortedDeals);
  updateStatistics(sortedDeals);
});

/**
 * Reset filters
 */
btnResetFilters?.addEventListener('click', () => {
  inputMinProfit.value = '';
  inputMaxPrice.value = '';
  currentFilter = null;
  currentSort = null;
  selectSort.value = 'profit-desc';
  render(currentDeals, currentPagination);
});

/**
 * Search functionality
 */
searchBtn?.addEventListener('click', () => {
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) {
    const filtered = currentDeals.filter(deal => 
      deal.title.toLowerCase().includes(searchTerm) || 
      deal.id.toString().includes(searchTerm)
    );
    const sortedDeals = currentSort ? sortDeals(filtered, currentSort) : filtered;
    renderDeals(sortedDeals);
    updateStatistics(sortedDeals);
  }
});

searchInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});

/**
 * Display sales for selected lego set id
 */
selectLegoSetIds.addEventListener('change', async (event) => {
  const id = event.target.value;
  if (id) {
    const sales = await fetchSales(id);
    renderSalesStats(sales);
  }
});

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
  updateSavedCount();
  selectSort.value = 'profit-desc';
});

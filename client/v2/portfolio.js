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
const filterSpans = document.querySelectorAll('#filters span');

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
  if (sortType === 'date-asc') {
    return sorted.sort((a, b) => new Date(b.published) - new Date(a.published));
  }
  if (sortType === 'date-desc') {
    return sorted.sort((a, b) => new Date(a.published) - new Date(b.published));
  }
  return sorted;
};

/**
 * Render list of deals
 * @param  {Array} deals
 */
const renderDeals = deals => {
  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = deals
    .map(deal => {
      const isFav = isFavorite(deal.uuid, favorites);
      const favIcon = isFav ? '★' : '☆';
      return `
      <div class="deal" id=${deal.uuid}>
        <span>${deal.id}</span>
        <a href="${deal.link}" target="_blank" rel="noopener noreferrer">${deal.title}</a>
        <span>${deal.price}</span>
        <button class="favorite-btn" data-uuid="${deal.uuid}" title="Add to favorites">${favIcon}</button>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);

  // Add event listeners to favorite buttons
  const favoriteBtns = sectionDeals.querySelectorAll('.favorite-btn');
  favoriteBtns.forEach(btn => {
    btn.addEventListener('click', (event) => {
      const dealId = event.target.dataset.uuid;
      favorites = toggleFavorite(dealId, favorites);
      localStorage.setItem('favorites', JSON.stringify(favorites));
      event.target.textContent = isFavorite(dealId, favorites) ? '★' : '☆';
    });
  });
};

/**
 * Render list of sold items
 * @param  {Array} sales
 */
const renderSoldItems = sales => {
  if (!sales || sales.length === 0) {
    sectionSales.innerHTML = '';
    return;
  }

  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = sales
    .map(sale => {
      return `
      <div class="sale" id=${sale.uuid}>
        <span>${sale.title}</span>
        <a href="${sale.link}" target="_blank" rel="noopener noreferrer">View on Vinted</a>
        <span>${sale.price.amount} ${sale.price.currency_code}</span>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionSales.innerHTML = '<h2>Sold Items</h2>';
  sectionSales.appendChild(fragment);
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

  spanNbDeals.innerHTML = count;
};

/**
 * Render sales for a lego set
 * @param  {Object} sales
 */
const renderSalesStats = sales => {
  const {result} = sales;
  const nbSales = result ? result.length : 0;

  spanNbSales.innerHTML = nbSales;
  renderSoldItems(result);

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
  let filteredDeals = currentFilter ? filterDeals(deals, currentFilter) : deals;
  filteredDeals = showFavoritesOnly ? filteredDeals.filter(deal => isFavorite(deal.uuid, favorites)) : filteredDeals;
  const sortedDeals = currentSort ? sortDeals(filteredDeals, currentSort) : filteredDeals;
  renderDeals(sortedDeals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals)
};

/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(1, parseInt(event.target.value));

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

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
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
 * Display sales for selected lego set id
 */
selectLegoSetIds.addEventListener('change', async (event) => {
  const id = event.target.value;
  if (id) {
    const sales = await fetchSales(id);
    renderSalesStats(sales);
  }
});

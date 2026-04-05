'use strict';

const API_BASE = 'http://localhost:8092';

const getQueryParam = (param) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

const fetchDealData = async () => {
  const response = await fetch(`${API_BASE}/deals/search?limit=1000`);
  const body = await response.json();
  return Array.isArray(body.results) ? body.results : [];
};

const fetchVintedSales = async (legoSetId, dealTitle = '') => {
  const response = await fetch(
    `${API_BASE}/sales/search?legoSetId=${encodeURIComponent(legoSetId)}&keywords=${encodeURIComponent(dealTitle)}&limit=1000&live=1`
  );
  const body = await response.json();
  return Array.isArray(body.results) ? body.results : [];
};

const renderSoldItems = (sales) => {
  const container = document.getElementById('soldItemsList');

  if (!container) {
    return;
  }

  if (!sales || sales.length === 0) {
    container.innerHTML = '<p class="no-data">No sales data available</p>';
    return;
  }

  container.innerHTML = sales.slice(0, 10).map((sale) => {
    const price = getPriceFromSale(sale);
    return `
      <div class="sold-item-card">
        <div class="sold-item-header">
          <div class="sold-item-title">${sale.title || 'Unknown item'}</div>
          <div class="sold-item-price">€${price.toFixed(2)}</div>
        </div>
        <button class="btn-open-item" onclick="window.open('${sale.link}', '_blank')" title="View on Vinted">
          🔗 View on Vinted
        </button>
      </div>
    `;
  }).join('');
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

const displayDealDetails = (deal, vintedAvgPrice = 0) => {
  if (!deal) {
    document.getElementById('productTitle').textContent = 'Deal not found';
    return;
  }

  document.getElementById('productRef').textContent = `Ref. ${deal.id || '-'}`;
  document.getElementById('productTitle').textContent = deal.title || 'Untitled deal';

  const dealabsPrice = parseFloat(deal.price) || 0;
  const vintedPrice = vintedAvgPrice > 0 ? vintedAvgPrice : 0;
  const profit = vintedPrice - dealabsPrice;
  const profitPercent = dealabsPrice > 0 ? Math.round((profit / dealabsPrice) * 100) : 0;

  document.getElementById('dealabsPrice').textContent = `€${dealabsPrice.toFixed(2)}`;
  document.getElementById('vintedAvgPrice').textContent = `€${vintedPrice.toFixed(2)}`;
  document.getElementById('profitAmount').textContent = `€${profit.toFixed(2)}`;
  document.getElementById('profitPercent').textContent = `+${profitPercent}%`;

  const btnDealabs = document.getElementById('btnOpenDealabs');
  if (deal.link) {
    btnDealabs.onclick = () => window.open(deal.link, '_blank');
  } else {
    btnDealabs.disabled = true;
  }
};

const displaySalesIndicators = (sales) => {
  const result = sales || [];
  document.getElementById('totalSales').textContent = result.length;

  if (result.length === 0) {
    document.getElementById('avgPrice').textContent = '€0.00';
    document.getElementById('p5Price').textContent = '€0.00';
    document.getElementById('p25Price').textContent = '€0.00';
    document.getElementById('p50Price').textContent = '€0.00';
    document.getElementById('lifetime').textContent = '0 days';
    return;
  }

  const prices = result.map((sale) => getPriceFromSale(sale)).filter((price) => price > 0);
  if (prices.length > 0) {
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    document.getElementById('avgPrice').textContent = `€${avgPrice.toFixed(2)}`;
    document.getElementById('p5Price').textContent = `€${calculatePercentile(prices, 5).toFixed(2)}`;
    document.getElementById('p25Price').textContent = `€${calculatePercentile(prices, 25).toFixed(2)}`;
    document.getElementById('p50Price').textContent = `€${calculatePercentile(prices, 50).toFixed(2)}`;
  }

  document.getElementById('lifetime').textContent = calculateLifetime(result);
};

document.addEventListener('DOMContentLoaded', async () => {
  const dealUuid = getQueryParam('id');

  if (!dealUuid) {
    document.getElementById('productTitle').textContent = 'No deal specified';
    return;
  }

  const deals = await fetchDealData();
  const deal = deals.find((item) => (item._id || item.uuid) === dealUuid);

  if (!deal) {
    document.getElementById('productTitle').textContent = 'Deal not found';
    return;
  }

  const sales = await fetchVintedSales(deal.id || '', deal.title || '');
  const vintedAvgPrice = calculateVintedAverage(sales);

  displayDealDetails(deal, vintedAvgPrice);
  displaySalesIndicators(sales);
  renderSoldItems(sales);
});
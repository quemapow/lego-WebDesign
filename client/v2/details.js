// Invoking strict mode
'use strict';

/**
 * Get URL query parameters
 */
const getQueryParam = (param) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

/**
 * Fetch deal data from localStorage or API
 */
const fetchDealData = async () => {
  try {
    // Try to get all deals from a reasonable size range to find our deal
    const response = await fetch('https://lego-api-blue.vercel.app/deals?page=1&size=100');
    const body = await response.json();

    if (body.success !== true) {
      console.error('Failed to fetch deals', body);
      return null;
    }

    return body.data.result;
  } catch (error) {
    console.error('Error fetching deal data:', error);
    return null;
  }
};

/**
 * Fetch Vinted sales for a specific LEGO set ID
 */
const fetchVintedSales = async (legoSetId) => {
  try {
    const response = await fetch(`https://lego-api-blue.vercel.app/sales?id=${legoSetId}`);
    const body = await response.json();

    if (body.success !== true) {
      console.error('Failed to fetch sales', body);
      return { result: [] };
    }

    return body.data;
  } catch (error) {
    console.error('Error fetching sales:', error);
    return { result: [] };
  }
};

/**
 * Render sold items from Vinted
 */
const renderSoldItems = (sales) => {
  const container = document.getElementById('soldItemsList');
  
  if (!sales || sales.length === 0) {
    container.innerHTML = '<p class="no-data">No sales data available</p>';
    return;
  }

  const itemsHtml = sales
    .slice(0, 10) // Show only first 10
    .map(sale => {
      const price = getPriceFromSale(sale);
      return `
        <div class="sold-item-card">
          <div class="sold-item-header">
            <div class="sold-item-title">${sale.title || 'Unknown item'}</div>
            <div class="sold-item-price">€${price.toFixed(2)}</div>
          </div>
          <button 
            class="btn-open-item" 
            onclick="window.open('${sale.link}', '_blank')" 
            title="View on Vinted">
            🔗 View on Vinted
          </button>
        </div>
      `;
    })
    .join('');

  container.innerHTML = itemsHtml;
};

/**
 * Calculate average price from Vinted sales
 */
const calculateVintedAverage = (sales) => {
  if (!sales || !sales.result || sales.result.length === 0) {
    return 0;
  }

  const prices = sales.result
    .map(sale => getPriceFromSale(sale))
    .filter(price => price > 0);

  if (prices.length === 0) {
    return 0;
  }

  return prices.reduce((sum, price) => sum + price, 0) / prices.length;
};

/**
 * Display deal details
 */
const displayDealDetails = (deal, vintedAvgPrice = 0) => {
  if (!deal) {
    document.getElementById('productTitle').textContent = 'Deal not found';
    return;
  }

  // Product Info
  document.getElementById('productRef').textContent = `Ref. ${deal.id}`;
  document.getElementById('productTitle').textContent = deal.title;

  // Price Info
  const dealabsPrice = parseFloat(deal.price) || 0;
  const vintedPrice = vintedAvgPrice > 0 ? vintedAvgPrice : parseFloat(deal.vinted_price) || 150;
  const profit = vintedPrice - dealabsPrice;
  const profitPercent = dealabsPrice > 0 ? Math.round((profit / dealabsPrice) * 100) : 0;

  document.getElementById('dealabsPrice').textContent = `€${dealabsPrice.toFixed(2)}`;
  document.getElementById('vintedAvgPrice').textContent = `€${vintedPrice.toFixed(2)}`;
  document.getElementById('profitAmount').textContent = `€${profit.toFixed(2)}`;
  document.getElementById('profitPercent').textContent = `+${profitPercent}%`;

  // Action buttons
  const btnDealabs = document.getElementById('btnOpenDealabs');

  if (deal.link) {
    btnDealabs.onclick = () => window.open(deal.link, '_blank');
  } else {
    btnDealabs.disabled = true;
  }
};

/**
 * Display Vinted sales indicators
 */
const displaySalesIndicators = (sales) => {
  const result = sales.result || [];
  
  // Total sales count
  document.getElementById('totalSales').textContent = result.length;

  if (result.length === 0) {
    document.getElementById('avgPrice').textContent = '€0.00';
    document.getElementById('p5Price').textContent = '€0.00';
    document.getElementById('p25Price').textContent = '€0.00';
    document.getElementById('p50Price').textContent = '€0.00';
    document.getElementById('lifetime').textContent = '0 days';
    return;
  }

  // Extract prices
  const prices = result
    .map(sale => getPriceFromSale(sale))
    .filter(price => price > 0);

  if (prices.length > 0) {
    // Calculate statistics
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const p5 = calculatePercentile(prices, 5);
    const p25 = calculatePercentile(prices, 25);
    const p50 = calculatePercentile(prices, 50);

    document.getElementById('avgPrice').textContent = `€${avgPrice.toFixed(2)}`;
    document.getElementById('p5Price').textContent = `€${p5.toFixed(2)}`;
    document.getElementById('p25Price').textContent = `€${p25.toFixed(2)}`;
    document.getElementById('p50Price').textContent = `€${p50.toFixed(2)}`;
  }

  // Calculate lifetime
  const lifetime = calculateLifetime(result);
  document.getElementById('lifetime').textContent = lifetime;
};

/**
 * Initialize page
 */
document.addEventListener('DOMContentLoaded', async () => {
  const dealUuid = getQueryParam('id');

  if (!dealUuid) {
    document.getElementById('productTitle').textContent = 'No deal specified';
    return;
  }

  // Fetch deals to find the one we're looking for
  const deals = await fetchDealData();
  
  if (!deals) {
    document.getElementById('productTitle').textContent = 'Error loading deal data';
    return;
  }

  const deal = deals.find(d => d.uuid === dealUuid);

  if (!deal) {
    document.getElementById('productTitle').textContent = 'Deal not found';
    return;
  }

  // Fetch Vinted sales for this deal
  const sales = await fetchVintedSales(deal.id);
  
  // Calculate average Vinted price from sales
  const vintedAvgPrice = calculateVintedAverage(sales);

  // Display deal info with calculated Vinted average price
  displayDealDetails(deal, vintedAvgPrice);

  // Display Vinted sales indicators
  displaySalesIndicators(sales);
  renderSoldItems(sales.result);
});

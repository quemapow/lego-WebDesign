// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';


/**
 * 
 * @param {Array} deals - list of deals
 * @returns {Array} list of lego set ids
 */
const getIdsFromDeals = deals => {
    return deals.map(deal => deal.id)
}

/**
 * Calculate percentile value from array of numbers
 * @param {Array} numbers - sorted array of numbers
 * @param {Number} percentile - percentile to calculate (0-100)
 * @returns {Number} percentile value
 */
const calculatePercentile = (numbers, percentile) => {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sorted[lower];
  }
  
  const weight = index % 1;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Extract price from a sale object
 * @param {Object} sale - sale object
 * @returns {Number} price value
 */
const getPriceFromSale = (sale) => {
  // Handle price as object with amount and currency_code
  if (sale.price && typeof sale.price === 'object' && sale.price.amount) {
    return parseFloat(sale.price.amount) || 0;
  }
  // Handle price as direct number
  if (typeof sale.price === 'number') {
    return sale.price;
  }
  // Handle price as string
  if (typeof sale.price === 'string') {
    return parseFloat(sale.price) || 0;
  }
  // Try other possible price field names
  if (sale.total_item_price) {
    return parseFloat(sale.total_item_price) || 0;
  }
  if (sale.totalPrice) {
    return parseFloat(sale.totalPrice) || 0;
  }
  return 0;
}

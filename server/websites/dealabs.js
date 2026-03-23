import * as cheerio from 'cheerio';
import { v5 as uuidv5 } from 'uuid';

/**
 * Parse webpage data response
 * @param  {String} data - html response
 * @return {Array} deals
 */
const parse = data => {
  const $ = cheerio.load(data);
  const deals = [];

  // Find all article elements with thread items
  $('article[id^="thread_"]').each((i, element) => {
    try {
      const $article = $(element);
      const vueDataStr = $article.find('[data-handler="vue3"]').attr('data-vue3');
      
      if (!vueDataStr) return;

      // Decode the Vue3 data JSON
      const decoded = vueDataStr
        .replace(/&quot;/g, '"');
      
      const vueData = JSON.parse(decoded);
      
      if (!vueData.props || !vueData.props.thread) return;

      const thread = vueData.props.thread;
      
      // Calculate discount percentage
      let pourcentageReduction = '';
      if (thread.percentage && thread.percentage > 0) {
        pourcentageReduction = `-${thread.percentage}%`;
      } else if (thread.nextBestPrice && thread.price && thread.nextBestPrice > 0) {
        const discount = Math.round(((thread.nextBestPrice - thread.price) / thread.nextBestPrice) * 100);
        pourcentageReduction = discount > 0 ? `-${discount}%` : '';
      }

      // Format publication date
      const datePublication = thread.publishedAt 
        ? new Date(thread.publishedAt * 1000).toLocaleDateString('fr-FR')
        : '';

      // Build the deal object
      const deal = {
        link: thread.shareableLink || `https://www.dealabs.com/bons-plans/${thread.titleSlug}-${thread.threadId}`,
        title: thread.title,
        prixOriginel: thread.nextBestPrice && thread.nextBestPrice > 0 ? thread.nextBestPrice : thread.price,
        prixReduit: thread.price || 0,
        pourcentageReduction,
        datePublication,
        nombreCommentaire: thread.commentCount || 0,
        temperature: thread.temperature,
        merchant: thread.merchant && thread.merchant.merchantName ? thread.merchant.merchantName : '',
        uuid: uuidv5(thread.shareableLink || `${thread.threadId}`, uuidv5.URL)
      };

      // Only include if it has meaningful data
      if (deal.title) {
        deals.push(deal);
      }
    } catch (e) {
      // Skip parsing errors for individual items
      console.warn('Error parsing deal item:', e.message);
    }
  });

  return deals;
};

/**
 * Scrape a given url page
 * @param {String} url - url to parse and scrape
 * @returns {Array} deals
 */
const scrape = async url => {
  try {
    // If input is not a URL, treat it as a LEGO set ID and use the groupe/lego page
    let scrapingUrl = url;
    if (!url.startsWith('http')) {
      scrapingUrl = 'https://www.dealabs.com/groupe/lego';
      console.log(`📍 Scraping LEGO groupe page for set: ${url}`);
    } else {
      console.log(`📍 Scraping: ${scrapingUrl}`);
    }

    const response = await fetch(scrapingUrl, {
      signal: AbortSignal.timeout(15000),
      "headers": {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "accept-language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (response.ok) {
      const body = await response.text();
      return parse(body);
    }

    console.error(`Error fetching ${scrapingUrl}:`, response.status);
    return null;
  } catch (error) {
    console.error(`Error scraping:`, error.message);
    return null;
  }
};

export { scrape };

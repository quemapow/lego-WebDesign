/* eslint-disable no-console, no-process-exit */
import * as fs from 'fs';
import * as avenuedelabrique from './websites/avenuedelabrique.js';
import * as vinted from './websites/vinted.js';
import * as dealabs from './websites/dealabs.js';

async function scrapeADLB (website = 'https://www.avenuedelabrique.com/promotions-et-bons-plans-lego') {
  try {
    console.log(`🕵️‍♀️  browsing ${website} website`);

    const deals = await avenuedelabrique.scrape(website);

    console.log(deals);
    console.log('done');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function scrapeVinted (lego) {
  try {
    console.log(`🕵️‍♀️  scraping lego ${lego} from vinted.fr`);

    const sales = await vinted.scrape(lego);

    console.log(sales);
    console.log('done');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
async function scrapeDealabs (url) {
  try {
    console.log(`🕵️‍♀️  scraping lego deals from ${url}`);

    const deals = await dealabs.scrape(url);

    console.log(`✅ Found ${deals?.length || 0} deals`);
    console.log(JSON.stringify(deals, null, 2).substring(0, 2000));
    
    // Save to file
    if (deals && deals.length > 0) {
      fs.writeFileSync('dealabs.json', JSON.stringify(deals, null, 2));
      console.log('\n✅ Saved to dealabs.json');
    }

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

const [,, param] = process.argv;

//scrapeADLB(param);
//scrapeVinted(param);
scrapeDealabs(param);
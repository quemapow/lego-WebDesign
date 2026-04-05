import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { scrape as scrapeVinted } from './websites/vinted.js';

// We load json files as data source
import DEALS from "./sources/dealabs.json" with { type: "json" };
import SALES from "./sources/vinted.json" with { type: "json" };

const PORT = 8092;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(helmet());

const extractSetId = (deal) => {
  const fromTitle = deal.title?.match(/\b\d{4,6}\b/);
  if (fromTitle) {
    return fromTitle[0];
  }

  const fromLink = deal.link?.match(/-(\d{4,6})(?:-|$)/);
  return fromLink ? fromLink[1] : null;
};

const toPublishedTimestamp = (datePublication) => {
  if (!datePublication) {
    return null;
  }

  const [day, month, year] = datePublication.split('/').map(Number);
  if (!day || !month || !year) {
    return null;
  }

  return Math.floor(Date.UTC(year, month - 1, day) / 1000);
};

const toDiscountValue = (percentage) => {
  if (!percentage) {
    return null;
  }

  const parsed = Number(String(percentage).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(parsed) ? null : Math.abs(parsed);
};

const normalizeDeal = (deal) => ({
  _id: deal.uuid,
  link: deal.link,
  retail: deal.prixOriginel,
  price: deal.prixReduit,
  discount: toDiscountValue(deal.pourcentageReduction),
  temperature: deal.temperature,
  comments: deal.nombreCommentaire,
  published: toPublishedTimestamp(deal.datePublication),
  title: deal.title,
  id: extractSetId(deal),
  community: 'dealabs',
  merchant: deal.merchant,
});

const sortDeals = (deals, filterBy) => {
  if (filterBy === 'best-discount') {
    return [...deals].sort((a, b) => (b.discount || 0) - (a.discount || 0));
  }

  if (filterBy === 'most-commented') {
    return [...deals].sort((a, b) => (b.comments || 0) - (a.comments || 0));
  }

  return [...deals].sort((a, b) => a.price - b.price);
};

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase();

const parseKeywords = (rawKeywords) => {
  if (!rawKeywords) {
    return [];
  }

  const stopwords = new Set([
    'lego', 'star', 'wars', 'via', 'avec', 'pour', 'sur', 'dans', 'the', 'and',
    'de', 'des', 'du', 'la', 'le', 'les', 'et', 'set', 'neuf', 'new', 'speed',
  ]);

  return normalizeText(rawKeywords)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !stopwords.has(token));
};

const includesAnyTerm = (sale, terms) => {
  if (terms.length === 0) {
    return false;
  }

  const haystack = normalizeText(`${sale.title || ''} ${sale.link || ''}`);
  return terms.some((term) => haystack.includes(term));
};

const extractSetIdsFromText = (sale) => {
  const haystack = `${sale.title || ''} ${sale.link || ''}`;
  const matches = haystack.match(/\b\d{4,6}\b/g) || [];
  return [...new Set(matches)];
};

const matchesRequestedSetId = (sale, requestedSetId) => {
  if (!requestedSetId) {
    return true;
  }

  const ids = extractSetIdsFromText(sale);
  if (ids.length === 0) {
    return true;
  }

  return ids.includes(requestedSetId);
};

const countMatchingTerms = (sale, terms) => {
  if (terms.length === 0) {
    return 0;
  }

  const haystack = normalizeText(`${sale.title || ''} ${sale.link || ''}`);
  return terms.reduce((count, term) => (haystack.includes(term) ? count + 1 : count), 0);
};

const normalizeSale = (sale) => ({
  _id: sale.uuid,
  link: sale.link,
  price: sale.price?.amount || sale.price,
  title: sale.title,
  published: sale.published,
});

const dedupeSales = (sales) => {
  const map = new Map();
  sales.forEach((sale) => {
    const key = sale.uuid || sale.link;
    if (!map.has(key)) {
      map.set(key, sale);
    }
  });
  return Array.from(map.values());
};

app.get('/', (request, response) => {
  response.send({'ack': true});
});

app.get('/deals/search', (request, response) => {
  const limit = Math.max(Number.parseInt(request.query.limit, 10) || 12, 1);
  const maxPrice = request.query.price ? Number(request.query.price) : null;
  const minPublished = request.query.date
    ? Math.floor(new Date(request.query.date).getTime() / 1000)
    : null;
  const filterBy = request.query.filterBy;

  const filteredDeals = DEALS
    .map(normalizeDeal)
    .filter((deal) => {
      if (maxPrice !== null && Number.isFinite(maxPrice) && deal.price > maxPrice) {
        return false;
      }

      if (minPublished !== null && Number.isFinite(minPublished) && (deal.published || 0) < minPublished) {
        return false;
      }

      return true;
    });

  const sortedDeals = sortDeals(filteredDeals, filterBy);
  const results = sortedDeals.slice(0, limit);

  return response.status(200).json({
    limit,
    total: filteredDeals.length,
    results,
  });
});

app.get('/deals/:id', (request, response) => {
  const deal = DEALS.find((item) => item.uuid === request.params.id);

  if (!deal) {
    return response.status(404).json({
      success: false,
      error: 'Deal not found',
    });
  }

  return response.status(200).json(normalizeDeal(deal));
});

app.get('/sales/search', (request, response) => {
  const limit = Math.max(Number.parseInt(request.query.limit, 10) || 12, 1);
  const legoSetId = request.query.legoSetId ? String(request.query.legoSetId).trim() : '';
  const keywords = request.query.keywords ? String(request.query.keywords) : '';
  const useLiveSearch = String(request.query.live || '').toLowerCase() === '1' || String(request.query.live || '').toLowerCase() === 'true';
  const keywordTerms = parseKeywords(keywords);
  const directSales = legoSetId ? (SALES[legoSetId] || []) : [];
  const allSales = Object.values(SALES).flat();

  let salesSource = [];

  if (directSales.length > 0) {
    salesSource = directSales;

    if (keywordTerms.length > 0) {
      const scoredDirectSales = directSales
        .map((sale) => ({ sale, score: countMatchingTerms(sale, keywordTerms) }))
        .sort((a, b) => b.score - a.score);

      const relevantDirectSales = scoredDirectSales
        .filter((entry) => entry.score >= 1)
        .map((entry) => entry.sale);

      if (relevantDirectSales.length > 0) {
        salesSource = relevantDirectSales;
      }
    }
  } else {
    const idTerm = legoSetId ? normalizeText(legoSetId) : '';

    const idMatches = idTerm
      ? allSales.filter((sale) => includesAnyTerm(sale, [idTerm]))
      : [];

    if (idMatches.length > 0) {
      salesSource = idMatches;
    } else if (keywordTerms.length > 0) {
      const strictMinScore = Math.min(2, keywordTerms.length);
      const scoredSales = allSales
        .map((sale) => ({ sale, score: countMatchingTerms(sale, keywordTerms) }))
        .sort((a, b) => b.score - a.score);

      salesSource = scoredSales
        .filter((entry) => entry.score >= strictMinScore)
        .map((entry) => entry.sale);

      if (salesSource.length === 0) {
        salesSource = scoredSales
          .filter((entry) => entry.score >= 1)
          .map((entry) => entry.sale);
      }
    } else {
      salesSource = allSales;
    }
  }

  if (legoSetId) {
    salesSource = salesSource.filter((sale) => matchesRequestedSetId(sale, legoSetId));

    const strictIdMatches = salesSource.filter((sale) => includesAnyTerm(sale, [normalizeText(legoSetId)]));
    salesSource = strictIdMatches;
  }

  const finishResponse = (rawSales) => {
    const normalizedSales = rawSales
      .map(normalizeSale)
      .sort((a, b) => (b.published || 0) - (a.published || 0));

    const results = normalizedSales.slice(0, limit);

    return response.status(200).json({
      limit,
      total: normalizedSales.length,
      results,
    });
  };

  if (!useLiveSearch) {
    return finishResponse(salesSource);
  }

  const liveSearchText = [legoSetId, ...keywordTerms].filter(Boolean).join(' ');
  if (!liveSearchText) {
    return finishResponse(salesSource);
  }

  scrapeVinted(liveSearchText)
    .then((liveSales) => {
      const liveArray = Array.isArray(liveSales) ? liveSales : [];
      let mergedSales = dedupeSales([...salesSource, ...liveArray]);

      if (legoSetId) {
        mergedSales = mergedSales.filter((sale) => matchesRequestedSetId(sale, legoSetId));
      }

      finishResponse(mergedSales);
    })
    .catch(() => finishResponse(salesSource));
});


const server = app.listen(PORT, () => {
  console.log(`📡 Running on port ${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing server before starting a new one.`);
    process.exit(1);
  }

  throw error;
});

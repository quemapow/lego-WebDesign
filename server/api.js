import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

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
  const { legoSetId } = request.query;

  const salesSource = legoSetId
    ? (SALES[legoSetId] || [])
    : Object.values(SALES).flat();

  const normalizedSales = salesSource
    .map((sale) => ({
      _id: sale.uuid,
      link: sale.link,
      price: sale.price?.amount,
      title: sale.title,
      published: sale.published,
    }))
    .sort((a, b) => (b.published || 0) - (a.published || 0));

  const results = normalizedSales.slice(0, limit);

  return response.status(200).json({
    limit,
    total: normalizedSales.length,
    results,
  });
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

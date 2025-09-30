import { rest } from 'msw';
import { API_BASE_URL } from './settings';
import { orgScope, tilesByProperty, reportsByProperty, reviewsByProperty, propertyDetail } from './data';

export const handlers = [
  rest.get(`${API_BASE_URL}/orgs`, (_req, res, ctx) => res(ctx.status(200), ctx.json(orgScope))),
  rest.get(`${API_BASE_URL}/metrics/tiles`, (req, res, ctx) => {
    const propertyId = req.url.searchParams.get('propertyId') ?? 'prop-1';
    return res(ctx.status(200), ctx.json(tilesByProperty[propertyId] ?? []));
  }),
  rest.get(`${API_BASE_URL}/reports/weekly`, (req, res, ctx) => {
    const propertyId = req.url.searchParams.get('propertyId') ?? 'prop-1';
    const report = reportsByProperty[propertyId];
    return res(ctx.status(200), ctx.json(report ?? reportsByProperty['prop-1']));
  }),
  rest.get(`${API_BASE_URL}/reviews/latest`, (req, res, ctx) => {
    const propertyId = req.url.searchParams.get('propertyId') ?? 'prop-1';
    return res(ctx.status(200), ctx.json(reviewsByProperty[propertyId] ?? []));
  }),
  rest.get(`${API_BASE_URL}/properties/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const property = typeof id === 'string' ? propertyDetail(id) : null;
    if (!property) {
      return res(ctx.status(404), ctx.json({ message: 'Property not found' }));
    }
    return res(ctx.status(200), ctx.json(property));
  })
];

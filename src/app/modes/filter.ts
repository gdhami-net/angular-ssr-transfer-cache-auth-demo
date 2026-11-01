import { withHttpTransferCacheOptions } from '@angular/platform-browser';
import { API } from '../api';

// Auth-header requests may be cached, but only the ones on this list.
const cacheable = [`${API}/api/catalog`];

export const cacheOptions = [
  withHttpTransferCacheOptions({
    includeRequestsWithAuthHeaders: true,
    filter: (req) => cacheable.includes(req.url),
  }),
];

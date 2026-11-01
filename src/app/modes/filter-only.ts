import { withHttpTransferCacheOptions } from '@angular/platform-browser';
import { API } from '../api';

// The filter alone, without the auth flag: does a filter that says "yes"
// let an auth-header request into the cache?
const cacheable = [`${API}/api/catalog`];

export const cacheOptions = [
  withHttpTransferCacheOptions({
    filter: (req) => cacheable.includes(req.url),
  }),
];

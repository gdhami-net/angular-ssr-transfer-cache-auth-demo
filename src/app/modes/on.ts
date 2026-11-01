import { withHttpTransferCacheOptions } from '@angular/platform-browser';

// Requests that carry an Authorization header may be cached, every one of them.
export const cacheOptions = [
  withHttpTransferCacheOptions({ includeRequestsWithAuthHeaders: true }),
];

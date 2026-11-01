import { HttpInterceptorFn } from '@angular/common/http';
import { API } from './api';

// Adds the user's token to every call to the API. In a real app the token
// would come from the incoming request's cookie on the server and from your
// auth service in the browser; a fixed one keeps the demo about the cache.
export const authInterceptor: HttpInterceptorFn = (req, next) =>
  req.url.startsWith(API)
    ? next(req.clone({ setHeaders: { Authorization: 'Bearer alice-token' } }))
    : next(req);

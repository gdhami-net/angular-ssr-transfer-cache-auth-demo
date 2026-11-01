import { RenderMode, ServerRoute } from '@angular/ssr';

// Rendered per request: the page shows one signed-in user's data.
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Server }];

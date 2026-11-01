import { Component, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { API } from './api';

interface Profile { name: string; email: string; plan: string }
interface Order { id: number; total: number }
interface Product { sku: string; name: string }

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  private http = inject(HttpClient);

  profile = toSignal(this.http.get<Profile>(`${API}/api/profile`));
  orders = toSignal(this.http.get<Order[]>(`${API}/api/orders`));
  // httpResource sends its request through the same HttpClient and interceptors.
  catalog = httpResource<Product[]>(() => `${API}/api/catalog`);
}

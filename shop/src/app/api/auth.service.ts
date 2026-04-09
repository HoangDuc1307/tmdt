import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api/v1'; // URL backend mới

  constructor(private http: HttpClient) {}

  // Đăng ký tài khoản
  register(data: { username: string; password: string; email: string; first_name?: string; last_name?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/register/`, data);
  }

  // Đăng nhập (JWT)
  login(data: { username: string; password: string; }): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/login/`, data);
  }

  // Đăng xuất (blacklist refresh token)
  logout(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      return this.http.post(`${this.apiUrl}/users/logout/`, { refresh: refreshToken });
    }
    this.clearLocalStorage();
    return new Observable(observer => {
      observer.next({ message: 'Đăng xuất thành công' });
      observer.complete();
    });
  }

  // Làm mới access token
  refreshToken(refresh: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/token/refresh/`, { refresh });
  }

  // Lấy thông tin user hiện tại
  getMe(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/users/me/`, { headers });
  }

  // Cập nhật thông tin user hiện tại
  updateMe(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/users/me/`, data, { headers });
  }

  // Lấy profile user
  getProfile(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/users/profile/`, { headers });
  }

  // Cập nhật profile user
  updateProfile(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/users/profile/`, data, { headers });
  }

  // Tạo tài khoản admin
  createAdmin(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/users/create-admin/`, data, { headers });
  }

  // Danh sách user (admin)
  getAllUsers(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/users/admin/users/`, { headers });
  }

  // Danh sách profile user (admin)
  getAllUserProfiles(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/users/admin/userprofiles/`, { headers });
  }

  // Sản phẩm
  getProducts(params: any = {}): Observable<any> {
    let url = `${this.apiUrl}/products/`;
    const query = new URLSearchParams(params).toString();
    if (query) url += `?${query}`;
    return this.http.get(url);
  }

  getProductById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/products/${id}/`);
  }
//Lấy sản phẩm theo category
  getProductByCategory(id: string):Observable<any>{
    return this.http.get(`${this.apiUrl}/products/categories/${id}/products/`)
  }

  getRelatedProducts(productId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/products/${productId}/related/`);
  }


  createProduct(product: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/products/`, product, { headers });
  }

  updateProduct(product: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/products/${product.id}/`, product, { headers });
  }

  patchProduct(productId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.apiUrl}/products/${productId}/`, data, { headers });
  }

  deleteProduct(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/products/${id}/`, { headers });
  }

  // Tìm kiếm sản phẩm
  searchProducts(term: string): Observable<any> {
    return this.getProducts({ search: term });
  }

  // Lọc sản phẩm theo danh mục
  filterProductsByCategory(category: string): Observable<any> {
    return this.getProducts({ category });
  }

  // Lấy toàn bộ sản phẩm không phân trang
  getAllProducts(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/products/all/`, { headers });
  }

  // Giỏ hàng
  getCart(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/cart/`, { headers });
  }

  // Sản phẩm của tôi
  getMyProducts(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/products/my_products/`, { headers });
  }

  // Admin duyệt sản phẩm
  approveProduct(productId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.apiUrl}/products/${productId}/approve/`, {}, { headers });
  }

  addToCart(product_id: number, quantity: number = 1): Observable<any> {
    const headers = this.getAuthHeaders().set('Content-Type', 'application/json');
    return this.http.post(
      `${this.apiUrl}/cart/add/`,
      { product_id, quantity },
      { headers }
    );
  }

  updateCartItem(item_id: number, quantity: number): Observable<any> {
    const headers = this.getAuthHeaders().set('Content-Type', 'application/json');
    return this.http.put(
      `${this.apiUrl}/cart/item/${item_id}/update/`,
      { quantity },
      { headers }
    );
  }

  deleteCartItem(item_id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/cart/item/${item_id}/remove/`, { headers });
  }

  clearCart(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/cart/remove/`, { headers });
  }

  // Đơn hàng (mặc định chỉ đơn đã mua; includePending để lấy cả pending)
  getOrders(options?: { includePending?: boolean }): Observable<any> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();
    if (options?.includePending) {
      params = params.set('include_pending', '1');
    }
    return this.http.get(`${this.apiUrl}/orders/`, { headers, params });
  }

  createOrder(orderData: any = {}): Observable<any> {
    const headers = this.getAuthHeaders();
    // Nếu orderData là undefined/null thì chỉ truyền headers
    return this.http.post(`${this.apiUrl}/orders/checkout/`, orderData, { headers });
  }

  getOrderById(id: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/orders/${id}/`, { headers });
  }

  /** Đơn hàng có sản phẩm do user hiện tại bán (seller) */
  getSellerOrders(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/orders/seller/`, { headers });
  }

  getSellerOrderById(id: string | number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/orders/seller/${id}/`, { headers });
  }

  patchSellerOrderStatus(orderId: number, status: 'shipped' | 'delivered'): Observable<any> {
    const headers = this.getAuthHeaders().set('Content-Type', 'application/json');
    return this.http.patch(
      `${this.apiUrl}/orders/seller/${orderId}/status/`,
      { status },
      { headers }
    );
  }

  updateOrder(orderId: string, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/orders/${orderId}/`, data, { headers });
  }

  patchOrder(orderId: string, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.apiUrl}/orders/${orderId}/`, data, { headers });
  }

  deleteOrder(orderId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/orders/${orderId}/`, { headers });
  }

  payOrder(orderId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/orders/${orderId}/pay/`, {}, { headers });
  }

  initMomoPayment(orderId: number): Observable<{ pay_url: string }> {
    const headers = this.getAuthHeaders();
    return this.http.post<{ pay_url: string }>(`${this.apiUrl}/orders/${orderId}/momo/`, {}, { headers });
  }

  // Lưu JWT tokens vào localStorage
  saveTokens(accessToken: string, refreshToken: string, userInfo: any): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  }

  // Xóa tất cả dữ liệu từ localStorage
  clearLocalStorage(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userInfo');
  }

  // Lấy access token từ localStorage
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  // Tạo headers với JWT token
  private getAuthHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    return token ? new HttpHeaders({ 'Authorization': `Bearer ${token}` }) : new HttpHeaders();
  }

  // Kiểm tra xem user đã đăng nhập chưa
  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  // Lấy username của user đã đăng nhập
  getUsername(): string {
    const userInfo = this.getUserInfo();
    return userInfo ? userInfo.username : '';
  }

  // Kiểm tra xem user có phải là admin không
  isAdmin(): boolean {
    const userInfo = this.getUserInfo();
    return userInfo ? !!userInfo.is_staff : false;
  }

  // Kiểm tra xem user có phải là system admin không
  isSuperAdmin(): boolean {
    const userInfo = this.getUserInfo();
    return userInfo ? !!userInfo.is_superuser : false;
  }

  // Lấy tất cả order cho admin
  getAllOrdersAdmin(searchTerm: string = ''): Observable<any> {
    const headers = this.getAuthHeaders();
    let url = `${this.apiUrl}/orders/admin/orders/`;
    if (searchTerm) {
      url += `?search=${encodeURIComponent(searchTerm)}`;
    }
    return this.http.get(url, { headers });
  }

  //Lấy tất cả UserProfile
  getAllUserProfile(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/users/admin/userprofiles/`, { headers });
  }

  updateOrderInfo(orderId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/orders/${orderId}/update-info/`, data, { headers });
  }
  
  deleteOrderAdmin(orderId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/orders/admin/orders/${orderId}/`, { headers });
  }

  markOrderDelivered(orderId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.apiUrl}/orders/admin/orders/${orderId}/`, { status: 'delivered' }, { headers });
  }

  createProfile(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/users/profile/`, data, { headers });
  }

  // Lấy thông tin user từ localStorage
  getUserInfo(): any {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo || userInfo === 'undefined') return null;
    try {
      return JSON.parse(userInfo);
    } catch {
      return null;
    }
  }

  getOrderByIdAdmin(orderId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/orders/admin/orders/${orderId}/`, { headers });
  }

  chatWithBot(message: string, history: any[] = []): Observable<any> {
    const headers = { 'Content-Type': 'application/json' };
    return this.http.post(
      'http://127.0.0.1:8000/chatbot/chat/',
      { message, history },
      { headers }
    );
  }

  //Lấy tất cả category
  getAllCategory(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.apiUrl}/products/categories/`, { headers });
  }

  //Tạo category
  createCategory(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/products/categories/`, data, { headers });
  }

  //Cập nhật category
  updateCategory(categoryId: number, data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.apiUrl}/products/categories/${categoryId}/`, data, { headers });
  }

  //Xóa category
  deleteCategory(categoryId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/products/categories/${categoryId}/`, { headers });
  }

  // Lấy danh sách sale products active
  getActiveSaleProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sale-products/`);
  }

  // Tạo hoặc cập nhật sale product
  createUpdateSaleProduct(data: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.apiUrl}/sale-products/manage/`, data, { headers });
  }

  // Lấy thông tin sale của một sản phẩm
  getSaleProductByProductId(productId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/sale-products/product/${productId}/`);
  }

  // Xóa sale product (kết thúc sale)
  deleteSaleProduct(productId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}/sale-products/${productId}/delete/`, { headers });
  }
  
}         
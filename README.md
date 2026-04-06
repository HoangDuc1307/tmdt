# Dự án TMDT: Shop & Shop-BE

Dự án này bao gồm cả phần Frontend (Angular) và Backend (Django) cho ứng dụng thương mại điện tử.

## Cấu trúc dự án

- `shop/`: Mã nguồn Frontend (Angular).
- `shop-be/`: Mã nguồn Backend (Django/Python).

---

## Hướng dẫn cài đặt và chạy dự án

### 1. Yêu cầu tiên quyết

- Cài đặt **Node.js** (Khuyên dùng v18 hoặc mới hơn).
- Cài đặt **Python** (v3.10 hoặc mới hơn).
- Cài đặt **Angular CLI** nếu chưa có: `npm install -g @angular/cli`.

### 2. Thiết lập Backend (shop-be)

1. Mở terminal và di chuyển vào thư mục:
   ```bash
   cd shop-be
   ```
2. Tạo môi trường ảo (Virtual Environment):
   ```bash
   python -m venv venv
   ```
3. Kích hoạt môi trường ảo:
   - **Windows**: `.\venv\Scripts\activate`
   - **macOS/Linux**: `source venv/bin/activate`
4. Cài đặt các thư viện:
   ```bash
   pip install -r requirements.txt
   ```
5. Cấu hình môi trường:
   - Tạo file `.env` bằng cách sao chép từ `.env.example`: `copy .env.example .env`
   - Mở file `.env` và điền các khóa API và Secret Key của bạn.
6. Chạy các lệnh migration:
   ```bash
   python manage.py migrate
   ```
7. Khởi động server:
   ```bash
   python manage.py runserver
   ```

### 3. Thiết lập Frontend (shop)

1. Mở terminal mới và di chuyển vào thư mục:
   ```bash
   cd shop
   ```
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi động ứng dụng:
   ```bash
   npm start
   ```
   Sau đó, truy cập vào: `http://localhost:4200/`.

---

## Lưu ý quan trọng
- Không bao giờ đẩy các file `.env` hoặc `db.sqlite3` lên Git. 
- Mọi người khi clone code về cần tự tạo file `.env` theo mẫu đã cung cấp.

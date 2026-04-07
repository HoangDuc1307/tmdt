# Du an TMDT: `shop` + `shop-be`

Du an gom:
- `shop`: Frontend Angular
- `shop-be`: Backend Django + DRF

Muc tieu: san thuong mai dien tu cho phep nguoi dung mua/ban, co phan quan tri he thong (admin) rieng.

## 1) Yeu cau moi truong

- Node.js: khuyen dung `18.x` (hoac moi hon, thong nhat trong team)
- npm: di kem theo Node
- Python: `3.10+`

## 2) Clone va cai dat nhanh

```bash
git clone https://github.com/HoangDuc1307/tmdt.git
cd tmdt
```

### Backend (`shop-be`)

```bash
cd shop-be
python -m venv .venv
```

Kich hoat venv:
- Windows (PowerShell):
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
- Windows (CMD):
  ```cmd
  .\.venv\Scripts\activate
  ```
- macOS/Linux:
  ```bash
  source .venv/bin/activate
  ```

Cai thu vien va chay backend:

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend mac dinh: `http://127.0.0.1:8000`

### Frontend (`shop`)

Mo terminal moi:

```bash
cd shop
npm install
npm start
```

Frontend mac dinh: `http://localhost:4200`

## 3) Cac bien moi truong

### Backend env (`shop-be/.env`)

Can tao file `.env` tu mau `.env.example` (neu co):

```bash
copy .env.example .env
```

Luu y:
- Chatbot/OpenRouter la tuy chon. Neu thieu key, backend van chay, chatbot se tra ve fallback message.
- Tuyet doi khong commit `.env` len git.

## 4) Co che auth hien tai (quan trong)

Du an dang dung JWT (SimpleJWT):
- Header auth: `Authorization: Bearer <access_token>`
- Frontend luu:
  - `access_token`
  - `refresh_token`
  - `userInfo`
  trong `localStorage`
- Access token het han se gay `401` neu request khong duoc refresh/dang nhap lai.

## 5) Role va test nhanh

Nen co toi thieu 3 loai tai khoan de test:
- user thuong
- seller (nguoi dang ban)
- admin he thong (`is_staff = true`)

Test flow co ban:
1. Dang ky/Dang nhap
2. Dang bai (seller)
3. Duyet bai (admin)
4. Mua hang (user)
5. Bao cao (report) va xu ly report (admin)

## 6) Loi hay gap va cach xu ly

- `401 Unauthorized`
  - Kiem tra da login chua
  - Kiem tra request co header `Bearer` chua
  - Thu logout/login lai de lay token moi

- Python bao thieu thu vien (vi du `openpyxl`)
  - Dam bao dang o dung venv
  - Chay lai: `pip install -r requirements.txt`

- Frontend loi sau khi pull code
  - Xoa `node_modules` + cai lai:
    ```bash
    npm install
    ```
  - Dong bo Node version trong team

## 7) Quy tac git trong team

- Khong commit cac file moi truong/rac:
  - `.env`
  - `db.sqlite3`
  - `.venv/`
  - `.vscode/`
  - cache/log tam
- Truoc khi push:
  - Chay backend + frontend local
  - Kiem tra flow login va mot API can auth

## 8) Cau truc thu muc

```text
tmdt/
  shop/       # Angular frontend
  shop-be/    # Django backend
```


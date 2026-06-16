# Hướng Dẫn Deploy lên GitHub Pages

## 📋 Yêu Cầu

- Tài khoản GitHub
- Git cài đặt trên máy
- (Tùy chọn) Ruby & Jekyll

## 🚀 Các Bước Deploy

### Bước 1: Tạo Repository Mới

1. Đăng nhập vào [GitHub](https://github.com)
2. Tạo repository mới tên: **VSTEPWritingB1B2**
3. Chọn "Public"
4. **Không** initialize với README (vì chúng ta đã có)

### Bước 2: Chuẩn Bị Thư Mục Cục Bộ

```bash
# Clone hoặc tạo git repo
cd /home/iec-project/VSTEP
git init
git add .
git commit -m "Initial commit: VSTEP Writing Practice App"
```

### Bước 3: Kết Nối với GitHub

```bash
# Thay YOUR_USERNAME bằng username GitHub của bạn
git remote add origin https://github.com/YOUR_USERNAME/VSTEPWritingB1B2.git
git branch -M main
git push -u origin main
```

### Bước 4: Cấu Hình GitHub Pages

1. Vào repository trên GitHub
2. Chọn **Settings** → **Pages**
3. Chọn **Source**: "Deploy from a branch"
4. Chọn **Branch**: "main" / "/ (root)"
5. Nhấn **Save**

### Bước 5: Chờ Deployment

- GitHub sẽ tự động build và deploy
- Kiểm tra tab **Actions** để xem tiến độ
- Sau ~1-2 phút, trang sẽ có sẵn tại: `https://YOUR_USERNAME.github.io/VSTEPWritingB1B2`

## 🔧 Tối Ưu Hóa

### Đã Thực Hiện

✅ Đổi tên file thành `index.html` (entry point chuẩn)
✅ Tạo `_config.yml` (GitHub Pages config)
✅ Tạo `.gitignore` (loại trừ file không cần thiết)
✅ Tạo `README.md` (tài liệu)
✅ Tạo CI/CD workflow (tự động deploy)

### Tối Ưu Hóa Thêm (Nâng Cao)

```bash
# 1. Minify HTML (sử dụng html-minifier)
npm install -g html-minifier
html-minifier --collapse-whitespace --remove-comments \
  --minify-css true --minify-js true \
  index.html -o index.min.html

# 2. Gzip compression (tự động bởi GitHub)
# Không cần làm gì, GitHub tự động gzip

# 3. Kiểm tra PageSpeed
# https://pagespeed.web.dev/
# Thêm URL của trang để kiểm tra
```

## 📊 Tối Ưu Hóa SEO

Các thẻ đã được thêm vào `_config.yml`:
- ✅ Open Graph tags
- ✅ Twitter Card tags
- ✅ Meta description
- ✅ Canonical URL

## 🔒 Bảo Mật

- Không có API keys trong code ✅
- Không có sensitive data ✅
- HTTPS tự động bởi GitHub Pages ✅

## 📈 Monitoring

### Kiểm Tra Deployment

```bash
# Xem git log
git log --oneline

# Kiểm tra Actions
# Vào: Settings → Actions → General
# Bật: Allow all actions and reusable workflows
```

### Analytics (Tùy Chọn)

Thêm Google Analytics:
```html
<!-- Thêm vào cuối thẻ <head> trong index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR_GA_ID');
</script>
```

## 🐛 Khắc Phục Sự Cố

### Trang không hiển thị?

1. Kiểm tra Actions có lỗi không
2. Đợi 5-10 phút rồi refresh
3. Clear cache: Ctrl+Shift+Delete

### CSS/JS không load?

1. Kiểm tra `baseurl` trong `_config.yml`
2. Kiểm tra console (F12) có lỗi không
3. Thử incognito mode

### 404 Error?

1. Kiểm tra branch name (phải là `main` hoặc `master`)
2. Kiểm tra `index.html` tồn tại ở root
3. Kiểm tra GitHub Pages được bật

## 📱 Testing

```bash
# Test local
python3 -m http.server 8000
# Truy cập: http://localhost:8000

# Test production URL
curl -I https://YOUR_USERNAME.github.io/VSTEPWritingB1B2
```

## 🔄 Update Code

Sau khi deploy, nếu cập nhật:

```bash
# Edit files
nano index.html

# Commit
git add .
git commit -m "Update: [mô tả thay đổi]"

# Push (tự động deploy)
git push origin main
```

## 📞 Hỗ Trợ Thêm

- GitHub Pages Docs: https://docs.github.com/pages
- Jekyll Docs: https://jekyllrb.com/docs/

---

**Chúc mừng!** 🎉 Ứng dụng của bạn giờ đã online!

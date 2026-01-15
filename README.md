# Keyword Auto Form Filler 📝

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/Kpoi148/Form-Filler)

**Keyword Auto Form Filler** là một tiện ích mở rộng cho Chrome giúp bạn điền các biểu mẫu (forms) nhanh chóng và chính xác bằng cách sử dụng các từ khóa và cấu hình (profile) do bạn tự định nghĩa.

## ✨ Tính năng nổi bật
- **Đa cấu hình (Multiple Profiles):** Quản lý nhiều bộ từ khóa/giá trị khác nhau cho từng mục đích sử dụng.
- **Điền nhanh theo yêu cầu:** Kích hoạt điền form cho tab hiện tại chỉ với một cú nhấp chuột.
- **Tự động điền (Auto-fill):** Tùy chọn tự động điền ngay khi trang web được tải xong.
- **Nhập/Xuất cấu hình:** Dễ dàng sao lưu hoặc chia sẻ cấu hình của bạn dưới dạng file JSON.
- **Giao diện hiện đại:** Thân thiện, dễ sử dụng và hiệu quả.

## 📂 Cấu trúc dự án
- `manifest.json` - Tệp cấu hình của Extension (Manifest V3).
- `src/popup/` - Giao diện người dùng của popup (HTML/CSS/JS).
- `src/background/` - Background service worker xử lý các tác vụ ngầm.
- `src/content/` - Content script thực hiện việc quét và điền dữ liệu vào form.
- `examples/` - Trang mẫu để kiểm tra tính năng nhanh chóng.
- `scripts/` - Các kịch bản tiện ích.
- `icons/` - Các biểu tượng của ứng dụng.

## 🚀 Hướng dẫn cài đặt (Chrome)
1. Truy cập vào trang quản lý tiện ích: `chrome://extensions`
2. Kích hoạt **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải.
3. Nhấp vào nút **Tải tiện ích đã giải nén (Load unpacked)**.
4. Chọn thư mục gốc của dự án này (`e:\JS\Form-Filler`).

## 💡 Cách sử dụng
1. Mở popup từ thanh công cụ của trình duyệt.
2. Tạo mới hoặc chọn một cấu hình sẵn có.
3. Thêm các từ khóa và giá trị tương ứng (ví dụ: `name` -> `Luu Chi Khanh`).
4. Nhấn **"Fill current tab"** để điền dữ liệu vào trang web đang mở.
5. Bật tùy chọn **Auto-Fill** nếu bạn muốn tiện ích tự chạy khi tải trang.

## 📥 Nhập/Xuất dữ liệu
- **Xuất (Export):** Tạo file `kff_export.json` chứa toàn bộ cấu hình của bạn.
- **Nhập (Import):** Hỗ trợ tệp JSON có cấu hình tương thích để cập nhật danh sách profile.

## 📝 Lưu ý
- Tính năng tự động điền chỉ hoạt động khi content script được phép chạy trên trang đó.
- Tiện ích sẽ bỏ qua các trường (input) đã có sẵn dữ liệu để tránh ghi đè thông tin quan trọng.

## 📄 Giấy phép & Bản quyền
Dự án được phát hành dưới giấy phép **MIT**. Xem tệp [LICENSE](LICENSE) để biết thêm chi tiết.

Copyright © 2026 **Luu Chi Khanh(Poi)**. All rights reserved.

# 🎓 Thiệp Mời Lễ Tốt Nghiệp Điện Tử (Graduation Invitation)

Thiết kế thiệp mời lễ tốt nghiệp đại học theo phong cách **Minimalist Botanical / Light Sage Green (Xanh Xô Thơm Nhạt)**, hỗ trợ tạo link cá nhân hóa tên riêng cho từng người nhận, nút troll "Không tham gia" né tránh vui nhộn, trang **Admin Studio kèm Live Preview** chỉnh sửa mọi dòng chữ, và liên kết lưu trữ RSVP & Lời chúc trực tiếp vào Google Sheets hoàn toàn miễn phí.

---

## ✨ Điểm Nổi Bật & Tinh Chỉnh Mới

1. **Tông màu Xanh Nhạt Thanh Lịch (Light Sage Green):**
   - Chuyển toàn bộ màu sắc sang tone xanh xô thơm nhạt pastel (`#557A66`, `#F2F6F3`) phối cùng giấy kem và viền vàng nhạt champagne. Cảm giác nhẹ nhàng, sáng và hiện đại.
2. **Admin Studio kèm Màn Hình Xem Trước (Live Preview):**
   - Mở file `admin.html`: Bạn có thể chỉnh sửa **tất cả mọi dòng chữ**: Tên cử nhân, tên trường, học vị, ngày giờ, địa điểm, link ảnh, số điện thoại đón khách.
   - Cột bên phải là chiếc điện thoại ảo mô phỏng thời gian thực – sửa tới đâu thấy thiệp đổi tới đó!
   - Bấm **"Lưu Cấu Hình"** là website tự động áp dụng ngay.
3. **Sổ lưu bút tự động lấy tên:**
   - Người nhận không cần gõ lại tên. Hệ thống tự động nhận diện tên khách từ link mời và khóa cố định vào sổ lưu bút. Khách chỉ việc gõ lời chúc và bấm gửi bí mật.
4. **Phần thông tin liên hệ đón khách tối giản:**
   - Chỉ cần 1 số điện thoại (vừa dùng để gọi, vừa tự động sinh link mở Zalo `zalo.me/...`) kèm ghi chú tên người đón tiếp.
5. **Đảm bảo lưu trữ RSVP (Tham gia) & Lời chúc:**
   - Khách bấm **"Chắc chắn tham gia ✨"** ➔ Lưu ngay vào Google Sheets và ghi nhớ trên trình duyệt của khách (đã có lưu trữ).
   - Nút né troll **"Rất tiếc không thể"** chạy trốn kèm lời trêu chọc và popup meme.

---

## 📁 Cấu Trúc Thư Mục

```text
invite-paper/
├── index.html              # Trang thiệp mời chính hiển thị cho khách
├── admin.html              # Admin Studio: Chỉnh sửa text + Live Preview + Tạo link
├── google-apps-script.js   # Mã nguồn gắn vào Google Sheets
├── README.md               # Hướng dẫn chi tiết
└── assets/
    ├── css/
    │   └── style.css       # Toàn bộ giao diện Light Sage Green & hiệu ứng hoạt ảnh
    ├── js/
    │   ├── config.js       # File cấu hình dữ liệu mặc định
    │   └── app.js          # Logic đếm ngược, nút troll, gửi Sheets, audio
    ├── images/             # Nơi lưu ảnh kỷ yếu
    └── audio/              # File nhạc nền piano
```

---

## 🚀 Hướng Dẫn Sử Dụng Admin Studio (`admin.html`)

1. Mở file [admin.html](file:///d:/invite-paper/admin.html) bằng trình duyệt.
2. **Tab 1: ✏️ Chỉnh Sửa & Xem Trước (Preview):**
   - Đổi tên cử nhân, ngày giờ làm lễ, hội trường, link ảnh, SĐT liên hệ...
   - Bấm **"💾 Lưu Cấu Hình (Áp dụng ngay cho web)"** để cập nhật thiệp.
   - Bấm **"☁️ Lưu Lên Google Sheets"** để đồng bộ trực tiếp lên tab `Config` của Google Sheets.
3. **Tab 2: 🔗 Tạo Link Mời Hàng Loạt:**
   - Dán danh sách bạn bè vào ô (mỗi người 1 dòng) ➔ bấm **"Tạo danh sách link mời"**.
   - Bấm nút **Copy** bên cạnh từng người để gửi thẳng qua Zalo/Messenger.
4. **Tab 3: ☁️ Kết Nối Google Sheets:**
   - Dán URL ứng dụng web (đuôi `/exec`) và bấm **"Kiểm tra kết nối"**.

---

## 📊 Kết Nối Google Sheets

1. Tạo 1 file Google Sheets mới trên [sheets.new](https://sheets.new).
2. Vào **Tiện ích mở rộng (Extensions)** ➔ **Apps Script**.
3. Dán toàn bộ code trong file `google-apps-script.js` vào và bấm **Lưu (Ctrl + S)**.
4. Bấm **Triển khai (Deploy)** ➔ **Quản lý bản triển khai mới** ➔ Chọn **Ứng dụng web (Web App)**:
   - *Execute as:* **Tôi (Me)**
   - *Who has access:* **Bất kỳ ai (Anyone)**
5. Copy URL nhận được dán vào ô ở Tab 3 của trang `admin.html` (hoặc dán vào file `assets/js/config.js`).

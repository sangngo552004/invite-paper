/**
 * CẤU HÌNH THIỆP MỜI TỐT NGHIỆP
 */

const CONFIG = {
  // 1. Link Google Apps Script Web App (Tự động đọc từ file env.js)
  googleSheetScriptUrl: (typeof window !== "undefined" && window.ENV && window.ENV.GOOGLE_SHEET_URL)
    ? window.ENV.GOOGLE_SHEET_URL
    : "https://script.google.com/macros/s/AKfycbzsazt8x-e3R5s_ekY8NNi03tUT7BDcqMpj8xZ8cjfTeHXj57CdKxBkR73MMYRArHI6/exec",

  // 2. Thông tin cử nhân (Chủ tiệc)
  graduate: {
    fullName: "Nguyễn Văn A",
    degreeTitle: "Cử nhân Công nghệ Thông tin",
    university: "Đại học Bách Khoa - ĐHQG TP.HCM"
  },

  // 3. Thời gian & Địa điểm buổi lễ
  ceremony: {
    // Mốc thời gian kích hoạt đồng hồ đếm ngược (YYYY-MM-DDTHH:mm:ss)
    dateTime: "2026-11-20T08:30:00",

    // Giờ mời mặc định (Có thể ghi đè riêng cho từng khách qua link ?time=08:30)
    time: "08:30",
    dateFormatted: "Thứ Sáu, 20 Tháng 11, 2026",

    // Địa điểm
    venueName: "Hội trường A5, Đại học Bách Khoa TP.HCM",
    address: "268 Lý Thường Kiệt, Phường 14, Quận 10, TP. Hồ Chí Minh",
    googleMapsUrl: "https://maps.google.com/?q=268+Lý+Thường+Kiệt+Phường+14+Quận+10+Hồ+Chí+Minh",
    calendarTitle: "Lễ Tốt Nghiệp của Nguyễn Văn A 🎓",
    calendarDetails: "Lễ tốt nghiệp tại Hội trường A5. Liên hệ khi tới nơi: 0901234567"
  },

  // 4. Danh sách ảnh chân dung cử nhân (1 hoặc tối đa 3 ảnh)
  photos: [
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop"
  ],

  // 5. Thông tin liên hệ đón khách (Tối giản: SĐT là Zalo + Tên người đón)
  contact: {
    phone: "0901 234 567",
    personName: "Nguyễn Văn A"
  },

  // 6. Nhạc nền (Audio)
  audio: {
    enabled: true,
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=graduation-day-piano-112190.mp3",
    autoPlayOnOpen: true
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

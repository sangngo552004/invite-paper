/**
 * CẤU HÌNH THIỆP MỜI TỐT NGHIỆP
 * Phiên bản: Luxury Pastel Blue / Arch Editorial (Chuẩn 8 ảnh cố định)
 */

const CONFIG = {
  // 1. Link Google Apps Script Web App (Tự động đọc từ file env.js)
  googleSheetScriptUrl: (typeof window !== "undefined" && window.ENV && window.ENV.GOOGLE_SHEET_URL)
    ? window.ENV.GOOGLE_SHEET_URL
    : "https://script.google.com/macros/s/AKfycbzsazt8x-e3R5s_ekY8NNi03tUT7BDcqMpj8xZ8cjfTeHXj57CdKxBkR73MMYRArHI6/exec",

  // 2. Thông tin cử nhân (Chủ tiệc)
  graduate: {
    fullName: "Nguyễn Kim Ngân",
    degreeTitle: "Cử nhân Kinh Tế",
    university: "Đại học Kinh Tế TP.HCM (UEH)"
  },

  // 3. Thời gian & Địa điểm buổi lễ
  ceremony: {
    // Mốc thời gian kích hoạt đồng hồ đếm ngược (YYYY-MM-DDTHH:mm:ss)
    dateTime: "2026-09-20T10:00:00",

    // Giờ mời mặc định (Có thể ghi đè riêng cho từng khách qua link ?time=10:00)
    time: "10:00",
    dateFormatted: "Chủ Nhật, 20 Tháng 9, 2026",

    // Địa điểm
    venueName: "Trường Đại Học Kinh Tế Thành Phố Hồ Chí Minh",
    address: "Cơ sở A - 59 C Nguyễn Đình Chiểu, Xuân Hòa, TP. Hồ Chí Minh",
    googleMapsUrl: "https://maps.google.com/?q=59C+Nguyễn+Đình+Chiểu+Xuân+Hòa+Hồ+Chí+Minh",
    calendarTitle: "Lễ Tốt Nghiệp của Nguyễn Kim Ngân 🎓",
    calendarDetails: "Lễ tốt nghiệp tại Cơ sở A. Liên hệ khi tới nơi: 0901234567",

    // Sơ đồ trường & Hướng dẫn di chuyển nội bộ
    campusMapUrl: "assets/images/campus-map.jpg",
    campusMapNote: "Vào trường xong đi đến thẳng nhà E",
    parkingNote: "Gửi trong trường chuẩn bị trước 4k (trường thu tiền gửi xe trước). Nếu trường hết chỗ để xe thì có thể gửi xe đối diện trường."
  },

  // 4. Lịch trình buổi lễ (Timeline)
  timeline: [
    {
      time: "08:00",
      title: "Làm lễ tốt nghiệp",
      icon: "ceremony"
    },
    {
      time: "10:00",
      title: "Chụp ảnh kỷ niệm",
      icon: "camera"
    }
  ],

  // 5. DANH SÁCH 8 ẢNH CỐ ĐỊNH THEO ĐÚNG BỐ CỤC MẪU
  // Bạn của bạn chỉ cần dán đúng 8 link ảnh (hoặc link Google Drive / Dropbox) vào đây:
  photos: [
    // 1. Ảnh vòm chân dung mở đầu (Hero Arch - Dọc 3:4 hoặc 4:5)
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop",

    // 2. Ảnh toàn thân giữa thiệp (Middle Portrait - Dọc 3:4 hoặc 9:16)
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop",

    // 3. Ảnh nền Timeline lịch trình (Timeline Backdrop - Ngoại cảnh sân trường/bãi cỏ)
    "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1000&auto=format&fit=crop",

    // 4. Ảnh album lớn ở trên (Album Top Banner - Ngang 16:9 hoặc 4:3)
    "https://images.unsplash.com/photo-1525921429624-479b6a26d84d?q=80&w=1000&auto=format&fit=crop",

    // 5. Ảnh album 1 (Album Grid Left 1 - Vuông/Dọc)
    "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=800&auto=format&fit=crop",

    // 6. Ảnh album 2 (Album Grid Right 1 - Vuông/Dọc)
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop",

    // 7. Ảnh album 3 (Album Grid Left 2 - Vuông/Dọc)
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop",

    // 8. Ảnh album 4 (Album Grid Right 2 - Tung mũ cử nhân/Nụ cười)
    "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=800&auto=format&fit=crop"
  ],

  // 6. Danh sách thông tin liên hệ đón khách (Dạng danh sách, thêm bao nhiêu người tùy thích)
  contacts: [
    {
      name: "Nguyễn Văn A",
      phone: "0901 234 567"
    },
    {
      name: "Người đón tại cổng",
      phone: "0902 345 678"
    }
  ],

  // 7. Nhạc nền (Audio - Cố định từ file nội bộ)
  audio: {
    enabled: true,
    url: "assets/audio/Cam-On-We-Belong-Together-Dong-Nhi-Trinh-Nhat-Minh.mp3",
    autoPlayOnOpen: true
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

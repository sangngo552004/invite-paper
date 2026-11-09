/**
 * GRADUATION INVITATION APPLICATION SCRIPT
 * Minimalist Light Sage Green Edition
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Phân tích URL Parameters (?to=...&id=...&time=...)
  const urlParams = new URLSearchParams(window.location.search);
  const isPreview = urlParams.get("preview") === "true";
  const previewMode = urlParams.get("mode") || (isPreview ? "card" : "");
  const rawGuestName = urlParams.get("to");
  const guestId = urlParams.get("id");
  const customTime = urlParams.get("time");

  const isDemo = isPreview || guestId === "demo";

  // 2. Tải cấu hình đã lưu (từ localStorage nếu admin đã sửa trên web)
  loadLocalAdminConfig();
  applyConfigData(CONFIG);

  // 3. KIỂM TRA BẢO MẬT KHÁCH MỜI (Guest Whitelist Verification)
  let authorizedList = [];
  try {
    const localAuthorized = localStorage.getItem("invitation_authorized_guests");
    if (localAuthorized) authorizedList = JSON.parse(localAuthorized);
  } catch(e) {}
  if (!authorizedList.length && CONFIG.authorizedGuests) {
    authorizedList = CONFIG.authorizedGuests;
  }

  let finalGuestName = rawGuestName ? decodeURIComponent(rawGuestName).trim() : "Bạn & Người thương";
  const finalGuestId = guestId || "guest_" + Math.random().toString(36).substring(2, 7);

  // Nếu hệ thống ĐÃ CÓ danh sách khách mời và KHÔNG phải màn hình Demo / Preview:
  if (!isDemo && authorizedList && authorizedList.length > 0) {
    const validGuest = guestId ? authorizedList.find(g => g.id === guestId) : null;

    if (!validGuest) {
      // Chặn ngay lập tức: Hiện màn hình thông báo link không hợp lệ
      const unauthScreen = document.getElementById("unauthorizedScreen");
      const envelopeScreen = document.getElementById("envelopeScreen");
      const mainWrapper = document.querySelector(".main-wrapper");

      if (unauthScreen) unauthScreen.style.display = "flex";
      if (envelopeScreen) envelopeScreen.style.display = "none";
      if (mainWrapper) mainWrapper.style.display = "none";
      return; // Dừng khởi tạo thiệp
    }

    // BẢO MẬT TUYỆT ĐỐI: Dùng tên và giờ đã được lưu theo mã ID (chống sửa parameter ?to= trên URL)
    finalGuestName = validGuest.name;
    if (validGuest.time) CONFIG.ceremony.time = validGuest.time;
  } else if (customTime) {
    CONFIG.ceremony.time = decodeURIComponent(customTime).trim();
  }

  // 4. Khởi tạo giao diện
  initGuestDetails(finalGuestName, finalGuestId);
  initAudioPlayer();
  initEnvelopeOpener();
  initCountdown();
  initCalendarLink();
  initCampusMapLightbox();
  initRunawayButton();
  initRsvpHandler(finalGuestName, finalGuestId);
  initWishHandler(finalGuestName, finalGuestId);

  // 5. Nếu ở chế độ Preview (admin preview), chỉ tự động mở phong bì nếu đang ở chế độ xem ruột thiệp (card)
  if (isPreview && previewMode !== "envelope") {
    const envelopeScreen = document.getElementById("envelopeScreen");
    if (envelopeScreen) envelopeScreen.classList.add("opened");
  }

  // 6. Lắng nghe cập nhật thời gian thực từ trang Admin Studio qua postMessage
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "UPDATE_CONFIG") {
      mergeConfig(event.data.config);
      applyConfigData(CONFIG);
    }
  });

  // 7. Tải cấu hình từ Google Sheets nếu có cài đặt
  loadRemoteConfigIfAvailable();
});

/**
 * Đọc cấu hình từ localStorage nếu admin đã từng chỉnh sửa trên Admin Preview
 */
function loadLocalAdminConfig() {
  try {
    const savedConfig = localStorage.getItem("invitation_admin_config");
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      mergeConfig(parsed);
    }
  } catch (e) {
    console.warn("Không thể đọc cấu hình từ localStorage:", e);
  }
}

/**
 * Hợp nhất dữ liệu cấu hình mới vào CONFIG
 */
function mergeConfig(data) {
  if (!data) return;
  if (data.googleSheetScriptUrl !== undefined) CONFIG.googleSheetScriptUrl = data.googleSheetScriptUrl;
  if (data.graduate) Object.assign(CONFIG.graduate, data.graduate);
  if (data.ceremony) Object.assign(CONFIG.ceremony, data.ceremony);
  if (data.contact) Object.assign(CONFIG.contact, data.contact);
  if (data.contacts && Array.isArray(data.contacts)) CONFIG.contacts = data.contacts;
  if (data.audio) Object.assign(CONFIG.audio, data.audio);
  if (data.photos && data.photos.length) CONFIG.photos = data.photos;
}

/**
 * Hiển thị tên khách mời vào các vị trí trên thiệp
 */
function initGuestDetails(guestName, guestId) {
  // Điền vào phong bì
  const envelopeGuestEl = document.getElementById("envelopeGuestName");
  if (envelopeGuestEl) envelopeGuestEl.textContent = guestName;

  // Điền vào lời tựa thiệp
  const cardGuestEl = document.getElementById("cardGuestName");
  if (cardGuestEl) cardGuestEl.textContent = guestName;

  // Điền cố định vào sổ lưu bút lời chúc (người dùng không cần nhập lại tên)
  const wishSenderDisplay = document.getElementById("wishSenderDisplay");
  if (wishSenderDisplay) wishSenderDisplay.textContent = guestName;
}

/**
 * Tự động chuẩn hóa link Google Drive và Dropbox sang link phát trực tiếp
 */
function normalizeDriveUrl(url) {
  if (!url || typeof url !== "string") return url;
  let trimmed = url.trim();

  // Xử lý link Dropbox (chuyển dl=0 thành raw=1 để phát được trực tiếp)
  if (trimmed.includes("dropbox.com")) {
    return trimmed.replace("dl=0", "raw=1").replace("?dl=1", "?raw=1");
  }

  // Xử lý link Google Drive
  if (trimmed.includes("drive.google.com")) {
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }
  return trimmed;
}

/**
 * Tải cấu hình động từ Google Sheets (tab Config)
 */
async function loadRemoteConfigIfAvailable() {
  if (!CONFIG.googleSheetScriptUrl) {
    applyConfigData(CONFIG);
    return;
  }

  try {
    const fetchUrl = `${CONFIG.googleSheetScriptUrl}?action=getConfig&t=${Date.now()}`;
    const response = await fetch(fetchUrl);
    const json = await response.json();

    if (json.status === "success" && json.data) {
      const remote = json.data;
      
      // Đọc cấu hình tùy chỉnh mà người dùng đã lưu trên máy (nếu có)
      let localCfg = null;
      try {
        const saved = localStorage.getItem("invitation_admin_config");
        if (saved) localCfg = JSON.parse(saved);
      } catch(e) {}

      // Hàm gán thông minh: Không để giá trị mẫu mặc định trên Sheet ("Nguyễn Văn A") đè lên tên tùy chỉnh của người dùng
      const getVal = (remoteVal, localVal, defaultPlaceholder) => {
        if (!remoteVal) return localVal || defaultPlaceholder;
        if (remoteVal === defaultPlaceholder && localVal && localVal !== defaultPlaceholder) {
          return localVal;
        }
        return remoteVal;
      };

      // Ghép nối cấu hình thông minh
      if (remote.graduate_name) {
        CONFIG.graduate.fullName = getVal(remote.graduate_name, localCfg?.graduate?.fullName, "Nguyễn Văn A");
      }
      if (remote.degree_title) {
        CONFIG.graduate.degreeTitle = getVal(remote.degree_title, localCfg?.graduate?.degreeTitle, "Cử nhân Công nghệ Thông tin");
      }
      if (remote.university) {
        CONFIG.graduate.university = getVal(remote.university, localCfg?.graduate?.university, "Đại học Bách Khoa - ĐHQG TP.HCM");
      }
      if (remote.ceremony_date) {
        CONFIG.ceremony.dateTime = getVal(remote.ceremony_date, localCfg?.ceremony?.dateTime, "2026-11-20T08:30:00");
      }
      const sheetTime = remote.time || remote.ceremony_time;
      if (sheetTime) {
        CONFIG.ceremony.time = getVal(sheetTime, localCfg?.ceremony?.time, "08:30");
      }
      if (remote.date_formatted) {
        CONFIG.ceremony.dateFormatted = getVal(remote.date_formatted, localCfg?.ceremony?.dateFormatted, "Thứ Sáu, 20 Tháng 11, 2026");
      }
      if (remote.venue_name) {
        CONFIG.ceremony.venueName = getVal(remote.venue_name, localCfg?.ceremony?.venueName, "Hội trường A5, Đại học Bách Khoa TP.HCM");
      }
      if (remote.address) {
        CONFIG.ceremony.address = getVal(remote.address, localCfg?.ceremony?.address, "268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM");
      }
      if (remote.maps_url) {
        CONFIG.ceremony.googleMapsUrl = getVal(remote.maps_url, localCfg?.ceremony?.googleMapsUrl, "");
      }
      if (remote.campus_map_url) {
        CONFIG.ceremony.campusMapUrl = getVal(remote.campus_map_url, localCfg?.ceremony?.campusMapUrl, "assets/images/campus-map.jpg");
      }
      if (remote.campus_map_note) {
        CONFIG.ceremony.campusMapNote = getVal(remote.campus_map_note, localCfg?.ceremony?.campusMapNote, "Vào trường xong đi đến thẳng nhà E");
      }
      if (remote.parking_note) {
        CONFIG.ceremony.parkingNote = getVal(remote.parking_note, localCfg?.ceremony?.parkingNote, "Gửi trong trường chuẩn bị trước 4k (trường thu tiền gửi xe trước). Nếu trường hết chỗ để xe thì có thể gửi xe đối diện trường.");
      }
      if (remote.contacts_json) {
        try {
          const parsedContacts = JSON.parse(remote.contacts_json);
          if (Array.isArray(parsedContacts) && parsedContacts.length > 0) {
            CONFIG.contacts = parsedContacts;
          }
        } catch (e) { }
      } else if (remote.contact_phone || remote.contact_person) {
        const fallbackList = [{ name: remote.contact_person || "Nguyễn Văn A", phone: remote.contact_phone || "0901 234 567" }];
        if (remote.contact_phone2 || remote.contact_person2) {
          fallbackList.push({ name: remote.contact_person2 || "Người đón tại cổng", phone: remote.contact_phone2 || "0902 345 678" });
        }
        CONFIG.contacts = fallbackList;
      }
      // Audio luôn cố định từ file trong thư mục nội bộ
      CONFIG.audio.url = "assets/audio/Cam-On-We-Belong-Together-Dong-Nhi-Trinh-Nhat-Minh.mp3";

      if (remote.photo_urls) {
        const remotePhotos = remote.photo_urls.split(",").map(url => normalizeDriveUrl(url.trim())).filter(Boolean);
        if (remotePhotos.length) {
          CONFIG.photos = remotePhotos;
        }
      }

      // Đồng bộ danh sách khách hợp lệ từ Google Sheets để hỗ trợ mở trên mọi thiết bị
      if (remote.guests_json) {
        try {
          const remoteGuests = JSON.parse(remote.guests_json);
          if (Array.isArray(remoteGuests) && remoteGuests.length > 0) {
            localStorage.setItem("invitation_authorized_guests", JSON.stringify(remoteGuests));
            
            // Nếu ban đầu trang bị chặn do thiết bị chưa có whitelist:
            const unauthScreen = document.getElementById("unauthorizedScreen");
            const urlParams = new URLSearchParams(window.location.search);
            const gId = urlParams.get("id");
            if (gId) {
              const validGuest = remoteGuests.find(g => g.id === gId);
              if (validGuest) {
                if (unauthScreen) unauthScreen.style.display = "none";
                const envelopeScreen = document.getElementById("envelopeScreen");
                const mainWrapper = document.querySelector(".main-wrapper");
                if (envelopeScreen) envelopeScreen.style.display = "";
                if (mainWrapper) mainWrapper.style.display = "";
                initGuestDetails(validGuest.name, validGuest.id);
                if (validGuest.time) {
                  CONFIG.ceremony.time = validGuest.time;
                  const timeEl = document.getElementById("ceremonyTime");
                  if (timeEl) timeEl.textContent = validGuest.time;
                }
              }
            }
          }
        } catch(e) {}
      }
    }
  } catch (err) {
    console.warn("Không thể tải cấu hình từ Google Sheets, dùng dữ liệu hiện tại:", err);
  }

  applyConfigData(CONFIG);
}

/**
 * Định dạng ngày sang tiếng Việt trang nhã, đẹp mắt
 * Chuyển các định dạng ISO (2026-11-19T17:00:00.000Z) thành dạng: "Thứ Sáu, ngày 20/11/2026"
 */
function formatDisplayDate(rawDate) {
  if (!rawDate) return "Thứ Sáu, ngày 20/11/2026";
  const str = String(rawDate).trim();

  // Nếu là dạng text thuần đã đẹp sẵn (không có T hoặc Z)
  if (!str.includes("T") && !str.includes("Z") && !/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str;
  }

  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;

    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayOfWeek = days[d.getDay()];
    const dateNum = String(d.getDate()).padStart(2, "0");
    const monthNum = String(d.getMonth() + 1).padStart(2, "0");
    const yearNum = d.getFullYear();

    return `${dayOfWeek}, ngày ${dateNum}/${monthNum}/${yearNum}`;
  } catch (e) {
    return str;
  }
}

/**
 * Cập nhật dữ liệu từ đối tượng CONFIG lên toàn bộ giao diện HTML
 */
function applyConfigData(config) {
  // Tên & Học vị cử nhân (Chủ tiệc)
  setElementText("graduateFullName", config.graduate.fullName);
  setElementText("graduateDegreeTitle", config.graduate.degreeTitle);
  setElementText("graduateUniversity", config.graduate.university);

  // Thời gian & Địa điểm
  setElementText("ceremonyTimeFormatted", config.ceremony.time || "08:30");
  setElementText("ceremonyDateFormatted", formatDisplayDate(config.ceremony.dateFormatted || config.ceremony.dateTime));
  setElementText("ceremonyVenueName", config.ceremony.venueName);
  setElementText("ceremonyAddress", config.ceremony.address);

  // Google Maps link
  const mapsBtn = document.getElementById("btnGoogleMaps");
  if (mapsBtn && config.ceremony.googleMapsUrl) {
    mapsBtn.href = config.ceremony.googleMapsUrl;
  }

  // Danh sách người liên hệ đón khách (Dạng danh sách, không phân biệt vai trò)
  renderFooterContacts(config.contacts || config.contact);

  // Khởi tạo hiển thị ảnh (1 ảnh hoặc chuyển nhẹ 2-3 ảnh)
  setupPhotoArch(config.photos);

  // Sơ đồ trường & Hướng dẫn di chuyển nội bộ
  const campusMapImg = document.getElementById("campusMapImg");
  const campusMapModalImg = document.getElementById("campusMapModalImg");
  const campusMapNoteText = document.getElementById("campusMapNoteText");
  const campusMapModalNote = document.getElementById("campusMapModalNote");
  const parkingNoteText = document.getElementById("parkingNoteText");
  const parkingModalNote = document.getElementById("parkingModalNote");

  const mapUrl = (config.ceremony && config.ceremony.campusMapUrl) ? config.ceremony.campusMapUrl : "assets/images/campus-map.jpg";
  const mapNote = (config.ceremony && config.ceremony.campusMapNote) ? config.ceremony.campusMapNote : "Vào trường xong đi đến thẳng nhà E";
  const parkNote = (config.ceremony && config.ceremony.parkingNote) ? config.ceremony.parkingNote : "Gửi trong trường chuẩn bị trước 4k (trường thu tiền gửi xe trước). Nếu trường hết chỗ để xe thì có thể gửi xe đối diện trường.";

  if (campusMapImg && mapUrl) campusMapImg.src = mapUrl;
  if (campusMapModalImg && mapUrl) campusMapModalImg.src = mapUrl;
  if (campusMapNoteText && mapNote) campusMapNoteText.textContent = mapNote;
  if (campusMapModalNote && mapNote) campusMapModalNote.textContent = mapNote;
  if (parkingNoteText && parkNote) parkingNoteText.textContent = parkNote;
  if (parkingModalNote && parkNote) parkingModalNote.textContent = parkNote;

  // Cập nhật lại Calendar link & Countdown
  initCalendarLink();
  initCountdown();
}

function setElementText(id, text) {
  const el = document.getElementById(id);
  if (el && text) el.textContent = text;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Hiển thị danh sách người liên hệ đón khách (Dạng danh sách, không phân biệt vai trò)
 */
function renderFooterContacts(contactsData) {
  const container = document.getElementById("footerContactsList");
  if (!container) return;

  let list = [];
  if (Array.isArray(contactsData) && contactsData.length > 0) {
    list = contactsData;
  } else if (CONFIG.contacts && Array.isArray(CONFIG.contacts) && CONFIG.contacts.length > 0) {
    list = CONFIG.contacts;
  } else if (contactsData && typeof contactsData === "object") {
    if (contactsData.phone || contactsData.personName) {
      list.push({ name: contactsData.personName || "Người liên hệ", phone: contactsData.phone });
    }
    if (contactsData.phone2 || contactsData.personName2) {
      list.push({ name: contactsData.personName2 || "Người liên hệ", phone: contactsData.phone2 });
    }
  }

  if (!list.length) {
    list = [{ name: "Nguyễn Văn A", phone: "0901 234 567" }];
  }

  container.innerHTML = "";
  list.forEach(c => {
    const name = (c.name || c.personName || "").trim() || "Người liên hệ";
    const phone = (c.phone || "").trim();
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    const row = document.createElement("div");
    row.className = "contact-list-item";

    let actionsHtml = "";
    if (cleanPhone) {
      actionsHtml = `
        <div class="contact-list-actions">
          <a href="tel:${cleanPhone}" class="contact-pill" title="Gọi cho ${escapeHtml(name)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <span>Gọi</span>
          </a>
          <a href="https://zalo.me/${cleanPhone}" target="_blank" rel="noopener noreferrer" class="contact-pill" title="Nhắn Zalo cho ${escapeHtml(name)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.03 2 11c0 2.87 1.5 5.43 3.84 7.02L5 22l4.3-1.43C10.16 20.8 11.06 21 12 21c5.52 0 10-4.03 10-9s-4.48-9-10-9z"/>
            </svg>
            <span>Zalo</span>
          </a>
        </div>
      `;
    }

    row.innerHTML = `
      <div class="contact-list-info">
        <div class="contact-list-name">${escapeHtml(name)}</div>
        <div class="contact-list-phone">${escapeHtml(phone)}</div>
      </div>
      ${actionsHtml}
    `;
    container.appendChild(row);
  });
}

/**
 * Cài đặt khung ảnh vuông (Hỗ trợ bao nhiêu ảnh tùy thích, lật ảnh & tự động chuyển)
 */
let photoSliderInterval = null;
let currentPhotoIdx = 0;

function setupPhotoArch(photos) {
  const container = document.getElementById("photoArchInner");
  const btnPrev = document.getElementById("photoNavPrev");
  const btnNext = document.getElementById("photoNavNext");
  const dotsContainer = document.getElementById("photoDotsContainer");
  if (!container || !photos || photos.length === 0) return;

  if (photoSliderInterval) clearInterval(photoSliderInterval);
  container.innerHTML = "";
  if (dotsContainer) dotsContainer.innerHTML = "";

  const validPhotos = photos.map(normalizeDriveUrl).filter(Boolean);

  if (validPhotos.length <= 1) {
    // Chỉ có 1 ảnh: Ẩn 2 nút lật và các chấm dots
    if (btnPrev) btnPrev.style.display = "none";
    if (btnNext) btnNext.style.display = "none";
    if (dotsContainer) dotsContainer.style.display = "none";

    const img = document.createElement("img");
    img.src = validPhotos[0] || "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000";
    img.alt = "Ảnh cử nhân";
    img.loading = "eager";
    container.appendChild(img);
  } else {
    // Có từ 2 ảnh trở lên: Hiện 2 nút lật và các chấm chuyển ảnh
    if (btnPrev) btnPrev.style.display = "flex";
    if (btnNext) btnNext.style.display = "flex";
    if (dotsContainer) dotsContainer.style.display = "flex";

    validPhotos.forEach((src, idx) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = `Ảnh cử nhân ${idx + 1}`;
      img.className = `slider-item ${idx === 0 ? "active" : ""}`;
      img.loading = idx === 0 ? "eager" : "lazy";
      container.appendChild(img);

      if (dotsContainer) {
        const dot = document.createElement("span");
        dot.className = `photo-dot ${idx === 0 ? "active" : ""}`;
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
          goToPhoto(idx);
        });
        dotsContainer.appendChild(dot);
      }
    });

    currentPhotoIdx = 0;
    const items = container.querySelectorAll(".slider-item");
    const dots = dotsContainer ? dotsContainer.querySelectorAll(".photo-dot") : [];

    function goToPhoto(index) {
      if (items[currentPhotoIdx]) items[currentPhotoIdx].classList.remove("active");
      if (dots[currentPhotoIdx]) dots[currentPhotoIdx].classList.remove("active");

      currentPhotoIdx = (index + items.length) % items.length;

      if (items[currentPhotoIdx]) items[currentPhotoIdx].classList.add("active");
      if (dots[currentPhotoIdx]) dots[currentPhotoIdx].classList.add("active");

      restartTimer();
    }

    function nextPhoto() {
      goToPhoto(currentPhotoIdx + 1);
    }

    function prevPhoto() {
      goToPhoto(currentPhotoIdx - 1);
    }

    if (btnPrev) {
      btnPrev.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        prevPhoto();
      };
    }

    if (btnNext) {
      btnNext.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        nextPhoto();
      };
    }

    function restartTimer() {
      if (photoSliderInterval) clearInterval(photoSliderInterval);
      photoSliderInterval = setInterval(nextPhoto, 4500);
    }

    restartTimer();
  }
}

/**
 * Xử lý mở phong bì thư (Wax seal click)
 */
function initEnvelopeOpener() {
  const envelopeScreen = document.getElementById("envelopeScreen");
  const waxSeal = document.getElementById("waxSeal");
  const envelopeBody = document.getElementById("envelopeBody");
  if (!envelopeScreen) return;

  const openEnvelope = () => {
    triggerConfetti();
    envelopeScreen.classList.add("opened");

    if (CONFIG.audio.enabled && CONFIG.audio.autoPlayOnOpen) {
      playAudio();
    }
  };

  if (waxSeal) waxSeal.addEventListener("click", openEnvelope);
  if (envelopeBody) envelopeBody.addEventListener("click", openEnvelope);
}

/**
 * Nhạc nền tự động / Bật tắt
 */
let bgAudio = null;
let isAudioPlaying = false;

function initAudioPlayer() {
  const toggleBtn = document.getElementById("musicToggle");
  if (!toggleBtn || !CONFIG.audio.enabled) return;

  bgAudio = new Audio(normalizeDriveUrl(CONFIG.audio.url));
  bgAudio.loop = true;
  bgAudio.preload = "auto";

  toggleBtn.addEventListener("click", () => {
    if (isAudioPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  });
}

function playAudio() {
  const toggleBtn = document.getElementById("musicToggle");
  if (!bgAudio) return;

  bgAudio.play().then(() => {
    isAudioPlaying = true;
    if (toggleBtn) toggleBtn.classList.add("playing");
  }).catch((err) => {
    console.log("Trình duyệt chặn autoplay audio:", err);
  });
}

function pauseAudio() {
  const toggleBtn = document.getElementById("musicToggle");
  if (!bgAudio) return;

  bgAudio.pause();
  isAudioPlaying = false;
  if (toggleBtn) toggleBtn.classList.remove("playing");
}

/**
 * Đồng hồ đếm ngược tới ngày làm lễ
 */
let countdownTimer = null;
function initCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);

  const daysEl = document.getElementById("countDays");
  const hoursEl = document.getElementById("countHours");
  const minsEl = document.getElementById("countMins");
  const secsEl = document.getElementById("countSecs");
  if (!daysEl) return;

  const targetDate = new Date(CONFIG.ceremony.dateTime).getTime();

  function update() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      daysEl.textContent = "00";
      hoursEl.textContent = "00";
      minsEl.textContent = "00";
      secsEl.textContent = "00";
      clearInterval(countdownTimer);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    daysEl.textContent = String(days).padStart(2, "0");
    hoursEl.textContent = String(hours).padStart(2, "0");
    minsEl.textContent = String(minutes).padStart(2, "0");
    secsEl.textContent = String(seconds).padStart(2, "0");
  }

  update();
  countdownTimer = setInterval(update, 1000);
}

/**
 * Tạo link thêm sự kiện vào Google Calendar tự động
 */
function initCalendarLink() {
  const calBtn = document.getElementById("btnGoogleCalendar");
  if (!calBtn) return;

  try {
    const start = new Date(CONFIG.ceremony.dateTime);
    const end = new Date(start.getTime() + 3.5 * 60 * 60 * 1000);

    const formatCalTime = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const dates = `${formatCalTime(start)}/${formatCalTime(end)}`;

    const title = encodeURIComponent(CONFIG.ceremony.calendarTitle || `Lễ Tốt Nghiệp của ${CONFIG.graduate.shortName} 🎓`);
    const details = encodeURIComponent(CONFIG.ceremony.calendarDetails || `${CONFIG.graduate.degreeTitle} tại ${CONFIG.ceremony.venueName}`);
    const location = encodeURIComponent(CONFIG.ceremony.address || CONFIG.ceremony.venueName);

    calBtn.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  } catch (e) {
    console.error("Lỗi tạo calendar link:", e);
  }
}

/**
 * Quản lý mở / đóng Modal phóng to Sơ đồ di chuyển trong trường
 */
function initCampusMapLightbox() {
  const trigger = document.getElementById("campusMapTrigger");
  const modal = document.getElementById("campusMapModal");
  const closeBtn = document.getElementById("btnCloseCampusMap");
  const backdrop = document.getElementById("campusMapModalBackdrop");

  if (!trigger || !modal) return;

  function openModal() {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  trigger.addEventListener("click", openModal);
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal();
    }
  });

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) {
      closeModal();
    }
  });
}

/**
 * Nút "Không đồng ý tham gia" né tránh / troll vui nhộn
 */
function initRunawayButton() {
  const runawayBtn = document.getElementById("btnRunaway");
  const memeModal = document.getElementById("memeModal");
  const closeMemeBtn = document.getElementById("btnMemeOk");
  if (!runawayBtn) return;

  const teaseMessages = [
    "Ủa bấm chi dợ? 😂",
    "Không cho từ chối đâu hehe 😜",
    "Bấm nút xanh bên cạnh kìa! 👉",
    "Từ chối là tình bạn kết thúc đó nha 🥺",
    "Đừng bấm em nữa mà, em chạy mệt rồi 🏃‍♂️",
    "Bấm nút xanh đi màaaa! ✨",
    "Nút này bị hỏng rồi bạn ơiii 🙈",
    "Bấm trúng mình tặng 1 ly trà sữa 🧋 (đùa đó)"
  ];

  let dodgeCount = 0;

  const dodge = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    dodgeCount++;
    runawayBtn.classList.add("teleporting");

    const msg = teaseMessages[dodgeCount % teaseMessages.length];
    runawayBtn.textContent = msg;

    const btnWidth = runawayBtn.offsetWidth || 140;
    const btnHeight = runawayBtn.offsetHeight || 44;
    const padding = 20;

    const maxLeft = window.innerWidth - btnWidth - padding;
    const maxTop = window.innerHeight - btnHeight - padding;

    const newLeft = Math.max(padding, Math.floor(Math.random() * maxLeft));
    const newTop = Math.max(padding, Math.floor(Math.random() * maxTop));

    runawayBtn.style.left = `${newLeft}px`;
    runawayBtn.style.top = `${newTop}px`;
  };

  // Chỉ né tránh và chạy nhảy khi người dùng THẬT SỰ NHẤN (click) vào nút
  runawayBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dodge(e);

    // Sau khi nhấn né 3 lần trở lên thì hiển thị popup meme vui nhộn
    if (dodgeCount >= 3 && memeModal) {
      setTimeout(() => {
        memeModal.classList.add("active");
      }, 350);
    }
  });

  if (closeMemeBtn && memeModal) {
    closeMemeBtn.addEventListener("click", () => {
      memeModal.classList.remove("active");
      const attendBtn = document.getElementById("btnAttend");
      if (attendBtn) attendBtn.click();
    });
  }
}

/**
 * Xử lý xác nhận RSVP (Chắc chắn tham gia)
 */
function initRsvpHandler(guestName, guestId) {
  const attendBtn = document.getElementById("btnAttend");
  const runawayBtn = document.getElementById("btnRunaway");
  const statusMsg = document.getElementById("rsvpStatusMessage");
  if (!attendBtn) return;

  const storageKey = `rsvp_${guestId}`;
  if (localStorage.getItem(storageKey) === "attending") {
    markAttendConfirmed(attendBtn, runawayBtn, statusMsg, true);
  }

  attendBtn.addEventListener("click", async () => {
    markAttendConfirmed(attendBtn, runawayBtn, statusMsg, false);
    triggerConfetti();
    localStorage.setItem(storageKey, "attending");

    // Gửi dữ liệu về Google Sheets
    if (CONFIG.googleSheetScriptUrl) {
      try {
        await postDataToGoogleSheets({
          action: "rsvp",
          guestName: guestName,
          guestId: guestId,
          status: "Chắc chắn tham gia"
        });
      } catch (err) {
        console.warn("Lỗi gửi RSVP:", err);
      }
    }
  });
}

function markAttendConfirmed(attendBtn, runawayBtn, statusMsg, isRestored) {
  attendBtn.classList.add("confirmed");
  attendBtn.innerHTML = `<span>✓ Đã xác nhận tham gia! Hẹn gặp bạn nhé! 🎉</span>`;
  if (runawayBtn) runawayBtn.style.display = "none";
  if (statusMsg) {
    statusMsg.style.display = "block";
    statusMsg.textContent = isRestored 
      ? "Bạn đã xác nhận tham gia sự kiện này rồi! ❤️" 
      : "Tuyệt vời quá! Sự hiện diện của bạn là niềm vui lớn nhất của mình! ❤️";
  }
}

/**
 * Xử lý gửi lời chúc riêng tư (Tự động dùng tên trong URL, không cần gõ lại)
 */
function initWishHandler(guestName, guestId) {
  const wishForm = document.getElementById("wishForm");
  const wishMessageInput = document.getElementById("wishMessage");
  const wishSubmitBtn = document.getElementById("btnSendWish");
  const wishSuccessBox = document.getElementById("wishSuccessBox");
  if (!wishForm || !wishSubmitBtn) return;

  wishForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const message = wishMessageInput.value.trim();
    if (!message) {
      wishMessageInput.focus();
      return;
    }

    wishSubmitBtn.disabled = true;
    const originalText = wishSubmitBtn.innerHTML;
    wishSubmitBtn.innerHTML = `<span class="spinner"></span> Đang gửi lời chúc...`;

    try {
      if (CONFIG.googleSheetScriptUrl) {
        await postDataToGoogleSheets({
          action: "wish",
          guestName: guestName,
          guestId: guestId,
          wish: message
        });
      }

      wishForm.style.display = "none";
      if (wishSuccessBox) {
        wishSuccessBox.style.display = "block";
      }
      triggerConfetti();

    } catch (err) {
      console.error("Lỗi gửi lời chúc:", err);
      alert("Có chút trục trặc khi gửi lời chúc, bạn thử lại nhé!");
      wishSubmitBtn.disabled = false;
      wishSubmitBtn.innerHTML = originalText;
    }
  });
}

/**
 * Hàm gửi dữ liệu về Google Apps Script
 */
async function postDataToGoogleSheets(payload) {
  if (!CONFIG.googleSheetScriptUrl) return;

  try {
    await fetch(CONFIG.googleSheetScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.warn("fetch failed:", e);
  }
}

/**
 * Hiệu ứng pháo giấy / lá rơi ăn mừng (Light Sage Green & Champagne Gold)
 */
function triggerConfetti() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#557A66", "#CDB375", "#8BAAA0", "#F7F1DF"]
    });
  }
}

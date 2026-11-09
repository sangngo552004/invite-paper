/**
 * GRADUATION INVITATION APPLICATION SCRIPT
 * Luxury Pastel Blue / Arch Editorial Edition
 */

let hasCachedConfig = false;
let isRemoteConfigReady = false;
let remoteConfigPromise = null;
let remoteSyncPromise = null;
let guestCustomTimeOverride = null;
let activeGuestName = "Anh / Chị / Bạn";
let activeGuestId = "";
let isDemoMode = false;

// Khởi chạy tải dữ liệu từ Google Sheets ngay lập tức khi nạp script (trước cả DOMContentLoaded)
// để giảm tối đa độ trễ mạng trên điện thoại di động.
if (typeof CONFIG !== "undefined" && CONFIG.googleSheetScriptUrl) {
  remoteConfigPromise = fetchRemoteSheetDataEarly();
}

async function fetchRemoteSheetDataEarly() {
  try {
    const fetchUrl = `${CONFIG.googleSheetScriptUrl}?action=getConfig&t=${Date.now()}`;
    const response = await fetch(fetchUrl);
    return await response.json();
  } catch (err) {
    console.warn("Không thể tải sớm cấu hình từ Google Sheets:", err);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Phân tích URL Parameters (?to=...&id=...&time=...)
  const urlParams = new URLSearchParams(window.location.search);
  const isPreview = urlParams.get("preview") === "true";
  const previewMode = urlParams.get("mode") || (isPreview ? "card" : "");
  const rawGuestName = urlParams.get("to");
  const guestId = urlParams.get("id");
  const customTime = urlParams.get("time");

  const isDemo = isPreview || guestId === "demo";
  isDemoMode = isDemo;

  // Rút gọn đường dẫn hiển thị trên thanh địa chỉ trình duyệt nếu có id (bỏ phần ?to=...&time=... dài dòng)
  if (!isPreview && guestId && (rawGuestName || customTime) && window.history && window.history.replaceState) {
    try {
      const cleanPath = window.location.pathname.replace(/\/index\.html$/i, "/");
      window.history.replaceState({}, "", `${cleanPath}?id=${encodeURIComponent(guestId)}`);
    } catch (e) { }
  }

  // 2. Tải cấu hình đã lưu (từ localStorage nếu có cache hoặc admin đã sửa)
  hasCachedConfig = loadLocalAdminConfig();

  // 3. KIỂM TRA BẢO MẬT KHÁCH MỜI (Guest Whitelist Verification)
  let authorizedList = [];
  try {
    const localAuthorized = localStorage.getItem("invitation_authorized_guests");
    if (localAuthorized) authorizedList = JSON.parse(localAuthorized);
  } catch (e) { }
  if (!authorizedList.length && CONFIG.authorizedGuests) {
    authorizedList = CONFIG.authorizedGuests;
  }

  let finalGuestName = rawGuestName ? decodeURIComponent(rawGuestName).trim() : (guestId ? "" : "Anh / Chị / Bạn");
  const finalGuestId = guestId || "guest_" + Math.random().toString(36).substring(2, 7);
  activeGuestId = finalGuestId;

  // Nếu hệ thống ĐÃ CÓ danh sách khách mời và KHÔNG phải màn hình Demo / Preview:
  if (!isDemo && authorizedList && authorizedList.length > 0) {
    const validGuest = guestId ? authorizedList.find(g => g.id === guestId) : null;

    if (!validGuest) {
      // Nếu chưa có trong cache local nhưng có kết nối Google Sheets, chờ kiểm tra lại khi tải xong guests_json
      if (!CONFIG.googleSheetScriptUrl) {
        showUnauthorizedScreen();
        return;
      }
    } else {
      // Dùng tên và giờ đã được lưu theo mã ID
      finalGuestName = validGuest.name;
      if (validGuest.time) {
        guestCustomTimeOverride = validGuest.time;
        CONFIG.ceremony.time = validGuest.time;
      }
    }
  } else if (customTime) {
    guestCustomTimeOverride = decodeURIComponent(customTime).trim();
    CONFIG.ceremony.time = guestCustomTimeOverride;
  }

  activeGuestName = finalGuestName || "Anh / Chị / Bạn";

  // Chỉ áp dụng ngay CONFIG nếu đã có dữ liệu thật trong bộ nhớ đệm (hoặc không dùng Google Sheet).
  // Tránh việc trên điện thoại lần đầu mở bị nháy tên mặc định và ảnh mẫu.
  if (hasCachedConfig || !CONFIG.googleSheetScriptUrl || isPreview) {
    applyConfigData(CONFIG);
    isRemoteConfigReady = true;
  }

  // 4. Khởi tạo giao diện
  if (finalGuestName) {
    initGuestDetails(finalGuestName, finalGuestId);
  }
  initAudioPlayer();
  initEnvelopeOpener();
  initCountdown();
  initCalendarLink();
  initCampusMapLightbox();
  initGalleryLightbox();
  initRsvpHandler(finalGuestName, finalGuestId);
  initWishHandler(finalGuestName, finalGuestId);
  initScrollReveal();
  initScrollParallax();
  initAmbientParticles();

  // 5. Nếu ở chế độ Preview (admin preview), ẩn thanh cuộn khung điện thoại và tự động mở phong bì khi xem ruột thiệp
  if (isPreview || window.self !== window.top) {
    document.documentElement.classList.add("is-iframe-preview");
  }
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
  remoteSyncPromise = loadRemoteConfigIfAvailable();
});

/**
 * Đọc cấu hình từ localStorage nếu có cache từ Google Sheets hoặc Admin Preview
 */
function loadLocalAdminConfig() {
  let loadedAny = false;
  try {
    // Ưu tiên đọc bản cache từ Google Sheets trên thiết bị của khách
    const cachedSheetConfig = localStorage.getItem("invitation_sheet_cache");
    if (cachedSheetConfig) {
      mergeConfig(JSON.parse(cachedSheetConfig));
      loadedAny = true;
    }
    // Nếu trên máy Admin có cấu hình chỉnh sửa trực tiếp thì đè lên
    const savedConfig = localStorage.getItem("invitation_admin_config");
    if (savedConfig) {
      mergeConfig(JSON.parse(savedConfig));
      loadedAny = true;
    }
  } catch (e) {
    console.warn("Không thể đọc cấu hình từ localStorage:", e);
  }
  return loadedAny;
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
  if (data.timeline && Array.isArray(data.timeline)) CONFIG.timeline = data.timeline;
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

  // Điền vào ô nhập tên RSVP nếu có tên cụ thể
  const rsvpNameInput = document.getElementById("rsvpGuestNameInput");
  if (rsvpNameInput && guestName && guestName !== "Anh / Chị / Bạn") {
    rsvpNameInput.value = guestName;
  }

  // Điền cố định vào lời chúc (người dùng không cần nhập lại tên)
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
    isRemoteConfigReady = true;
    return;
  }

  try {
    const json = remoteConfigPromise
      ? await remoteConfigPromise
      : await fetchRemoteSheetDataEarly();

    if (json && json.status === "success" && json.data) {
      const remote = json.data;

      let localCfg = null;
      try {
        const saved = localStorage.getItem("invitation_admin_config");
        if (saved) localCfg = JSON.parse(saved);
      } catch (e) { }

      const getVal = (remoteVal, localVal, defaultPlaceholder) => {
        if (!remoteVal) return localVal || defaultPlaceholder;
        if (remoteVal === defaultPlaceholder && localVal && localVal !== defaultPlaceholder) {
          return localVal;
        }
        return remoteVal;
      };

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
      if (sheetTime && !guestCustomTimeOverride) {
        CONFIG.ceremony.time = getVal(sheetTime, localCfg?.ceremony?.time, "08:30");
      }
      if (remote.venue_name) {
        CONFIG.ceremony.venueName = getVal(remote.venue_name, localCfg?.ceremony?.venueName, "Hội trường A5, Đại học Bách Khoa TP.HCM");
      }
      if (remote.address) {
        CONFIG.ceremony.address = getVal(remote.address, localCfg?.ceremony?.address, "268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM");
      }
      if (remote.maps_url) {
        CONFIG.ceremony.googleMapsUrl = getVal(remote.maps_url, localCfg?.ceremony?.googleMapsUrl, CONFIG.ceremony.googleMapsUrl);
      }
      if (remote.campus_map_url) {
        CONFIG.ceremony.campusMapUrl = normalizeDriveUrl(remote.campus_map_url);
      }
      if (remote.campus_map_note) {
        CONFIG.ceremony.campusMapNote = remote.campus_map_note;
      }
      if (remote.parking_note) {
        CONFIG.ceremony.parkingNote = remote.parking_note;
      }
      if (remote.contacts_json) {
        try {
          const parsedContacts = JSON.parse(remote.contacts_json);
          if (Array.isArray(parsedContacts) && parsedContacts.length > 0) {
            CONFIG.contacts = parsedContacts;
          }
        } catch (e) { }
      }
      if (remote.timeline_json) {
        try {
          const parsedTimeline = JSON.parse(remote.timeline_json);
          if (Array.isArray(parsedTimeline) && parsedTimeline.length > 0) {
            CONFIG.timeline = parsedTimeline;
          }
        } catch (e) { }
      }
      if (remote.guests_json) {
        try {
          const parsedGuests = JSON.parse(remote.guests_json);
          if (Array.isArray(parsedGuests)) {
            localStorage.setItem("invitation_authorized_guests", JSON.stringify(parsedGuests));

            if (!isDemoMode && parsedGuests.length > 0) {
              const urlParams = new URLSearchParams(window.location.search);
              const urlGuestId = urlParams.get("id");
              const matchedGuest = urlGuestId ? parsedGuests.find(g => g.id === urlGuestId) : null;

              if (!matchedGuest) {
                showUnauthorizedScreen();
                return;
              }

              activeGuestName = matchedGuest.name;
              initGuestDetails(matchedGuest.name, matchedGuest.id);
              if (matchedGuest.time) {
                guestCustomTimeOverride = matchedGuest.time;
                CONFIG.ceremony.time = matchedGuest.time;
              }
            }
          }
        } catch (e) { }
      }
      if (remote.music_url) {
        CONFIG.audio.url = normalizeDriveUrl(remote.music_url);
      }

      if (remote.photo_urls) {
        const remotePhotos = remote.photo_urls.split(",").map(url => normalizeDriveUrl(url.trim())).filter(Boolean);
        if (remotePhotos.length) {
          CONFIG.photos = remotePhotos;
        }
      }

      // Lưu cache dữ liệu từ Google Sheets vào thiết bị để các lần mở sau hiển thị tức thì (0ms)
      try {
        localStorage.setItem("invitation_sheet_cache", JSON.stringify({
          graduate: CONFIG.graduate,
          ceremony: CONFIG.ceremony,
          contacts: CONFIG.contacts,
          timeline: CONFIG.timeline,
          audio: CONFIG.audio,
          photos: CONFIG.photos
        }));
      } catch (e) { }

      // Tải trước các ảnh chính vào bộ nhớ đệm ngay khi khách đang ở màn hình phong bì
      preloadPhotos(CONFIG.photos);
    }
  } catch (err) {
    console.warn("Không thể tải cấu hình từ Google Sheets, dùng dữ liệu hiện tại:", err);
  }

  if (guestCustomTimeOverride) {
    CONFIG.ceremony.time = guestCustomTimeOverride;
  }
  applyConfigData(CONFIG);
  isRemoteConfigReady = true;
}

/**
 * Tải trước hình ảnh vào bộ nhớ trình duyệt khi khách đang xem phong bì ngoài
 */
function preloadPhotos(photos) {
  if (!Array.isArray(photos)) return;
  photos.slice(0, 4).forEach(url => {
    const cleanUrl = normalizeDriveUrl(url);
    if (cleanUrl) {
      const img = new Image();
      img.src = cleanUrl;
    }
  });
}

function showUnauthorizedScreen() {
  const unauthScreen = document.getElementById("unauthorizedScreen");
  const envelopeScreen = document.getElementById("envelopeScreen");
  const mainWrapper = document.querySelector(".landing-page-container") || document.querySelector(".main-wrapper");

  if (unauthScreen) unauthScreen.style.display = "flex";
  if (envelopeScreen) envelopeScreen.style.display = "none";
  if (mainWrapper) mainWrapper.style.display = "none";
}

/**
 * Cập nhật dữ liệu từ đối tượng CONFIG lên toàn bộ giao diện HTML
 */
function applyConfigData(config) {
  // 1. Tên cử nhân (Chủ tiệc)
  const fullName = config.graduate.fullName || "Nguyễn Kim Ngân";
  setElementText("graduateFullName", fullName);
  setElementText("envelopeInnerGradName", fullName);
  const nameParts = fullName.trim().split(/\s+/);
  const shortName = nameParts.length > 0 ? nameParts[nameParts.length - 1] : "Ngân";
  setElementText("graduateShortName", shortName);
  setElementText("rsvpGraduateName", shortName);
  setElementText("rsvpHostName", shortName);

  // 2. Phân tích ngày giờ
  let ceremonyDate = new Date(config.ceremony.dateTime);
  if (isNaN(ceremonyDate.getTime())) ceremonyDate = new Date("2026-11-20T08:30:00");

  const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dayOfWeekStr = daysOfWeek[ceremonyDate.getDay()];
  const dayNumStr = String(ceremonyDate.getDate()).padStart(2, "0");
  const monthNum = ceremonyDate.getMonth() + 1;
  const monthStr = `Tháng ${monthNum}`;
  const yearStr = `Năm ${ceremonyDate.getFullYear()}`;
  const heroDateStr = `${dayNumStr}.${String(monthNum).padStart(2, "0")}.${ceremonyDate.getFullYear()}`;

  setElementText("ceremonyDayOfWeek", dayOfWeekStr);
  setElementText("ceremonyMonth", monthStr);
  setElementText("ceremonyDayNum", dayNumStr);
  setElementText("ceremonyYear", yearStr);
  setElementText("ceremonyTimeFormatted", config.ceremony.time || "08:30");
  setElementText("heroCeremonyDate", heroDateStr);

  // 3. Địa điểm
  setElementText("ceremonyVenueName", config.ceremony.venueName);
  setElementText("ceremonyAddress", config.ceremony.address);

  // 4. Google Maps link
  const mapsBtn = document.getElementById("btnGoogleMaps");
  if (mapsBtn && config.ceremony.googleMapsUrl) {
    mapsBtn.href = config.ceremony.googleMapsUrl;
  }

  // 5. Cài đặt 8 ảnh cố định theo bố cục
  setupFixedPhotos(config.photos);

  // 6. Hiển thị timeline chương trình
  renderTimeline(config.timeline);

  // 7. Hiển thị lịch tháng mini có trái tim ngày lễ
  renderMiniCalendar(config.ceremony.dateTime);

  // 8. Danh sách người liên hệ đón khách
  renderFooterContacts(config.contacts || config.contact);

  // 9. Sơ đồ trường & Hướng dẫn di chuyển nội bộ
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

  // 10. Cập nhật lại Calendar link & Countdown
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
 * Cài đặt 8 ảnh cố định theo đúng bố cục (Hero Arch, Portrait, Timeline, Album 5 ảnh)
 */
function setupFixedPhotos(photos) {
  const validPhotos = (photos || []).map(normalizeDriveUrl).filter(Boolean);
  const photoSlots = [
    { id: "heroPhotoImg", default: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop" },
    { id: "portraitPhotoImg", default: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop" },
    { id: "timelinePhotoImg", default: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1000&auto=format&fit=crop" },
    { id: "albumPhotoTop", default: "https://images.unsplash.com/photo-1525921429624-479b6a26d84d?q=80&w=1000&auto=format&fit=crop" },
    { id: "albumPhotoGrid1", default: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=800&auto=format&fit=crop" },
    { id: "albumPhotoGrid2", default: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop" },
    { id: "albumPhotoGrid3", default: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop" },
    { id: "albumPhotoGrid4", default: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=800&auto=format&fit=crop" }
  ];

  photoSlots.forEach((slot, idx) => {
    const imgEl = document.getElementById(slot.id);
    if (imgEl) {
      imgEl.src = validPhotos[idx] || slot.default;
    }
  });

  // Ảnh nền mờ ở Footer lấy từ ảnh đầu tiên hoặc ảnh album
  const footerBackdropImg = document.getElementById("footerBackdropImg");
  if (footerBackdropImg) {
    footerBackdropImg.src = validPhotos[0] || photoSlots[0].default;
  }
}

/**
 * Khởi tạo Timeline sự kiện (Khớp chuẩn icon cổng vòm trái tim & máy ảnh mẫu Canva)
 */
function renderTimeline(timelineData) {
  const wrap = document.getElementById("timelineNodesWrap");
  if (!wrap) return;

  const items = (timelineData && timelineData.length) ? timelineData : [
    { time: "8:00", title: "Làm lễ", icon: "ceremony" },
    { time: "10:00", title: "Chụp ảnh", icon: "camera" }
  ];

  wrap.innerHTML = '<div class="timeline-vertical-line"></div>';

  items.forEach((item, index) => {
    const isReverse = index % 2 !== 0;
    const row = document.createElement("div");
    row.className = `timeline-item-row ${isReverse ? "reverse" : ""}`;

    const iconSvg = item.icon === "camera"
      ? `<svg width="46" height="46" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
           <rect x="6" y="13" width="36" height="26" rx="5"></rect>
           <path d="M16 13l3-5h10l3 5"></path>
           <circle cx="24" cy="26" r="7.5"></circle>
           <circle cx="24" cy="26" r="3.5"></circle>
           <circle cx="35" cy="19" r="1.5" fill="currentColor"></circle>
         </svg>`
      : `<svg width="52" height="52" viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
           <path d="M8 18L28 8L48 18H8Z"></path>
           <path d="M11 18H45V22H11V18Z"></path>
           <line x1="8" y1="46" x2="48" y2="46"></line>
           <path d="M13 22V46"></path>
           <path d="M43 22V46"></path>
           <path d="M13 22C19 28 21 35 17 46"></path>
           <path d="M43 22C37 28 35 35 39 46"></path>
           <path d="M28 39.5C28 39.5 22 35.2 22 31.5C22 29.4 23.7 28 25.5 28C26.7 28 27.5 28.6 28 29.5C28.5 28.6 29.3 28 30.5 28C32.3 28 34 29.4 34 31.5C34 35.2 28 39.5 28 39.5Z"></path>
         </svg>`;

    row.innerHTML = `
      <div class="timeline-icon-side">
        <div class="timeline-icon-clean">${iconSvg}</div>
      </div>
      <div class="timeline-center-dot"></div>
      <div class="timeline-text-side">
        <div class="timeline-time-val">${escapeHtml(item.time)}</div>
        <div class="timeline-name-val">${escapeHtml(item.title)}</div>
      </div>
    `;
    wrap.appendChild(row);
  });
}

/**
 * Hiển thị Lịch Tháng Mini có trái tim đánh dấu ngày lễ
 */
function renderMiniCalendar(dateTimeStr) {
  const titleEl = document.getElementById("calendarWidgetMonthTitle");
  const container = document.getElementById("miniCalendarContainer");
  if (!container) return;

  let date = new Date(dateTimeStr);
  if (isNaN(date.getTime())) date = new Date("2026-11-20T08:30:00");

  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const eventDay = date.getDate();

  if (titleEl) {
    titleEl.textContent = `Tháng ${month + 1}`;
  }

  // Thứ của ngày 1 trong tháng (0 = CN, 1 = T2, ...)
  const firstDayRaw = new Date(year, month, 1).getDay();
  // Chuyển sang dạng T2 = 0, CN = 6
  const firstDayIdx = (firstDayRaw === 0) ? 6 : firstDayRaw - 1;

  // Tổng số ngày trong tháng
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = `
    <table class="mini-calendar-table">
      <thead>
        <tr>
          <th>T2</th><th>T3</th><th>T4</th><th>T5</th><th>T6</th><th>T7</th><th>CN</th>
        </tr>
      </thead>
      <tbody><tr>
  `;

  // Các ô trống đầu tháng
  for (let i = 0; i < firstDayIdx; i++) {
    html += '<td></td>';
  }

  let currentCellCount = firstDayIdx;
  for (let d = 1; d <= daysInMonth; d++) {
    if (currentCellCount > 0 && currentCellCount % 7 === 0) {
      html += '</tr><tr>';
    }

    if (d === eventDay) {
      html += `<td><span class="calendar-heart-highlight">${d}</span></td>`;
    } else {
      html += `<td>${d}</td>`;
    }
    currentCellCount++;
  }

  // Các ô trống cuối tháng
  while (currentCellCount % 7 !== 0) {
    html += '<td></td>';
    currentCellCount++;
  }

  html += '</tr></tbody></table>';
  container.innerHTML = html;
}

/**
 * Hiển thị danh sách người liên hệ đón khách
 */
function renderFooterContacts(contactsData) {
  const container = document.getElementById("footerContactsList");
  if (!container) return;

  let list = [];
  if (Array.isArray(contactsData) && contactsData.length > 0) {
    list = contactsData;
  } else if (CONFIG.contacts && Array.isArray(CONFIG.contacts) && CONFIG.contacts.length > 0) {
    list = CONFIG.contacts;
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
    row.className = "contact-card-item";

    let actionsHtml = "";
    if (cleanPhone) {
      actionsHtml = `
        <div class="contact-actions-pair">
          <a href="tel:${cleanPhone}" class="btn-contact-action btn-contact-call" title="Gọi cho ${escapeHtml(name)}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <span>Gọi</span>
          </a>
          <a href="https://zalo.me/${cleanPhone}" target="_blank" rel="noopener noreferrer" class="btn-contact-action btn-contact-zalo" title="Nhắn Zalo cho ${escapeHtml(name)}">
            <span>Zalo</span>
          </a>
        </div>
      `;
    }

    row.innerHTML = `
      <div class="contact-person-info">
        <div class="contact-person-name">${escapeHtml(name)}</div>
        ${phone ? `<div class="contact-person-phone">${escapeHtml(phone)}</div>` : ""}
      </div>
      ${actionsHtml}
    `;
    container.appendChild(row);
  });
}

/**
 * Xử lý mở phong bì thư (Hiệu ứng mở nắp 3D, rút thiệp lên mượt mà & tung pháo hoa)
 */
function initEnvelopeOpener() {
  const envelopeScreen = document.getElementById("envelopeScreen");
  const waxSeal = document.getElementById("waxSeal");
  const envelopeBody = document.getElementById("envelopeBody");
  if (!envelopeScreen) return;

  let isOpening = false;
  const openEnvelope = async () => {
    if (isOpening) return;
    isOpening = true;

    // Kích hoạt âm thanh ngay trong sự kiện chạm của người dùng để trình duyệt điện thoại không chặn autoplay
    if (CONFIG.audio.enabled && CONFIG.audio.autoPlayOnOpen) {
      playAudio();
    }

    // Nếu mở trên điện thoại lần đầu tiên và dữ liệu từ Google Sheets đang tải dở,
    // đợi tối đa 2.5s cho dữ liệu về xong rồi mới rút ruột thiệp lên để không bao giờ bị nháy tên/ảnh mặc định.
    const pendingSync = remoteSyncPromise || remoteConfigPromise;
    if (!isRemoteConfigReady && pendingSync) {
      const openTextEl = envelopeScreen.querySelector(".envelope-open-text");
      if (openTextEl) openTextEl.textContent = "Đang mở thiệp...";
      await Promise.race([
        pendingSync,
        new Promise(resolve => setTimeout(resolve, 2500))
      ]);
      // Đảm bảo dữ liệu đã được áp dụng lên DOM
      if (!isRemoteConfigReady) {
        applyConfigData(CONFIG);
      }
    }

    // Giai đoạn 1: Nắp mở xoay 3D ra phía sau và tấm thiệp trượt lên trên nền kem rõ nét
    envelopeScreen.classList.add("unsealing");

    // Giai đoạn 2: Chuyển cảnh mượt mà vào nội dung thiệp chính và tung pháo giấy
    setTimeout(() => {
      envelopeScreen.classList.add("opened");
      triggerConfetti();
      initScrollReveal();
    }, 900);
  };

  if (waxSeal) waxSeal.addEventListener("click", openEnvelope);
  if (envelopeBody) envelopeBody.addEventListener("click", openEnvelope);
}

/**
 * Hiệu ứng Scroll Reveal đa hướng (Cuộn tới đâu các thành phần xuất hiện mượt mà, không gây tràn khung)
 */
function initScrollReveal() {
  const elements = document.querySelectorAll(".anim-on-scroll, .reveal-on-scroll");
  if (!elements.length) return;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: "0px 0px -30px 0px"
    });

    elements.forEach(el => observer.observe(el));
  } else {
    elements.forEach(el => el.classList.add("is-revealed"));
  }
}

/**
 * Hiệu ứng Parallax nhẹ nhàng cho các khung ảnh lớn khi cuộn trang
 */
function initScrollParallax() {
  const parallaxImages = document.querySelectorAll(".parallax-img");
  if (!parallaxImages.length) return;

  let ticking = false;
  const updateParallax = () => {
    const vh = window.innerHeight || 800;
    parallaxImages.forEach(img => {
      const rect = img.parentElement.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < vh) {
        const progress = (vh - rect.top) / (vh + rect.height);
        const shift = (progress - 0.5) * -26;
        img.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0) scale(1.04)`;
      }
    });
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });

  updateParallax();
}

/**
 * Hiệu ứng Cánh Hoa Rơi & Ánh Sao Vàng Kim Lấp Lánh (Rõ Nét, Sang Trọng)
 */
function initAmbientParticles() {
  const canvas = document.getElementById("ambientCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particleCount = Math.min(44, Math.max(26, Math.floor(width / 28)));
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const type = i % 3 === 0 ? "petal-rose" : (i % 3 === 1 ? "petal-wine" : "sparkle-gold");
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: type === "sparkle-gold" ? (Math.random() * 4.5 + 4) : (Math.random() * 5.5 + 6.5),
      vx: (Math.random() - 0.5) * 0.55,
      vy: Math.random() * 0.75 + 0.45,
      alpha: Math.random() * 0.3 + 0.62,
      phase: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.03,
      rotation: Math.random() * Math.PI * 2,
      type
    };
  });

  function drawPetal(ctx, size, fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.95, -size * 0.75, size * 0.85, size * 0.65, 0, size);
    ctx.bezierCurveTo(-size * 0.85, size * 0.65, -size * 0.95, -size * 0.75, 0, -size);
    ctx.closePath();
    ctx.fill();
  }

  function drawStarSparkle(ctx, size, alpha) {
    ctx.fillStyle = `rgba(218, 170, 72, ${alpha})`;
    ctx.shadowColor = "rgba(218, 170, 72, 0.85)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    const inner = size * 0.28;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const nextAngle = angle + Math.PI / 4;
      ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
      ctx.lineTo(Math.cos(nextAngle) * inner, Math.sin(nextAngle) * inner);
    }
    ctx.closePath();
    ctx.fill();
  }

  function renderFrame() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.phase += 0.024;
      p.rotation += p.spinSpeed;
      p.x += p.vx + Math.sin(p.phase) * 0.45;
      p.y += p.vy;

      if (p.y > height + 18) {
        p.y = -16;
        p.x = Math.random() * width;
      }
      if (p.x > width + 18) p.x = -14;
      if (p.x < -18) p.x = width + 14;

      const twinkle = p.alpha * (0.75 + 0.25 * Math.sin(p.phase * 1.6));
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === "petal-rose") {
        ctx.scale(1, 0.75 + 0.25 * Math.cos(p.phase));
        drawPetal(ctx, p.size, `rgba(224, 122, 142, ${twinkle * 0.85})`);
      } else if (p.type === "petal-wine") {
        ctx.scale(1, 0.75 + 0.25 * Math.sin(p.phase));
        drawPetal(ctx, p.size * 0.9, `rgba(136, 26, 42, ${twinkle * 0.72})`);
      } else {
        drawStarSparkle(ctx, p.size, twinkle);
      }
      ctx.restore();
    });

    requestAnimationFrame(renderFrame);
  }

  requestAnimationFrame(renderFrame);
}

/**
 * Lightbox xem phóng to 5 ảnh trong Album Graduation
 */
function initGalleryLightbox() {
  const modal = document.getElementById("photoLightboxModal");
  const lightboxImg = document.getElementById("photoLightboxImg");
  const closeBtn = document.getElementById("btnCloseLightbox");
  const prevBtn = document.getElementById("btnPrevLightbox");
  const nextBtn = document.getElementById("btnNextLightbox");
  const backdrop = document.getElementById("photoLightboxBackdrop");
  const slots = document.querySelectorAll("[data-lightbox-slot]");
  if (!modal || !lightboxImg || !slots.length) return;

  let currentIdx = 0;

  const getSlotSrc = (idx) => {
    const slot = document.querySelector(`[data-lightbox-slot="${idx}"] img`);
    return slot ? slot.src : "";
  };

  const openAt = (idx) => {
    currentIdx = (idx + slots.length) % slots.length;
    const src = getSlotSrc(currentIdx);
    if (!src) return;
    lightboxImg.src = src;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  slots.forEach(slot => {
    slot.addEventListener("click", () => {
      const idx = parseInt(slot.getAttribute("data-lightbox-slot"), 10) || 0;
      openAt(idx);
    });
  });

  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (backdrop) backdrop.addEventListener("click", closeLightbox);
  if (prevBtn) prevBtn.addEventListener("click", () => openAt(currentIdx - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => openAt(currentIdx + 1));

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("active")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") openAt(currentIdx - 1);
    if (e.key === "ArrowRight") openAt(currentIdx + 1);
  });
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

    daysEl.textContent = String(days);
    hoursEl.textContent = String(hours).padStart(2, "0");
    minsEl.textContent = String(minutes).padStart(2, "0");
    secsEl.textContent = String(seconds).padStart(2, "0");
  }

  update();
  countdownTimer = setInterval(update, 1000);
}

/**
 * Tạo link thêm vào Google Calendar
 */
function initCalendarLink() {
  const calendarBtn = document.getElementById("btnGoogleCalendar");
  if (!calendarBtn) return;

  try {
    const startObj = new Date(CONFIG.ceremony.dateTime);
    if (isNaN(startObj.getTime())) return;

    const endObj = new Date(startObj.getTime() + 2 * 60 * 60 * 1000);

    const fmt = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const datesParam = `${fmt(startObj)}/${fmt(endObj)}`;

    const title = encodeURIComponent(CONFIG.ceremony.calendarTitle || "Lễ Tốt Nghiệp Đại Học 🎓");
    const details = encodeURIComponent(CONFIG.ceremony.calendarDetails || "Chung vui trong buổi lễ tốt nghiệp!");
    const location = encodeURIComponent(`${CONFIG.ceremony.venueName}, ${CONFIG.ceremony.address}`);

    calendarBtn.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
  } catch (e) {
    console.error("Lỗi tạo calendar link:", e);
  }
}

/**
 * Quản lý mở / đóng Modal phóng to Sơ đồ di chuyển trong trường & Gửi xe
 */
function initCampusMapLightbox() {
  const btnTrigger = document.getElementById("btnOpenCampusMap");
  const inlineTrigger = document.getElementById("campusMapTrigger");
  const modal = document.getElementById("campusMapModal");
  const closeBtn = document.getElementById("btnCloseCampusMap");
  const backdrop = document.getElementById("campusMapModalBackdrop");

  if (!modal) return;

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

  if (btnTrigger) btnTrigger.addEventListener("click", openModal);
  if (inlineTrigger) {
    inlineTrigger.addEventListener("click", openModal);
    inlineTrigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal();
      }
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (backdrop) backdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) {
      closeModal();
    }
  });
}

/**
 * Xử lý xác nhận RSVP (Lịch sự, trang nhã cho cả 2 lựa chọn Tham dự / Bận)
 */
function initRsvpHandler(guestName, guestId) {
  const attendBtn = document.getElementById("btnAttend");
  const declineBtn = document.getElementById("btnDecline") || document.getElementById("btnRunaway");
  const submitBtn = document.getElementById("btnSubmitRsvp");
  const nameInput = document.getElementById("rsvpGuestNameInput");
  const statusMsg = document.getElementById("rsvpStatusMessage");
  if (!attendBtn) return;

  let currentChoice = "attending"; // Mặc định chọn "Có, tôi sẽ tham dự"

  const selectChoice = (choice) => {
    currentChoice = choice;
    if (choice === "attending") {
      attendBtn.classList.add("selected");
      if (declineBtn) declineBtn.classList.remove("selected");
    } else {
      attendBtn.classList.remove("selected");
      if (declineBtn) declineBtn.classList.add("selected");
    }
  };

  const storageKey = `rsvp_${guestId}`;
  const savedChoice = localStorage.getItem(storageKey);
  if (savedChoice === "attending" || savedChoice === "declined") {
    selectChoice(savedChoice);
    markRsvpConfirmed(savedChoice, submitBtn, statusMsg, true);
  }

  // Bấm chọn tham gia hoặc báo bận
  attendBtn.addEventListener("click", () => selectChoice("attending"));
  if (declineBtn) {
    declineBtn.addEventListener("click", () => selectChoice("declined"));
  }

  // Bấm nút "Gửi xác nhận"
  const handleSubmit = async () => {
    const effectiveName = (nameInput && nameInput.value.trim()) ? nameInput.value.trim() : (activeGuestName || guestName);
    const isAttending = currentChoice === "attending";

    markRsvpConfirmed(currentChoice, submitBtn, statusMsg, false);
    if (isAttending) {
      triggerConfetti();
    }
    localStorage.setItem(storageKey, currentChoice);

    // Gửi dữ liệu về Google Sheets
    if (CONFIG.googleSheetScriptUrl) {
      try {
        await postDataToGoogleSheets({
          action: "rsvp",
          guestName: effectiveName,
          guestId: guestId,
          guestsCount: isAttending ? 1 : 0,
          status: isAttending ? "Chắc chắn tham gia" : "Không thể tham dự"
        });
      } catch (err) {
        console.warn("Lỗi gửi RSVP:", err);
      }
    }
  };

  if (submitBtn) {
    submitBtn.addEventListener("click", handleSubmit);
  }
}

function markRsvpConfirmed(choice, submitBtn, statusMsg, isRestored) {
  const isAttending = choice === "attending";
  if (submitBtn) {
    submitBtn.innerHTML = isAttending
      ? `<span>✓ Đã xác nhận tham dự</span>`
      : `<span>✓ Đã gửi phản hồi</span>`;
    submitBtn.style.background = isAttending ? "#2E7D32" : "#685053";
  }
  if (statusMsg) {
    statusMsg.style.display = "block";
    statusMsg.style.color = isAttending ? "#2E7D32" : "var(--primary-red)";
    if (isAttending) {
      statusMsg.textContent = isRestored
        ? "Bạn đã gửi xác nhận tham dự rồi nhé, cảm ơn bạn rất nhiều! ❤️"
        : "Tuyệt vời quá! Sự hiện diện của bạn là niềm vui lớn nhất của mình! ❤️";
    } else {
      statusMsg.textContent = "Cảm ơn bạn đã phản hồi! Rất tiếc vì chưa thể gặp bạn dịp này, hẹn gặp bạn một dịp gần nhất nhé! ❤️";
    }
  }
}

/**
 * Xử lý gửi lời chúc riêng tư
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
          guestName: activeGuestName || guestName,
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
 * Hiệu ứng pháo giấy ăn mừng (Burgundy Red & Champagne Gold & Rose White)
 */
function triggerConfetti() {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
      colors: ["#731823", "#D1A858", "#B78D38", "#FFFFFF", "#F6EBEB"]
    });
  }
}

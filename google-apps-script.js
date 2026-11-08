/**
 * GOOGLE APPS SCRIPT CHO THIỆP MỜI TỐT NGHIỆP
 * Hỗ trợ Đọc/Ghi Cấu Hình & Lưu Trữ RSVP + Lời Chúc Riêng Tư
 */

var SHEET_CONFIG_NAME = "Config";
var SHEET_RESPONSES_NAME = "Responses";

/**
 * Xử lý yêu cầu GET (Đọc cấu hình hoặc kiểm tra kết nối)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "test";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupInitialSheets(ss);

  if (action === "getConfig") {
    var configData = readConfigFromSheet(ss);
    return createJsonResponse({
      status: "success",
      data: configData
    });
  }

  return createJsonResponse({
    status: "online",
    message: "Google Apps Script Thiệp Mời Tốt Nghiệp đang hoạt động bình thường! 🎓"
  });
}

/**
 * Xử lý yêu cầu POST (Lưu RSVP, Lời chúc, hoặc Lưu Cấu Hình từ Admin)
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    setupInitialSheets(ss);

    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

    var action = (data.action || "").toLowerCase();

    // 1. Lưu Cấu Hình Từ Admin (saveConfig)
    if (action === "saveconfig") {
      saveConfigToSheet(ss, data.config || {});
      return createJsonResponse({
        status: "success",
        message: "Đã cập nhật cấu hình vào Google Sheets thành công!"
      });
    }

    // 2. Lưu RSVP hoặc Lời Chúc Riêng Tư
    var responseSheet = ss.getSheetByName(SHEET_RESPONSES_NAME);
    var timestamp = new Date();
    var guestName = data.guestName || "Khách mời";
    var guestId = data.guestId || "Chưa có mã";
    var status = data.status || "";
    var wishMessage = data.wish || "";

    var rowData = [
      Utilities.formatDate(timestamp, "GMT+7", "yyyy-MM-dd HH:mm:ss"),
      action.toUpperCase(),
      guestName,
      guestId,
      status,
      wishMessage
    ];

    responseSheet.appendRow(rowData);

    return createJsonResponse({
      status: "success",
      message: action === "wish" ? "Lời chúc đã được lưu riêng tư thành công!" : "Xác nhận tham gia thành công!"
    });

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

/**
 * Đọc toàn bộ cặp Key - Value từ tab Config
 */
function readConfigFromSheet(ss) {
  var sheet = ss.getSheetByName(SHEET_CONFIG_NAME);
  var values = sheet.getDataRange().getValues();
  var config = {};

  for (var i = 1; i < values.length; i++) {
    var key = values[i][0];
    var val = values[i][1];
    if (key) {
      config[key.toString().trim()] = val;
    }
  }
  return config;
}

/**
 * Lưu/Ghi đè cấu hình mới vào tab Config
 */
function saveConfigToSheet(ss, newConfig) {
  var sheet = ss.getSheetByName(SHEET_CONFIG_NAME);
  var values = sheet.getDataRange().getValues();
  var existingKeys = {};

  for (var i = 1; i < values.length; i++) {
    var key = values[i][0] ? values[i][0].toString().trim() : "";
    if (key) {
      existingKeys[key] = i + 1;
    }
  }

  for (var k in newConfig) {
    if (newConfig.hasOwnProperty(k)) {
      var val = newConfig[k];
      if (existingKeys[k]) {
        sheet.getRange(existingKeys[k], 2).setValue(val);
      } else {
        sheet.appendRow([k, val, "Cấu hình tùy chỉnh"]);
      }
    }
  }
}

/**
 * Tự động tạo và điền dữ liệu mẫu cho tab Config và Responses nếu chưa tồn tại
 */
function setupInitialSheets(ss) {
  var configSheet = ss.getSheetByName(SHEET_CONFIG_NAME);
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEET_CONFIG_NAME);
    var defaultConfigs = [
      ["Key (Mã cấu hình)", "Value (Giá trị của bạn)", "Chú thích"],
      ["graduate_name", "Nguyễn Văn A", "Họ và tên cử nhân"],
      ["degree_title", "Cử nhân Công nghệ Thông tin", "Ngành học/Bằng cấp"],
      ["university", "Đại học Bách Khoa - ĐHQG TP.HCM", "Tên trường đại học"],
      ["ceremony_date", "2026-11-20T08:30:00", "Thời gian làm lễ (YYYY-MM-DDTHH:mm:ss)"],
      ["time", "08:30", "Giờ mời làm lễ cố định"],
      ["date_formatted", "Thứ Sáu, 20 Tháng 11, 2026", "Ngày hiển thị trên thiệp"],
      ["venue_name", "Hội trường A5, Đại học Bách Khoa TP.HCM", "Tên hội trường/Địa điểm"],
      ["address", "268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM", "Địa chỉ chi tiết"],
      ["maps_url", "https://maps.google.com/?q=268+Lý+Thường+Kiệt+Phường+14+Quận+10+Hồ+Chí+Minh", "Link Google Maps"],
      ["photo_urls", "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000", "Link ảnh cử nhân"],
      ["contact_phone", "0901 234 567", "Số điện thoại liên hệ (đồng thời là Zalo)"],
      ["contact_person", "Nguyễn Văn A", "Tên người liên hệ nghe máy đón tiếp"],
      ["music_url", "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=graduation-day-piano-112190.mp3", "Link bài hát"]
    ];
    configSheet.getRange(1, 1, defaultConfigs.length, 3).setValues(defaultConfigs);
    configSheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#DFEAE3");
    configSheet.autoResizeColumns(1, 3);
  }

  var responseSheet = ss.getSheetByName(SHEET_RESPONSES_NAME);
  if (!responseSheet) {
    responseSheet = ss.insertSheet(SHEET_RESPONSES_NAME);
    var headers = [["Thời gian", "Loại", "Tên Khách Mời", "Mã Guest ID", "Trạng Thái Tham Gia", "Lời Chúc Riêng Tư"]];
    responseSheet.getRange(1, 1, 1, 6).setValues(headers);
    responseSheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#DFEAE3");
    responseSheet.autoResizeColumns(1, 6);
  }
}

/**
 * Trả về JSON cho Client với header cho phép CORS
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

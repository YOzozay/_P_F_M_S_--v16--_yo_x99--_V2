// ✅ ใส่ลิงก์ API ของคุณตรงนี้
const API_URL = "https://script.google.com/macros/s/AKfycbzrgPzpYoZIgFdVXBqdr_owzc-lnp_gEg1vur3B9gJO_nloUwW6Wxb_s4RjoIRMQY58/exec";

// 📦 ตัวแปรเก็บข้อมูลชั่วคราว (Cache)
let apiCache = {};

export const apiGet = async (params) => {
  // สร้าง Key สำหรับจำข้อมูล เช่น '{"action":"getCarLoans"}'
  const cacheKey = JSON.stringify(params);

  // ⚡ 1. ถ้ามีข้อมูลในแคชแล้ว ให้ส่งคืนเลยทันที (ไม่ต้องวิ่งไป Google Sheets)
  if (apiCache[cacheKey]) {
    console.log("⚡ โหลดจาก Cache:", params.action);
    return apiCache[cacheKey];
  }

  // ☁️ 2. ถ้ายังไม่มีในแคช ให้วิ่งไปดึงจาก Google Sheets
  console.log("☁️ โหลดจาก Google Sheets:", params.action);
  const url = new URL(API_URL);
  Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    // 💾 3. เก็บข้อมูลที่ได้ ลงในแคชเพื่อใช้รอบหน้า
    if (!data.error) {
      apiCache[cacheKey] = data;
    }
    return data;
  } catch (err) {
    console.error("API GET Error:", err);
    return { error: err.message };
  }
};

export const apiPost = async (payload) => {
  // 🗑️ สำคัญมาก: เวลามีการ เพิ่ม/ลบ/จ่ายเงิน ข้อมูลจะเปลี่ยน
  // เราต้อง "ล้างแคชทิ้ง" ทั้งหมด เพื่อให้การเปลี่ยนหน้าครั้งต่อไปไปดึงข้อมูลใหม่
  apiCache = {}; 
  console.log("🗑️ ล้าง Cache เพราะมีการทำรายการ:", payload.action);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.json();
  } catch (err) {
    console.error("API POST Error:", err);
    return { error: err.message };
  }
};

export const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// (Optional) ฟังก์ชันสำหรับสั่งล้างแคชด้วยตัวเอง ถ้าต้องการใช้ในอนาคต
export const clearCache = () => {
  apiCache = {};
};
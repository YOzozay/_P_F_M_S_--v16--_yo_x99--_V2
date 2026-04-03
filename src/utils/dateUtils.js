export const getPayMonth = () => { 
  const d = new Date(); 
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; 
};

export const getToday = () => { 
  const d = new Date(); 
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; 
};

export const MON = { "01":"ม.ค.","02":"ก.พ.","03":"มี.ค.","04":"เม.ย.","05":"พ.ค.","06":"มิ.ย.","07":"ก.ค.","08":"ส.ค.","09":"ก.ย.","10":"ต.ค.","11":"พ.ย.","12":"ธ.ค." };
export const MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];


/***********************
 * เตรียม canvas + รองรับ high-DPI (Retina)
 ***********************/
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

// ปรับขนาด canvas ให้รองรับ devicePixelRatio (เพื่อความคมชัด)
function fitToContainer() {
  // อ่านขนาดที่แสดง (CSS px)
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  const ratio = window.devicePixelRatio || 1;

  // กำหนดขนาด bitmap เป็น CSS*ratio เพื่อให้คมบนหน้าจอความละเอียดสูง
  canvas.width = Math.max(1, Math.floor(cssWidth * ratio));
  canvas.height = Math.max(1, Math.floor(cssHeight * ratio));

  // ทำให้การวาดใช้หน่วยเป็น CSS px (กำหนด transform)
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

// เรียกครั้งแรก
fitToContainer();
// รีสไตล์เมื่อเปลี่ยนขนาดหน้าจอ
window.addEventListener('resize', () => {
  fitToContainer();
});

/***********************
 * พารามิเตอร์แอนิเมชัน และสถานะ
 ***********************/
let t = 0;                // เวลา/เฟรม (ใช้สำหรับอนิเมชัน)
let waterOffset = 0;      // offset สำหรับไล่สีแม่น้ำ (ทำให้ดูไหล)
const clouds = [          // ข้อมูลเมฆ: x, y, speed, scale
  { x: 100, y: 80, speed: 55, s: 1.0 },
  { x: 420, y: 60, speed: 0.16, s: 0.9 },
  { x: 720, y: 95, speed: 0.18, s: 1.1 }
];

/***********************
 * ฟังก์ชันวาดองค์ประกอบ (เรียกภายใน loop)
 ***********************/

/* --- Sky: ไล่สี และ overlay สำหรับเปลี่ยนแสง (เช้า->เย็น) --- */
function drawSky(width, height) {
  // คำนวณ factor สำหรับเปลี่ยนแสงตามเวลา (ค่าระหว่าง 0..1)
  // ใช้ sin เพื่อให้วนรอบแบบนุ่ม (t เพิ่มเรื่อย ๆ)
  const dayFactor = (Math.sin(t * 0.0008) + 1) / 2; // 0..1 (ช้า)
  // ปรับสีฟ้าตามค่า dayFactor: ค่ามาก = กลางวัน (ฟ้าสด), ค่าน้อย = เย็น (อมส้ม)
  // เราจะแปลงเป็น RGBA/HEX โดยการผสมสีง่าย ๆ
  // สีบน: ผสมระหว่าง SkyBlue และ a warm tone
  const topR = Math.round(135 * dayFactor + 255 * (1 - dayFactor)); // 135..255
  const topG = Math.round(206 * dayFactor + 150 * (1 - dayFactor)); // 206..150
  const topB = Math.round(235 * dayFactor + 100 * (1 - dayFactor)); // 235..100
  const topColor = `rgb(${topR},${topG},${topB})`;

  const bottomR = Math.round(255 * dayFactor + 255 * (1 - dayFactor)); // keep to white-ish
  const bottomG = Math.round(255 * dayFactor + 200 * (1 - dayFactor));
  const bottomB = Math.round(255 * dayFactor + 150 * (1 - dayFactor));
  const bottomColor = `rgb(${bottomR},${bottomG},${bottomB})`;

  const g = ctx.createLinearGradient(0, 0, 0, height * 0.65);
  g.addColorStop(0, topColor);
  g.addColorStop(1, bottomColor);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height * 0.65);
}

/* --- Sun: วาดดวง + glow (สีเปลี่ยนตามเวลา) --- */
function drawSun() {
  // sunHue เปลี่ยนตาม dayFactor ให้ได้สีจากเหลืองไปส้ม/แดง
  const sunPhase = (Math.sin(t * 0.0008) + 1) / 2; // 0..1
  const hue = Math.round(50 * (1 - sunPhase) + 40 * sunPhase); // 50 -> 40 (เปลี่ยนเล็กน้อย)
  const sunX = 120; // ตำแหน่งคงที่ในฉากนี้ (ซ้ายบน)
  const sunY = 100;
  const r = 60;

  // glow: radial gradient (center bright -> outer transparent)
  const rg = ctx.createRadialGradient(sunX, sunY, r * 0.1, sunX, sunY, r * 2.2);
  rg.addColorStop(0, `rgba(255, 245, 200, 1)`);
  rg.addColorStop(0.4, `rgba(255, ${180 + Math.round(40 * (1 - sunPhase))}, 60, 0.95)`);
  rg.addColorStop(1, `rgba(255,120,30,0.0)`); // ฟุ้งหายไป
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(sunX, sunY, r * 2.2, 0, Math.PI * 2);
  ctx.fill();

  // core sun
  ctx.beginPath();
  ctx.arc(sunX, sunY, r, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${hue}, 100%, 55%)`; // HSL ให้เฉดเหลือง->ส้ม
  ctx.fill();

  // ขอบเส้นบาง ๆ
  ctx.strokeStyle = `rgba(0,0,0,0.05)`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/* --- Clouds: เมฆลอย (วงกลมซ้อน) --- */
function drawCloud(cx, cy, scale = 1) {
  // เมฆวาดด้วยวงกลมซ้อนหลายวง (soft shape)
  ctx.beginPath();
  // center
  ctx.arc(cx, cy, 22 * scale, 0, Math.PI * 2);
  // sides
  ctx.arc(cx + 28 * scale, cy + 8 * scale, 18 * scale, 0, Math.PI * 2);
  ctx.arc(cx - 28 * scale, cy + 8 * scale, 18 * scale, 0, Math.PI * 2);
  ctx.arc(cx, cy + 15 * scale, 20 * scale, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();

  // เพิ่มเงาอ่อนด้านล่างเมฆ (small)
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16 * scale, 26 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.03)";
  ctx.fill();
}

/* --- Mountains: ลูกหลายชั้นให้มิติ --- */
function drawMountains(width, height) {
  // ชั้นไกล (ซีด)
  ctx.beginPath();
  ctx.moveTo(0, height * 0.45);
  ctx.lineTo(width * 0.15, height * 0.2);
  ctx.lineTo(width * 0.30, height * 0.43);
  ctx.lineTo(width * 0.45, height * 0.18);
  ctx.lineTo(width * 0.6, height * 0.40);
  ctx.lineTo(width * 0.8, height * 0.22);
  ctx.lineTo(width, height * 0.45);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = "#cfd6dc";
  ctx.fill();

  // ชั้นกลาง
  ctx.beginPath();
  ctx.moveTo(0, height * 0.55);
  ctx.lineTo(width * 0.12, height * 0.28);
  ctx.lineTo(width * 0.28, height * 0.55);
  ctx.lineTo(width * 0.45, height * 0.25);
  ctx.lineTo(width * 0.63, height * 0.52);
  ctx.lineTo(width * 0.82, height * 0.30);
  ctx.lineTo(width, height * 0.55);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  const gMid = ctx.createLinearGradient(0, height * 0.25, 0, height * 0.7);
  gMid.addColorStop(0, "#7f98b0");
  gMid.addColorStop(1, "#cfdff0");
  ctx.fillStyle = gMid;
  ctx.fill();

  // ชั้นหน้า (เข้ม)
  ctx.beginPath();
  ctx.moveTo(0, height * 0.68);
  ctx.lineTo(width * 0.08, height * 0.35);
  ctx.lineTo(width * 0.22, height * 0.68);
  ctx.lineTo(width * 0.4, height * 0.32);
  ctx.lineTo(width * 0.57, height * 0.72);
  ctx.lineTo(width * 0.75, height * 0.36);
  ctx.lineTo(width * 0.92, height * 0.68);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  const gFront = ctx.createLinearGradient(0, height * 0.32, 0, height * 0.9);
  gFront.addColorStop(0, "#2f4f4f");
  gFront.addColorStop(1, "#96a6b1");
  ctx.fillStyle = gFront;
  ctx.fill();
}

/* --- Field / Paddy: ท้องนา (terrace look) --- */
function drawFields(width, height) {
  const top = height * 0.62;
  const bottom = height * 0.9;
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    const y0 = top + (bottom - top) * (r / rows);
    const y1 = top + (bottom - top) * ((r + 1) / rows);
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    const dark = `rgb(${80 - r * 6}, ${160 - r * 8}, ${60 - r * 4})`;
    const light = `rgb(${120 - r * 4}, ${200 - r * 6}, ${90 - r * 3})`;
    g.addColorStop(0, dark);
    g.addColorStop(1, light);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    for (let x = 0; x <= width; x += 50) {
      // ทำขอบคันนาเป็นคลื่นเล็กน้อยด้วย sin
      const t = x / width;
      const yy = y0 + Math.sin(t * Math.PI * 4 + r) * 4;
      ctx.lineTo(x, yy);
    }
    ctx.lineTo(width, y1);
    ctx.lineTo(0, y1);
    ctx.closePath();
    ctx.fill();

  
  }
}

/* --- House: บ้าน/กระท่อม แบบง่าย --- */
function drawHouse(x, y, scale = 1) {
  const w = 100 * scale;
  const h = 60 * scale;
  // เงาใต้บ้าน (ellipse)
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h + 8 * scale, w * 0.5, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fill();

  // ผนัง
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(x, y, w, h);

  // หลังคา
  ctx.beginPath();
  ctx.moveTo(x - 8 * scale, y);
  ctx.lineTo(x + w / 2, y - h * 0.8);
  ctx.lineTo(x + w + 8 * scale, y);
  ctx.closePath();
  ctx.fillStyle = "#8B3A3A";
  ctx.fill();

  // หน้าต่าง 2 บาน
  ctx.fillStyle = "#EAF6FF";
  ctx.fillRect(x + 10 * scale, y + 12 * scale, 20 * scale, 16 * scale);
  ctx.fillRect(x + w - 30 * scale, y + 12 * scale, 20 * scale, 16 * scale);

  // ประตู
  ctx.fillStyle = "#6b3f2a";
  ctx.fillRect(x + w * 0.45, y + h * 0.35, 18 * scale, h * 0.55);
}

/* --- Tree: ต้นไม้แบบง่าย (ลำต้น + พุ่มใบ) --- */
function drawTree(x, y, scale = 1) {
  ctx.fillStyle = "#6b3f2a";
  ctx.fillRect(x - 6 * scale, y, 12 * scale, 42 * scale);
  ctx.beginPath();
  ctx.arc(x, y, 24 * scale, 0, Math.PI * 2);
  ctx.arc(x - 18 * scale, y + 8 * scale, 18 * scale, 0, Math.PI * 2);
  ctx.arc(x + 18 * scale, y + 8 * scale, 18 * scale, 0, Math.PI * 2);
  ctx.fillStyle = "#2E7D32";
  ctx.fill();
}

/* --- River: แม่น้ำ (มี gradient ที่เลื่อนได้ + slight wave via control points) --- */
function drawRiver(width, height) {
  // ปรับ control points แบบง่ายเพื่อให้ "กระเพื่อม" เล็กน้อยด้วย sin(t)
  const wobble = Math.sin(t * 0.02) * 18; // -18..18
  const p0 = { x: 0, y: height * 0.75 };
  const c1 = { x: width * 0.22 + wobble, y: height * 0.72 + Math.sin(t * 0.015) * 10 };
  const c2 = { x: width * 0.45 - wobble, y: height * 0.9 + Math.cos(t * 0.018) * 12 };
  const p1 = { x: width, y: height * 0.82 };

  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y);
  // ปิดด้านล่างให้เป็นพื้นที่
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();

  // gradient สำหรับน้ำ — เลื่อนด้วย waterOffset เพื่อให้ดูไหล
  // ล็อก waterOffset ให้วนภายใน [0..width]
  const x0 = (waterOffset % width) - width; // start negative เพื่อให้วนต่อเนื่อง
  const x1 = x0 + 300; // ความกว้าง gradient
  const rg = ctx.createLinearGradient(x0, p0.y, x1, p1.y + 100);
  rg.addColorStop(0, "#1E90FF");
  rg.addColorStop(0.45, "#00BFFF");
  rg.addColorStop(0.9, "#1E90FF");
  ctx.fillStyle = rg;
  ctx.fill();

  // เพิ่ม highlight บางเส้นบนผิวน้ำ (เส้นขาวโปร่ง)
  ctx.beginPath();
  ctx.moveTo(width * 0.12 + Math.sin(t * 0.03) * 6, p0.y + 6);
  ctx.bezierCurveTo(width * 0.28, p0.y + 40, width * 0.5, p0.y + 10, width * 0.72, p0.y + 60);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

/***********************
 * ฟังก์ชันหลัก: วาดฉากทั้งหมด + อนิเมชัน
 ***********************/
function draw() {
  // อ่านขนาด canvas (CSS px)
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;

  // เคลียร์พื้นก่อนวาด (ล้างทุกอย่าง)
  ctx.clearRect(0, 0, W, H);

  // 1) ท้องฟ้า (ไล่เฉด) — ใช้ค่า W,H
  drawSky(W, H);

  // 2) พระอาทิตย์ (มี glow)
  drawSun();

  // 3) เมฆ — วาดก่อนภูเขาแต่หลัง sun เพื่อให้เมฆอยู่หน้า/กลาง
  clouds.forEach(c => {
    drawCloud(c.x, c.y, c.s);
  });

  // 4) ภูเขา (หลายชั้น)
  drawMountains(W, H);

  // 5) ทุ่งนา
  drawFields(W, H);

  // 6) แม่น้ำ (มีอนิเมชัน)
  drawRiver(W, H);

  // 7) บ้านและต้นไม้ (อยู่ด้านหน้า)
  drawHouse(120, 330, 1);
  drawTree(700, 370, 1.0);
  drawTree(760, 380, 0.9);
  drawTree(820, 360, 0.95);

  // --- อัปเดตสถานะสำหรับเฟรมถัดไป ---
  t += 1;                // เพิ่มเวลา (หน่วยเป็นเฟรม)
  waterOffset += 2.8;    // ความเร็วการไหลของน้ำ (ปรับได้)
  if (waterOffset > W) waterOffset = 0;

  // อัปเดตเมฆ (เลื่อนไปเรื่อย ๆ แล้ววนกลับ)
  clouds.forEach(c => {
    c.x += c.speed; // เคลื่อนเมฆ
    if (c.x > W + 120) c.x = -120; // เมื่อเลยขอบให้วนกลับด้านซ้าย
  });

  // วาดเมฆชั้นหน้า (ถ้าต้องการเมฆทับบางส่วนของหน้า) 
  // request next frame
  requestAnimationFrame(draw);
}


fitToContainer(); // ปรับ canvas ให้ตรงกับขนาด CSS และ DPR
requestAnimationFrame(draw); // เริ่มอนิเมชัน

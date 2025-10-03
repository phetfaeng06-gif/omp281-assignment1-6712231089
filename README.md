# Assignment: Canvas 2D Landscape

## วิธีการรัน
1. ดาวน์โหลดโปรเจกต์ทั้งหมดไว้ในโฟลเดอร์เดียว
2. ติดตั้งส่วนเสริม Live Server → คลิกขวา index.html → Open with Live Server

## แนวคิด
- ใช้ **Canvas 2D API** ล้วน ๆ ในการวาด (ห้ามใช้ drawImage และห้ามใช้ไลบรารี)
- แบ่งการวาดเป็นองค์ประกอบหลัก 7 อย่าง ได้แก่:
  1. **ท้องฟ้า** – ใช้ `fillRect` กับไล่สี (linearGradient)  
  2. **ภูเขา** – ใช้ `beginPath` + `lineTo` + `fill`  
  3. **พระอาทิตย์** – ใช้ `arc`  
  4. **ท้องนา** – ใช้สี่เหลี่ยมผืนผ้าไล่สีด้านล่าง  
  5. **ต้นไม้** – ใช้ `fillRect` (ลำต้น) + `arc` (พุ่มใบไม้)  
  6. **บ้าน/กระท่อม** – ใช้ `rect` (ตัวบ้าน) + `triangle path` (หลังคา)  
  7. **แม่น้ำ** – ใช้ `bezierCurveTo` ให้เส้นโค้ง และ `fill` ด้วยสีน้ำเงิน  

วีดีโอ https://youtu.be/CB-Mti2j-Ko?si=WWBh5Aq3brR3i2jh


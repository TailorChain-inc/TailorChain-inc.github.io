// Simple floating particle 3D effect background
const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

let particles = [];
const count = 60;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

for (let i = 0; i < count; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    z: Math.random() * canvas.width,
    r: Math.random() * 2 + 1,
  });
}

function draw() {
  ctx.fillStyle = "#0f101540";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#00f5d4";
  particles.forEach((p) => {
    let scale = 200 / (200 + p.z);
    let x2d = (p.x - canvas.width / 2) * scale + canvas.width / 2;
    let y2d = (p.y - canvas.height / 2) * scale + canvas.height / 2;
    ctx.beginPath();
    ctx.arc(x2d, y2d, p.r * scale, 0, Math.PI * 2);
    ctx.fill();
    p.z -= 2;
    if (p.z < -200) p.z = canvas.width;
  });
  requestAnimationFrame(draw);
}
draw();

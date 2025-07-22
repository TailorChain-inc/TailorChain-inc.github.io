let pressTimer;
let isBack = false; // 앞면이면 false, 뒷면이면 true
const book = document.getElementById('barshow-book');

function flipBook() {
  isBack = !isBack;
  if (isBack) {
    book.style.transform = 'rotateY(180deg)';
  } else {
    book.style.transform = 'rotateY(0deg)';
  }
}

// 터치/마우스 이벤트 바인딩
function startPressTimer() {
  pressTimer = setTimeout(flipBook, 1000);
}
function clearPressTimer() {
  clearTimeout(pressTimer);
}

book.addEventListener('mousedown', startPressTimer);
book.addEventListener('touchstart', startPressTimer);

['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(evt => {
  book.addEventListener(evt, clearPressTimer);
});

const express = require('express');
const path = require('path');
const app = express();
const port = 8080;

// public 폴더를 static 경로로 지정
app.use(express.static('public'));

// 루트(/)로 접속하면 new_barshow_flipbook/index.html을 반환
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'new_barshow_flipbook', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
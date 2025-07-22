import React from "react";
import HTMLFlipBook from "react-pageflip";
import "./App.css";

// ✅ forwardRef로 수정
const ImagePage = React.forwardRef(({ title, img1, img2, text }, ref) => {
  return (
    <div className="page" ref={ref}>
      <h2>{title}</h2>
      <div className="image-row">
        <img src={process.env.PUBLIC_URL + `/images/${img1}`} alt={img1} />
        <img src={process.env.PUBLIC_URL + `/images/${img2}`} alt={img2} />
      </div>
      <p>{text}</p>
    </div>
  );
});

function App() {
  return (
    <div className="App">
      <h1>📖 Willowood Story Book</h1>
      <HTMLFlipBook width={500} height={650} showCover={true}>
        <ImagePage
          title="Willowood 소개"
          img1="img1.jpg"
          img2="img2.jpg"
          text="Willowood에 오신 것을 환영합니다!"
        />
        <ImagePage
          title="자연과 창작"
          img1="img3.jpg"
          img2="img4.jpg"
          text="자연을 닮은 창작의 세계로 초대합니다."
        />
        <ImagePage
          title="소통과 연결"
          img1="img5.jpg"
          img2="img6.jpg"
          text="작가와 독자가 함께 호흡하는 공간입니다."
        />
        <ImagePage
          title="감사합니다 🌿"
          img1="img7.jpg"
          img2="img8.jpg"
          text="함께 해주셔서 고맙습니다."
        />
      </HTMLFlipBook>
    </div>
  );
}

export default App;

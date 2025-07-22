console.log('[TEST] Script loaded!');

document.addEventListener("DOMContentLoaded", function () {
    const maxWidth = 1168;
    const maxHeight = 2480;

    console.log('[TEST] Dom start');

    // 현재 브라우저 크기 기준 비율 계산
    const scaleX = window.innerWidth / maxWidth;
    const scaleY = window.innerHeight / maxHeight;
    const scale = Math.min(scaleX, scaleY); // 가장 작은 쪽 기준으로 축소

    const flipbook = $(".flipbook");

    console.log('[TEST] jquery works');

    // 플립북 사이즈 고정 + 비율 축소 (transform 아님)
    flipbook.css({
        width: maxWidth + "px",
        height: maxHeight + "px",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
    });

    // turn.js 적용
    flipbook.turn({
        width: maxWidth,
        height: maxHeight,
        autoCenter: true,
        elevation: 50,
        gradients: true,
    });


    console.log('[TEST] turn works');
});
# pelican-bike
鹈鹕骑自行车单文件 HTML 动画

## 周二下午 · 第1盘《点歌台》
`tuesday-afternoon.html`：1997年县有线台点歌台的"翻录录像带"，单文件 HTML（Canvas 画面 + WebAudio 电子琴）。
全片约 1 分 53 秒。调试时可用 `#t=秒数` 跳到指定位置，例如 `tuesday-afternoon.html#t=72`。
导出视频：`node render-video.js 输出.mp4`（需要 playwright 和 ffmpeg，960×720、25fps，带音轨）。

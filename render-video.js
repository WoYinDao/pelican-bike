// 把 tuesday-afternoon.html 逐帧导出成 mp4（需要 playwright 和 ffmpeg）
// 用法：node render-video.js [输出.mp4]
const {chromium} = require('playwright');
const {spawn} = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');

const OUT = process.argv[2] || 'tuesday-afternoon-ep1.mp4';
const FPS = 25, W = 960, H = 720, LEAD = 2.5, TAIL = 2.5, RATE = 44100;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: W, height: H}});
  await page.goto('file://' + path.resolve(__dirname, 'tuesday-afternoon.html'));
  await page.addStyleTag({content: '.mute,.again{display:none!important}'});
  const END = await page.evaluate(() => window.__tape.END);

  // 音轨：离线渲染成 16 位单声道 WAV
  const wav = path.join(os.tmpdir(), 'tuesday-afternoon-' + process.pid + '.wav');
  const b64 = await page.evaluate(async rate => {
    const buf = await window.__tape.audio(rate), d = buf.getChannelData(0);
    const out = new DataView(new ArrayBuffer(44 + d.length * 2));
    const str = (o, s) => [...s].forEach((ch, i) => out.setUint8(o + i, ch.charCodeAt(0)));
    str(0, 'RIFF'); out.setUint32(4, 36 + d.length * 2, true); str(8, 'WAVEfmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
    out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true);
    str(36, 'data'); out.setUint32(40, d.length * 2, true);
    for (let i = 0; i < d.length; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
    let s = ''; const u = new Uint8Array(out.buffer);
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(s);
  }, RATE);
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-itsoffset', String(LEAD), '-i', wav,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', OUT], {stdio: ['pipe', 'inherit', 'inherit']});
  const done = new Promise(r => ff.on('close', r));
  const tv = page.locator('.tv');
  const shot = async () => { const b = await tv.screenshot({type: 'jpeg', quality: 93});
    if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r)); };

  for (let i = 0; i < LEAD * FPS; i++) await shot();              // 封面标签
  await page.evaluate(() => document.getElementById('cover').classList.add('hide'));
  const n = Math.round((END + TAIL) * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.__tape.draw(t), i / FPS);
    await shot();
    if (i % 250 === 0) console.log(`${(i / FPS).toFixed(0)}s / ${END + TAIL}s`);
  }
  ff.stdin.end(); await done; await browser.close(); fs.unlinkSync(wav);
  console.log('wrote', OUT);
})();

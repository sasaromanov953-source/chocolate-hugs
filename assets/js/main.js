(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // The shareable preview embeds its images in the page; the real site loads them as files.
  const ASSETS = window.EMBEDDED_ASSETS || {};
  const asset = (path) => ASSETS[path] || path;
  const EMBEDDED_FRAMES = window.EMBEDDED_FRAMES || null;

  /* ---------- Hero: frames scrubbed by scroll ---------- */
  // Works whether the window, the body or an embedding frame does the scrolling:
  // progress is read from the hero's position every animation frame.
  // If the page cannot scroll on its own (an auto-height embed), the frames play by themselves.
  const FRAME_COUNT = EMBEDDED_FRAMES ? EMBEDDED_FRAMES.d.length : 218;
  const hero = document.getElementById("hero");
  const canvas = hero.querySelector(".hero-canvas");
  const ctx = canvas.getContext("2d");
  const beats = [...hero.querySelectorAll(".beat")];
  const hint = hero.querySelector(".scroll-hint");
  const header = document.querySelector(".site-header");
  const BG = "#efc1cf";
  let set = null, frames = [], current = 0, target = 0, needsDraw = true, lastP = -1;
  let auto = false, autoStart = 0, heroVisible = true;

  const pad = (n) => String(n).padStart(3, "0");
  const portrait = () => canvas.clientWidth / Math.max(1, canvas.clientHeight) < 1;

  function loadSet(name) {
    if (set === name) return;
    set = name;
    frames = new Array(FRAME_COUNT);
    const order = [0];
    for (const step of [8, 4, 2, 1])
      for (let i = 0; i < FRAME_COUNT; i += step) if (!order.includes(i)) order.push(i);
    let next = 0;
    const worker = () => {
      if (next >= order.length || set !== name) return;
      const i = order[next++];
      const img = new Image();
      img.onload = () => { if (set === name) { frames[i] = img; needsDraw = true; } worker(); };
      img.onerror = worker;
      img.src = EMBEDDED_FRAMES ? EMBEDDED_FRAMES[name][i] : `assets/hero/${name}/${pad(i)}.webp`;
    };
    for (let k = 0; k < 6; k++) worker();
  }

  function nearestFrame(i) {
    for (let d = 0; d < FRAME_COUNT; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  function sizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    loadSet(portrait() ? "m" : "d");
    needsDraw = true;
  }

  function draw() {
    const img = nearestFrame(Math.round(current));
    if (!img || !canvas.width) return;
    const W = canvas.width, H = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    if (set === "d") {
      const s = Math.max(W / iw, H / ih);
      const dw = iw * s, dh = ih * s;
      const x = clamp(W / 2 - dw * 0.64, W - dw, 0);
      ctx.drawImage(img, x, (H - dh) / 2, dw, dh);
    } else {
      const s = Math.max(W / iw, (H * 0.5) / ih);
      const dw = iw * s, dh = ih * s;
      const y = H - dh - H * 0.07;
      ctx.drawImage(img, (W - dw) / 2, y, dw, dh);
      const g = ctx.createLinearGradient(0, y, 0, y + dh * 0.22);
      g.addColorStop(0, BG); g.addColorStop(1, "rgba(239,193,207,0)");
      ctx.fillStyle = g; ctx.fillRect(0, y - 1, W, dh * 0.22);
    }
    hero.classList.add("drawn");
  }

  function updateBeats(p) {
    const f = 0.05;
    for (const b of beats) {
      const from = +b.dataset.from, to = +b.dataset.to;
      const fin = from === 0 ? 1 : clamp((p - from) / f);
      const o = Math.min(fin, clamp((to - p) / f));
      b.style.opacity = o;
      b.style.transform = reduceMotion ? "" : `translateY(${(1 - o) * (p < from + f ? 18 : -18)}px)`;
      b.classList.toggle("on", o > 0.5);
    }
    hint.style.opacity = auto || p > 0.03 ? 0 : 0.8;
  }

  function checkMode() {
    // An embed that grows to fit the page makes the viewport far taller than the screen.
    const tooTall = innerHeight > (screen.height || 1000) * 1.4;
    if (tooTall !== auto) {
      auto = tooTall;
      document.documentElement.classList.toggle("hero-auto", auto);
      autoStart = performance.now();
      sizeCanvas();
    }
  }

  function scrollProgress() {
    const r = hero.getBoundingClientRect();
    const run = r.height - canvas.clientHeight;
    return run > 0 ? clamp(-r.top / run) : 0;
  }

  function loop(now) {
    let p;
    if (auto) {
      // play 8 s, hold the box for 2 s, start again
      const t = heroVisible ? ((now - autoStart) % 10000) / 8000 : 0;
      p = reduceMotion ? 1 : clamp(t);
    } else {
      p = scrollProgress();
    }
    target = p * (FRAME_COUNT - 1);
    if (p !== lastP) { updateBeats(p); lastP = p; }
    const diff = target - current;
    if (diff) { current = auto || reduceMotion || Math.abs(diff) < 0.3 ? target : current + diff * 0.22; needsDraw = true; }
    if (needsDraw) { needsDraw = false; draw(); }
    header.classList.toggle("solid", hero.getBoundingClientRect().bottom < 80);
    requestAnimationFrame(loop);
  }

  if ("ResizeObserver" in window) new ResizeObserver(sizeCanvas).observe(canvas);
  if ("IntersectionObserver" in window)
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; if (heroVisible && auto) autoStart = performance.now(); }).observe(hero);
  addEventListener("resize", () => { checkMode(); sizeCanvas(); });
  checkMode();
  sizeCanvas();
  updateBeats(0);
  requestAnimationFrame(loop);

  /* ---------- Collections (placeholder data) ---------- */
  const products = [
    { name: "«Вечная классика»", kind: "Корпусные конфеты и трюфели", img: "classic", sizes: [[4, 700], [9, 1500], [16, 2700]] },
    { name: "«Сырная симфония»", kind: "Конфеты и трюфели со сливочным сыром", img: "cheese", sizes: [[4, 600], [9, 1300], [16, 2500]] },
    { name: "«Сырное волшебство»", kind: "Трюфели со сливочным сыром", img: "magic", sizes: [[4, 990], [9, 1890], [16, 3490]] },
    { name: "Шоколадные батончики", kind: "Шоколад и начинки на выбор", img: "bars", sizes: [[5, 1250], [7, 1590], [10, 1990]] },
    { name: "Батончики в коробке-книжке", kind: "Белый шоколад с ягодами и фруктами", img: "barsbox", sizes: [[6, 1690]] },
    { name: "Финики в шоколаде", kind: "С орехами или мягким сыром", img: "dates", sizes: [[4, 1069], [9, 2409], [16, 4449]] },
    { name: "Шоколадные пончики", kind: "С курагой и черносливом", img: "donuts", sizes: [[4, null]] },
  ];
  const rub = (n) => n == null ? "Цену уточню" : n.toLocaleString("ru-RU") + " ₽";
  const list = document.getElementById("products");
  products.forEach((p, i) => {
    const el = document.createElement("article");
    el.className = "product" + (i % 2 ? " dark" : "");
    const group = `size-${i}`;
    el.innerHTML = `
      <h3>${p.name}</h3>
      <p class="kind">${p.kind}</p>
      <fieldset class="sizes"><legend>Размер набора</legend>
        ${p.sizes.map(([n, price], k) => `
          <label><input type="radio" name="${group}" value="${k}" ${k === 0 ? "checked" : ""}><span>${n} шт</span></label>`).join("")}
      </fieldset>
      <div class="buy"><span class="price">${rub(p.sizes[0][1])}</span><a class="btn" href="#order">Заказать</a></div>
      <div class="photo"><img src="${asset(`assets/img/${p.img}.webp`)}" alt="${p.name.replace(/[«»]/g, "")}, ${p.kind.toLowerCase()}" loading="lazy"></div>`;
    el.querySelector(".sizes").addEventListener("change", (e) => {
      el.querySelector(".price").textContent = rub(p.sizes[+e.target.value][1]);
    });
    list.append(el);
  });

  /* ---------- Reviews pile + fullscreen viewer ---------- */
  const reviews = [1, 2, 3, 4, 5, 6, 7].map((n) => asset(`assets/reviews/${n}.svg`));
  // Bouquet: [tilt in degrees, extra height in px, width factor]. Fixed so it looks the same on every visit.
  const stems = [
    [-42, 0, 0.9], [-27, 70, 1], [-12, 30, 1.05], [1, 120, 1], [14, 45, 1.05], [28, 85, 0.95], [43, 10, 0.9],
  ];
  const bouquet = document.getElementById("bouquet");
  const narrow = () => innerWidth < 760;
  const thumbs = reviews.map((src, i) => {
    const [r, lift, s] = stems[i % stems.length];
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `Открыть отзыв ${i + 1} из ${reviews.length}`);
    const center = Math.abs(i - (reviews.length - 1) / 2);
    b.style.setProperty("--r", r * (narrow() ? 0.8 : 1) + "deg");
    b.style.setProperty("--lift", lift * (narrow() ? 0.6 : 1) + "px");
    b.style.setProperty("--w", `calc(clamp(118px, 13vw, 150px) * ${s})`);
    b.style.setProperty("--z", String(10 - Math.round(center)));
    b.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
    b.addEventListener("click", () => openViewer(i));
    bouquet.append(b);
    return b;
  });

  thumbs.forEach((b, i) => b.style.setProperty("--delay", (i * 0.09).toFixed(2) + "s"));
  if (!reduceMotion && "IntersectionObserver" in window) {
    bouquet.classList.add("ready");
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      requestAnimationFrame(() => bouquet.classList.add("bloom"));
      setTimeout(() => bouquet.classList.add("settled"), 1500);
    }, { threshold: 0.35 });
    io.observe(bouquet);
  }

  const viewer = document.getElementById("viewer");
  const vImg = viewer.querySelector(".viewer-img");
  const vCount = viewer.querySelector(".viewer-count");
  const DUR = reduceMotion ? 0 : 420;
  let idx = -1, busy = false, lastFocus = null;

  function fitRect(img) {
    const maxW = innerWidth * 0.9, maxH = innerHeight * 0.82;
    const ar = img.naturalWidth / img.naturalHeight || 0.5;
    let w = maxW, h = w / ar;
    if (h > maxH) { h = maxH; w = h * ar; }
    return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h };
  }
  const tf = (from, to) => `translate(${from.left}px, ${from.top}px) scale(${from.width / to.width})`;

  function place(rect) {
    vImg.style.width = rect.width + "px";
    vImg.style.height = rect.height + "px";
  }

  async function openViewer(i) {
    if (busy) return;
    busy = true; idx = i; lastFocus = document.activeElement;
    const thumb = thumbs[i].querySelector("img");
    vImg.src = reviews[i];
    await vImg.decode().catch(() => {});
    viewer.hidden = false;
    const to = fitRect(thumb);
    const from = thumb.getBoundingClientRect();
    place(to);
    thumbs[i].style.visibility = "hidden";
    vCount.textContent = `${i + 1} из ${reviews.length}`;
    requestAnimationFrame(() => viewer.classList.add("open"));
    document.body.style.overflow = "hidden";
    await vImg.animate(
      [{ transform: tf(from, to) }, { transform: tf(to, to) }],
      { duration: DUR, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
    ).finished;
    viewer.querySelector(".viewer-close").focus();
    busy = false;
  }

  async function step(dir) {
    if (busy || idx < 0) return;
    const n = (idx + dir + reviews.length) % reviews.length;
    busy = true;
    const cur = fitRect(vImg);
    await vImg.animate(
      [{ transform: tf(cur, cur), opacity: 1 }, { transform: tf({ ...cur, left: cur.left - dir * 60 }, cur), opacity: 0 }],
      { duration: DUR * 0.5, easing: "ease-in", fill: "forwards" }
    ).finished;
    thumbs[idx].style.visibility = "";
    thumbs[n].style.visibility = "hidden";
    idx = n;
    vImg.src = reviews[n];
    await vImg.decode().catch(() => {});
    const to = fitRect(vImg);
    place(to);
    vCount.textContent = `${n + 1} из ${reviews.length}`;
    await vImg.animate(
      [{ transform: tf({ ...to, left: to.left + dir * 60 }, to), opacity: 0 }, { transform: tf(to, to), opacity: 1 }],
      { duration: DUR * 0.6, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
    ).finished;
    busy = false;
  }

  async function closeViewer() {
    if (busy || idx < 0) return;
    busy = true;
    const to = fitRect(vImg);
    const back = thumbs[idx].querySelector("img").getBoundingClientRect();
    viewer.classList.remove("open");
    await vImg.animate(
      [{ transform: tf(to, to) }, { transform: tf(back, to) }],
      { duration: DUR, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }
    ).finished;
    thumbs[idx].style.visibility = "";
    viewer.hidden = true;
    vImg.getAnimations().forEach((a) => a.cancel());
    document.body.style.overflow = "";
    idx = -1; busy = false;
    lastFocus && lastFocus.focus();
  }

  let swiped = false;
  viewer.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => {
    if (swiped) { swiped = false; return; }
    closeViewer();
  }));
  viewer.querySelector(".viewer-prev").addEventListener("click", () => step(-1));
  viewer.querySelector(".viewer-next").addEventListener("click", () => step(1));
  addEventListener("keydown", (e) => {
    if (viewer.hidden) return;
    if (e.key === "Escape") closeViewer();
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });
  let sx = null;
  viewer.addEventListener("pointerdown", (e) => { sx = e.clientX; });
  viewer.addEventListener("pointerup", (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) { swiped = true; setTimeout(() => { swiped = false; }, 0); step(dx < 0 ? 1 : -1); }
  });
})();

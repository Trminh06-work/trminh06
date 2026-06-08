/* ============================================================
   main.js — graph network canvas, reveals, nav
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- mobile nav ---------- */
  var nav = document.querySelector(".nav");
  var toggle = document.querySelector(".nav-toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      var open = nav.classList.contains("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  /* ---------- footer year ---------- */
  var y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- scroll reveals ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (reduce || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var el = e.target;
            var d = el.getAttribute("data-delay");
            if (d) el.style.transitionDelay = d + "ms";
            el.classList.add("in");
            io.unobserve(el);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- graph network canvas ---------- */
  function GraphField(canvas) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var density = parseFloat(canvas.getAttribute("data-density")) || 1;
    var W = 0, H = 0;
    var nodes = [];
    var pulses = [];
    var raf = null;
    var ACCENT = [200, 242, 60];
    var lastPulse = 0;

    function resize() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(r.width, 1);
      H = Math.max(r.height, 1);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var area = W * H;
      var count = Math.round((area / 22000) * density);
      count = Math.max(14, Math.min(count, 90));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          r: Math.random() * 1.6 + 0.8,
          hot: Math.random() < 0.16
        });
      }
    }

    var LINK = 140; // px linking distance

    function spawnPulse(now) {
      // pick a node with a neighbour, send a pulse along the edge
      if (nodes.length < 2) return;
      var a = nodes[(Math.random() * nodes.length) | 0];
      var best = null, bestD = LINK;
      for (var i = 0; i < nodes.length; i++) {
        var b = nodes[i];
        if (b === a) continue;
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < bestD) { bestD = d; best = b; }
      }
      if (best) pulses.push({ a: a, b: best, t: 0, born: now });
    }

    function step(now) {
      ctx.clearRect(0, 0, W, H);

      // move
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.x = Math.max(0, Math.min(W, n.x));
        n.y = Math.max(0, Math.min(H, n.y));
      }

      // edges
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = nodes[a].x - nodes[b].x;
          var dy = nodes[a].y - nodes[b].y;
          var dist = Math.hypot(dx, dy);
          if (dist < LINK) {
            var o = (1 - dist / LINK) * 0.5;
            ctx.strokeStyle = "rgba(120,132,150," + (o * 0.5) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[a].x, nodes[a].y);
            ctx.lineTo(nodes[b].x, nodes[b].y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (var k = 0; k < nodes.length; k++) {
        var nd = nodes[k];
        if (nd.hot) {
          ctx.fillStyle = "rgba(" + ACCENT[0] + "," + ACCENT[1] + "," + ACCENT[2] + ",0.9)";
          ctx.shadowColor = "rgba(" + ACCENT[0] + "," + ACCENT[1] + "," + ACCENT[2] + ",0.7)";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, nd.r + 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = "rgba(150,160,176,0.55)";
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // pulses traveling along edges
      if (now - lastPulse > 1100) { spawnPulse(now); lastPulse = now; }
      for (var p = pulses.length - 1; p >= 0; p--) {
        var pu = pulses[p];
        pu.t += 0.018;
        if (pu.t >= 1) { pulses.splice(p, 1); continue; }
        var px = pu.a.x + (pu.b.x - pu.a.x) * pu.t;
        var py = pu.a.y + (pu.b.y - pu.a.y) * pu.t;
        var fade = Math.sin(pu.t * Math.PI);
        ctx.fillStyle = "rgba(" + ACCENT[0] + "," + ACCENT[1] + "," + ACCENT[2] + "," + (0.9 * fade) + ")";
        ctx.shadowColor = "rgba(" + ACCENT[0] + "," + ACCENT[1] + "," + ACCENT[2] + ",0.8)";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      raf = requestAnimationFrame(step);
    }

    function start() {
      resize();
      if (reduce) {
        // draw one static frame, no animation
        drawStatic();
        return;
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(step);
    }

    function drawStatic() {
      ctx.clearRect(0, 0, W, H);
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dist = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
          if (dist < LINK) {
            ctx.strokeStyle = "rgba(120,132,150," + ((1 - dist / LINK) * 0.25) + ")";
            ctx.beginPath();
            ctx.moveTo(nodes[a].x, nodes[a].y);
            ctx.lineTo(nodes[b].x, nodes[b].y);
            ctx.stroke();
          }
        }
      }
      for (var k = 0; k < nodes.length; k++) {
        var nd = nodes[k];
        ctx.fillStyle = nd.hot ? "rgba(200,242,60,0.85)" : "rgba(150,160,176,0.5)";
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(start, 180);
    });

    // pause when offscreen / tab hidden
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); }
      else if (!reduce) { raf = requestAnimationFrame(step); }
    });

    start();
  }

  document.querySelectorAll("canvas[data-graph]").forEach(function (c) {
    new GraphField(c);
  });
})();

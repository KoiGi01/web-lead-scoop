/* GlobaLeads22 hero v2 — perspective grid + inbox cycle + stage scaler */
(function () {
  "use strict";

  /* ---------------- perspective grid room ---------------- */
  var svg = document.getElementById("grid-svg");
  var NS = "http://www.w3.org/2000/svg";
  var W = 1240, H = 640;
  /* back wall rect */
  var BX = 350, BY = 168, BW = 540, BH = 280;

  function line(x1, y1, x2, y2, alpha, width, className) {
    var el = document.createElementNS(NS, "line");
    el.setAttribute("x1", x1); el.setAttribute("y1", y1);
    el.setAttribute("x2", x2); el.setAttribute("y2", y2);
    el.setAttribute("stroke", "rgba(21,20,15," + alpha + ")");
    el.setAttribute("stroke-width", width || 1);
    if (className) el.setAttribute("class", className);
    svg.appendChild(el);
  }

  function rectOutline(x, y, w, h, alpha, width, className) {
    var el = document.createElementNS(NS, "rect");
    el.setAttribute("x", x); el.setAttribute("y", y);
    el.setAttribute("width", w); el.setAttribute("height", h);
    el.setAttribute("fill", "none");
    el.setAttribute("stroke", "rgba(21,20,15," + alpha + ")");
    el.setAttribute("stroke-width", width || 1);
    if (className) el.setAttribute("class", className);
    svg.appendChild(el);
    return el;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /* wall grid lines: outer edge point -> matching back wall edge point */
  var n;
  for (n = 0; n <= 20; n++) {
    var u = n / 20;
    /* top + bottom walls (vertical-ish lines) */
    line(u * W, 0, BX + u * BW, BY, 0.15, 1, "grid-line grid-line-top");
    line(u * W, H, BX + u * BW, BY + BH, 0.15, 1, "grid-line grid-line-bottom");
  }
  for (n = 0; n <= 10; n++) {
    var v = n / 10;
    /* left + right walls (horizontal-ish lines) */
    line(0, v * H, BX, BY + v * BH, 0.15, 1, "grid-line grid-line-left");
    line(W, v * H, BX + BW, BY + v * BH, 0.15, 1, "grid-line grid-line-right");
  }

  /* depth rungs (perspective-spaced rectangles) */
  var rungs = [0.18, 0.36, 0.52, 0.66, 0.78, 0.88, 0.96];
  rungs.forEach(function (t, index) {
    var rung = rectOutline(lerp(0, BX, t), lerp(0, BY, t), lerp(W, BW, t), lerp(H, BH, t), 0.22, 1, "depth-rung");
    rung.style.setProperty("--i", index);
  });

  /* corner rays */
  line(0, 0, BX, BY, 0.32, 1.2, "corner-ray");
  line(W, 0, BX + BW, BY, 0.32, 1.2, "corner-ray");
  line(0, H, BX, BY + BH, 0.32, 1.2, "corner-ray");
  line(W, H, BX + BW, BY + BH, 0.32, 1.2, "corner-ray");

  /* back wall */
  rectOutline(BX, BY, BW, BH, 0.45, 1.2, "back-wall");

  /* yellow corner ticks on the back wall */
  [[BX, BY, 1, 1], [BX + BW, BY, -1, 1], [BX, BY + BH, 1, -1], [BX + BW, BY + BH, -1, -1]].forEach(function (c) {
    var t1 = document.createElementNS(NS, "path");
    t1.setAttribute("d", "M " + c[0] + " " + (c[1] + 12 * c[3]) + " L " + c[0] + " " + c[1] + " L " + (c[0] + 12 * c[2]) + " " + c[1]);
    t1.setAttribute("fill", "none");
    t1.setAttribute("stroke", "var(--yellow-deep, #b8ae00)");
    t1.setAttribute("stroke-width", 2.4);
    svg.appendChild(t1);
  });

  /* ---------------- sample leads (fake data) ---------------- */
  var ICONS = {
    mail: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>',
    phone: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"></path></svg>',
    globe: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18-2.5-2.6-2.5-15.4 0-18z"></path></svg>'
  };

  var LEADS = [
    { name: "Maya Okafor", role: "Owner · likely decision maker", co: "Brightline Dental Studio", em1: "m.okafor@", em2: "brightline", em3: "-dental.com", ph1: "(512) 555-", ph2: "0184", site: "brightlinedental.com", score: 94, strong: true },
    { name: "Daniel Reyes", role: "Practice manager · likely decision maker", co: "NorthLoop Dental Co.", em1: "d.reyes@", em2: "northloop", em3: "dental.com", ph1: "(512) 555-", ph2: "0237", site: "northloopdental.com", score: 88, strong: true },
    { name: "Priya Shah", role: "Founder · likely decision maker", co: "Shah Orthodontics", em1: "priya@", em2: "shahortho", em3: ".com", ph1: "(512) 555-", ph2: "0419", site: "shahortho.com", score: 81, strong: false },
    { name: "Tom Lindqvist", role: "Co-owner · likely decision maker", co: "Cedar Park Smiles", em1: "tom@", em2: "cedarpark", em3: "smiles.com", ph1: "(512) 555-", ph2: "0562", site: "cedarparksmiles.com", score: 90, strong: true },
    { name: "Alice Tran", role: "Office director", co: "Mosaic Family Dental", em1: "a.tran@", em2: "mosaicfam", em3: "dental.com", ph1: "(512) 555-", ph2: "0671", site: "mosaicfamilydental.com", score: 76, strong: false },
    { name: "Jonah Beck", role: "Owner · likely decision maker", co: "South Lamar Dental Lab", em1: "jonah@", em2: "slamar", em3: "dentallab.com", ph1: "(512) 555-", ph2: "0743", site: "southlamardentallab.com", score: 86, strong: true }
  ];

  function cardHTML(lead) {
    return (
      '<div class="lead-top"><span class="lead-name">' + lead.name + "</span>" +
      '<span class="lead-co">&middot;&nbsp; ' + lead.co + "</span>" +
      '<span class="lead-score ' + (lead.strong ? "strong" : "good") + '">' + lead.score + " · " + (lead.strong ? "STRONG" : "GOOD") + " FIT</span></div>" +
      '<div class="lead-role"><i></i>' + lead.role + "</div>" +
      '<div class="lead-fields">' +
      '<span class="f">' + ICONS.mail + lead.em1 + '<span class="redact">' + lead.em2 + "</span>" + lead.em3 + "</span>" +
      '<span class="f">' + ICONS.phone + lead.ph1 + '<span class="redact">' + lead.ph2 + "</span></span>" +
      '<span class="f">' + ICONS.globe + lead.site + "</span>" +
      "</div>"
    );
  }

  function makeCard(lead) {
    var el = document.createElement("div");
    el.className = "lead-card";
    el.innerHTML = cardHTML(lead);
    return el;
  }

  var list = document.getElementById("inbox-list");
  var countEl = document.getElementById("lead-count");
  var next = 0;
  var count = 128;

  for (var i = 0; i < 4; i++) {
    var c = makeCard(LEADS[next]);
    if (i === 0) c.classList.add("fresh");
    list.appendChild(c);
    next = (next + 1) % LEADS.length;
  }

  function motionOff() {
    return (
      document.documentElement.classList.contains("no-motion") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function insertLead() {
    if (motionOff() || document.hidden) return;
    var prev = list.querySelector(".lead-card.fresh");
    if (prev) prev.classList.remove("fresh");
    var card = makeCard(LEADS[next]);
    card.classList.add("enter", "fresh");
    list.insertBefore(card, list.firstChild);
    next = (next + 1) % LEADS.length;
    while (list.children.length > 6) list.removeChild(list.lastChild);
    count += 1;
    countEl.textContent = String(count);
  }

  /* new card lands after the signals+chips wave (~2s into the 4.2s cycle) */
  setTimeout(function () {
    insertLead();
    setInterval(insertLead, 4200);
  }, 2000);

  /* ---------------- stage scaler ---------------- */
  var scaler = document.getElementById("stage-scaler");
  var stage = document.getElementById("stage");
  var DESIGN_W = 1240;
  var DESIGN_H = 700;

  function rescale() {
    var w = scaler.clientWidth;
    var s = Math.min(1, w / DESIGN_W);
    stage.style.transform = "scale(" + s + ")";
    scaler.style.height = DESIGN_H * s + "px";
  }

  if (window.ResizeObserver) {
    new ResizeObserver(rescale).observe(scaler);
  } else {
    window.addEventListener("resize", rescale);
  }
  rescale();
})();

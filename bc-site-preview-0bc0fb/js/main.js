/* Bruno Chiropractic Center — site behaviour (no dependencies) */
(function () {
  "use strict";

  /* Mobile navigation */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* Stock photos: if an image can't load, keep the styled panel and hide the broken icon */
  Array.prototype.forEach.call(document.querySelectorAll(".photo img"), function (img) {
    var mark = function () { img.classList.add("is-missing"); };
    if (img.complete && img.naturalWidth === 0) mark();
    img.addEventListener("error", mark);
  });

  /* Hours: highlight today and show an open/closed pill.
     Each <tr> carries data-day (0 = Sunday … 6 = Saturday) and data-ranges ("09:00-12:00,14:30-18:00" or "").
     The office keeps Eastern time. */
  function easternNow() {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
      }).formatToParts(new Date());
      var map = {};
      parts.forEach(function (p) { map[p.type] = p.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: days[map.weekday], minutes: (parseInt(map.hour, 10) % 24) * 60 + parseInt(map.minute, 10) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
    }
  }
  function toMin(hhmm) { var p = hhmm.split(":"); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  function fmt(min) {
    var h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    return h + ":" + (m < 10 ? "0" + m : m) + " " + ap;
  }
  var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  Array.prototype.forEach.call(document.querySelectorAll("table.hours"), function (table) {
    var now = easternNow();
    var rows = {};
    Array.prototype.forEach.call(table.querySelectorAll("tr[data-day]"), function (tr) {
      var day = parseInt(tr.getAttribute("data-day"), 10);
      var ranges = (tr.getAttribute("data-ranges") || "").split(",").filter(Boolean).map(function (r) {
        var ab = r.split("-"); return [toMin(ab[0]), toMin(ab[1])];
      });
      rows[day] = ranges;
      if (day === now.day) tr.classList.add("is-today");
    });

    var pill = document.querySelector('[data-open-pill="' + (table.id || "") + '"]');
    if (!pill) return;
    var today = rows[now.day] || [];
    var openUntil = null, nextOpen = null;
    today.forEach(function (r) {
      if (now.minutes >= r[0] && now.minutes < r[1]) openUntil = r[1];
      else if (now.minutes < r[0] && nextOpen === null) nextOpen = { day: now.day, at: r[0] };
    });
    if (openUntil !== null) {
      pill.textContent = "Open now · closes " + fmt(openUntil);
      pill.classList.add("is-open");
    } else {
      if (nextOpen === null) {
        for (var i = 1; i <= 7 && nextOpen === null; i++) {
          var d = (now.day + i) % 7;
          if (rows[d] && rows[d].length) nextOpen = { day: d, at: rows[d][0][0] };
        }
      }
      if (nextOpen) {
        var when = nextOpen.day === now.day ? "today" : (nextOpen.day === (now.day + 1) % 7 ? "tomorrow" : dayNames[nextOpen.day]);
        pill.textContent = "Closed now · opens " + when + " at " + fmt(nextOpen.at);
      } else {
        pill.textContent = "Closed";
      }
      pill.classList.add("is-closed");
    }
    pill.hidden = false;
  });

  /* Appointment form: posts to the office inbox via FormSubmit.
     With JavaScript it sends in the background and confirms on the page;
     without JavaScript the form posts normally to the same service. */
  Array.prototype.forEach.call(document.querySelectorAll("form[data-mail-form]"), function (form) {
    var status = form.querySelector(".form__status");
    var button = form.querySelector('button[type="submit"]');
    function show(msg, ok) {
      if (!status) return;
      status.textContent = msg;
      status.className = "form__status" + (ok ? " is-ok" : " is-error");
      status.hidden = false;
      status.focus();
    }
    form.addEventListener("submit", function (e) {
      var endpoint = form.getAttribute("data-ajax");
      if (!endpoint || !window.fetch) return;
      e.preventDefault();
      var name = form.querySelector('[name="name"]');
      var phone = form.querySelector('[name="phone"]');
      if (!name.value.trim() || !phone.value.trim()) {
        show("Please add your name and phone number so we can reach you.", false);
        (name.value.trim() ? phone : name).focus();
        return;
      }
      if (button) { button.disabled = true; button.dataset.label = button.innerHTML; button.textContent = "Sending…"; }
      fetch(endpoint, { method: "POST", headers: { "Accept": "application/json" }, body: new FormData(form) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok && String(res.d.success) !== "false") {
            form.reset();
            show("Request sent. Someone from our office will contact you to confirm a time.", true);
          } else {
            show("Your request didn't go through. Please call (401) 353-5990 or email brunochiroteam@gmail.com.", false);
          }
        })
        .catch(function () {
          show("Your request didn't go through. Please call (401) 353-5990 or email brunochiroteam@gmail.com.", false);
        })
        .then(function () { if (button) { button.disabled = false; button.innerHTML = button.dataset.label; } });
    });
  });

  /* Close the dropdown menu after choosing a link (same-page anchors) */
  if (nav && toggle) {
    Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Footer year */
  Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

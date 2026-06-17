/* ============================================================
   integration.js — связывает страницы с FreightAPI.
   Принцип: данные идут с бэка; статичная демо-разметка очищается
   сразу, чтобы не мелькала. Подключается ПОСЛЕ api.js.
   ============================================================ */
(function () {
  "use strict";
  if (!window.FreightAPI) return;
  var API = window.FreightAPI;

  document.addEventListener("DOMContentLoaded", function () {
    wireModeratorLink();   // на всех страницах: показать «Модерация» по роли из токена
    wireAuth();            // auth.html
    wireSearch();          // search-cargo / search-transport
    wireCabinet();         // cabinet.html — мои объявления
    wireModerationQueue(); // moderator.html — очередь
    wireLogout();
    wireLoginButton();
    wireCreateCargo();
    wireCreateTransport();
    wireSettings();
    wireEditTransport();
    wireListingTypeSelector();
  });
  // ещё раз после полной загрузки — перебить возможный показ ссылки из site.js
  window.addEventListener("load", wireModeratorLink);

  // ---------------- helpers ----------------
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmtNum(n) {
    if (n == null || n === "") return "";
    var num = Number(n); if (isNaN(num)) return esc(n);
    return num.toLocaleString("ru-RU");
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d.getTime())) return esc(iso);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }
  function setFieldError(input, msg) {
    if (!input) return;
    input.classList.toggle("input--error", !!msg);
    var field = input.closest(".field"); if (!field) return;
    var err = field.querySelector(".field__error");
    if (msg) {
      if (!err) { err = document.createElement("span"); err.className = "field__error"; field.appendChild(err); }
      err.textContent = msg;
    } else if (err) { err.remove(); }
  }
  function info(text) {
    return '<div style="padding:24px;color:var(--text-muted)">' + esc(text) + "</div>";
  }
  function cityOf(loc) { return loc && loc.city ? loc.city : ""; }
  function routeText(route) {
    if (!route) return "—";
    var a = cityOf(route.origin), b = cityOf(route.destination);
    if (!a && !b) return "—";
    return esc(a) + ' <span class="arrow">→</span> ' + esc(b);
  }

  var LISTING_STATUS = {
    ACTIVE: ["Активно", "status--active"],
    MODERATION: ["На модерации", "status--moderation"],
    DRAFT: ["Черновик", "status--draft"],
    ARCHIVED: ["В архиве", "status--done"],
    REJECTED: ["Отклонено", "status--rejected"]
  };

  // ============================================================
  // РОЛЬ: показать пункт «Модерация» только модератору/админу
  // ============================================================
  function wireModeratorLink() {
    var links = document.querySelectorAll("[data-mod-link]");
    if (!links.length) return;
    var isMod = API.tokens.isAuthed && API.tokens.isModerator();
    try {
      if (isMod) localStorage.setItem("fh_role", "moderator");
      else if (API.tokens.isAuthed) localStorage.removeItem("fh_role");
    } catch (e) {}
    links.forEach(function (el) { el.hidden = !isMod; });
  }

  // ============================================================
  // АВТОРИЗАЦИЯ
  // ============================================================
  function wireAuth() {
    var forms = document.querySelectorAll("[data-auth-form]");
    if (!forms.length) return;
    forms.forEach(function (form) {
      var mode = form.getAttribute("data-auth-form");
      var emailEl = form.querySelector('input[type="email"]');
      var passEl = form.querySelector('input[type="password"]');
      var submitBtn = form.querySelector('button[type="submit"]');
      var redirect = form.getAttribute("data-redirect") || "cabinet.html";

      form.addEventListener("submit", function (e) {
        e.preventDefault();

        var email = (emailEl && emailEl.value || "").trim();
        var pass = (passEl && passEl.value || "");

        var emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
        setFieldError(emailEl, emailOk ? null : "Введите корректный адрес почты");

        var isRegister = mode === "register";

        var passOk = true;

        if (isRegister) {
          passOk = pass.length >= 8;
          setFieldError(
            passEl,
            passOk ? null : "Пароль должен содержать минимум 8 символов"
          );
        } else {
          setFieldError(passEl, null);
        }

        if (!emailOk || !passOk) return;

        var op =
          isRegister
            ? API.auth.register(email, pass)
            : API.auth.login(email, pass);

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.dataset._t = submitBtn.textContent;
          submitBtn.textContent = "Подождите…";
        }

        op.then(function () {
          window.location.href = redirect;
        }).catch(function (err) {
          var msg =
            err && err.status === 401
              ? "Неверная почта или пароль"
              : err && err.status === 409
              ? "Пользователь с такой почтой уже существует"
              : (err && err.message) || "Не удалось выполнить запрос";

          setFieldError(passEl, msg);
        }).then(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset._t || "Продолжить";
          }
        });
      });
    });
  }

  // ============================================================
  // ПОИСК
  // ============================================================
  function wireSearch() {
    var page = document.body.dataset.page;
    if (page !== "cargo" && page !== "transport") return;
    var listEl = document.querySelector(".result-list");
    if (!listEl) return;

    var type = page === "cargo" ? "CARGO" : "TRANSPORT";
    var subbar = document.querySelector(".subbar");
    var originEl = subbar ? subbar.querySelectorAll(".input")[0] : null;
    var destEl = subbar ? subbar.querySelectorAll(".input")[1] : null;
    var searchBtn = subbar ? subbar.querySelector(".btn") : null;
    var sortSel = document.querySelector(".results__head .select");
    var applyBtn = document.querySelector(".filters .btn--block");

    listEl.innerHTML = info("Загрузка объявлений…");

    function sortParams() {
      var v = sortSel ? sortSel.value : "";
      if (v === "По цене") return { sort: "price", order: "asc" };
      if (v === "По расстоянию") return { sort: "distanceKm", order: "asc" };
      return { sort: "created_at", order: "desc" };
    }
    function run() {
      var q = Object.assign({ type: type, page: 0, size: 20 }, sortParams());
      if (originEl && originEl.value.trim()) q.origin = originEl.value.trim();
      if (destEl && destEl.value.trim()) q.destination = destEl.value.trim();
      listEl.innerHTML = info("Загрузка объявлений…");
      API.search.listings(q).then(render).catch(function () {
        listEl.innerHTML = info("Не удалось загрузить объявления. Попробуйте обновить страницу.");
      });
    }
    function render(data) {
      var items = (data && data.items) || [];
      listEl.innerHTML = items.length ? items.map(card).join("") : info("Ничего не найдено по заданным условиям.");
      var total = data && typeof data.total === "number" ? data.total : items.length;
      var countEl = document.querySelector(".results__count");
      if (countEl) countEl.innerHTML = "Показано <b>1–" + items.length + "</b> из " + fmtNum(total) + " объявлений";
      var subCount = document.querySelector(".subbar__count");
      if (subCount) subCount.innerHTML = "Найдено: <b>" + fmtNum(total) + "</b>";
    }
    function card(it) {
      var meta = [];
      if (type === "CARGO") {
        if (it.cargoType) meta.push("<span>" + esc(it.cargoType) + "</span>");
        if (it.weight != null) meta.push("<span>" + fmtNum(it.weight) + " т</span>");
        if (it.volume != null) meta.push("<span>" + fmtNum(it.volume) + " м³</span>");
      } else {
        if (it.transportType) meta.push("<span>" + esc(it.transportType) + "</span>");
        if (it.maxWeight != null) meta.push("<span>до " + fmtNum(it.maxWeight) + " т</span>");
        if (it.maxVolume != null) meta.push("<span>до " + fmtNum(it.maxVolume) + " м³</span>");
      }
      if (it.created_at) meta.push("<span>" + fmtDate(it.created_at) + "</span>");
      var detail = (type === "CARGO" ? "listing-detail.html" : "listing-detail-transport.html") + "?id=" + encodeURIComponent(it.id);
      var price = (type === "CARGO" && it.price != null)
        ? '<div><div class="price">' + fmtNum(it.price) + ' €</div><div class="price__sub">за перевозку</div></div>' : "";
      return '<article class="result-card"><div class="result-card__body">'
        + '<div class="result-card__route">' + esc(it.origin) + ' <span class="arrow">→</span> ' + esc(it.destination) + '</div>'
        + '<div class="meta">' + meta.join("") + '</div></div>'
        + '<div class="result-card__aside">' + price
        + '<div class="result-card__carrier">' + esc(it.title || "") + '</div>'
        + '<a href="' + detail + '" class="btn btn--primary">Подробнее</a></div></article>';
    }

    if (searchBtn) searchBtn.addEventListener("click", function (e) { e.preventDefault(); run(); });
    if (applyBtn) applyBtn.addEventListener("click", function (e) { e.preventDefault(); run(); });
    if (sortSel) sortSel.addEventListener("change", run);
    [originEl, destEl].forEach(function (el) {
      if (el) el.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); run(); } });
    });
    run();
  }

  // ============================================================
  // КАБИНЕТ — мои объявления (GET /api/v1/listings/, Bearer)
  // ============================================================
  function wireCabinet() {
    var menu = document.querySelector("[data-account-menu]");
    var table = document.querySelector(".ad-table");
    if (!menu || !table) return;

    if (!API.tokens.isAuthed) { window.location.replace("auth.html"); return; }

    API.users.me()
      .then(function (user) {
        var email = user.email;
        var name = user.name || email.split("@")[0];

        var nameEl = document.querySelector(".profile-card__name");
        var mailEl = document.querySelector(".profile-card__email");
        var avatar = document.querySelector(".avatar");

        if (nameEl) nameEl.textContent = name;
        if (mailEl) mailEl.textContent = email;
        if (avatar) avatar.textContent = (name[0] || "U").toUpperCase();
      })
      .catch(function (err) {
        console.error("Не удалось загрузить профиль:", err);
      });

    var tbody = table.querySelector("tbody");
    function load() {
      tbody.innerHTML = '<tr><td colspan="5" style="padding:24px;color:var(--text-muted)">Загрузка…</td></tr>';
      API.listings.mine().then(function (items) {
        items = items || [];
        if (!items.length) {
          tbody.innerHTML = '<tr><td colspan="5" style="padding:24px;color:var(--text-muted)">У вас пока нет объявлений.</td></tr>';
          return;
        }
        tbody.innerHTML = items.map(rowHtml).join("");
      }).catch(function (err) {
        var m = err && err.status === 401 ? "Сессия истекла — войдите снова." : "Не удалось загрузить объявления.";
        tbody.innerHTML = '<tr><td colspan="5" style="padding:24px;color:var(--text-muted)">' + esc(m) + '</td></tr>';
      });
    }
    function rowHtml(it) {
      var isCargo = it.type === "CARGO";
      var st = LISTING_STATUS[it.status] || [it.status || "", "status--draft"];
      var typeWeight, price;
      if (isCargo) {
        var c = it.cargo || {};
        typeWeight = esc(c.cargoType || "Груз") + (c.weight != null ? "<br>" + fmtNum(c.weight) + " т" : "");
        price = c.price != null ? fmtNum(c.price) + " €" : "—";
      } else {
        var t = it.transport || {};
        typeWeight = esc(t.transportType || "Транспорт") + (t.maxWeight != null ? "<br>до " + fmtNum(t.maxWeight) + " т" : "");
        price = "—";
      }
      var detail = (isCargo ? "listing-detail.html" : "listing-detail-transport.html") + "?id=" + encodeURIComponent(it.id);
      var edit = (isCargo ? "edit-cargo.html" : "edit-transport.html") + "?id=" + encodeURIComponent(it.id);
      var eye = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
      var pen = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
      var bin = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';
      return '<tr>'
        + '<td><div class="ad-route">' + routeText(it.route) + '</div><span class="status ' + st[1] + '">' + esc(st[0]) + '</span></td>'
        + '<td>' + typeWeight + '</td>'
        + '<td class="ad-price">' + price + '</td>'
        + '<td>' + fmtDate(it.created_at) + '</td>'
        + '<td class="td-actions">'
        + '<a href="' + detail + '" class="icon-btn" aria-label="Просмотр">' + eye + '</a>'
        + '<a href="' + edit + '" class="icon-btn" aria-label="Редактировать">' + pen + '</a>'
        + '<button class="icon-btn icon-btn--danger" data-del-id="' + esc(it.id) + '" aria-label="Удалить">' + bin + '</button>'
        + '</td></tr>';
    }

    tbody.addEventListener("click", function (e) {
      var del = e.target.closest("[data-del-id]");
      if (!del) return;
      if (!window.confirm("Удалить объявление?")) return;
      del.disabled = true;
      API.listings.remove(del.getAttribute("data-del-id")).then(load).catch(function () {
        del.disabled = false; alert("Не удалось удалить объявление.");
      });
    });

    load();
  }

  // ============================================================
  // ОЧЕРЕДЬ МОДЕРАЦИИ (GET /api/v1/moderation/queue, Bearer)
  // ============================================================
  function wireModerationQueue() {
    var listEl = document.querySelector(".request-list");
    if (!listEl) return;
    if (!API.tokens.isAuthed) { window.location.replace("auth.html"); return; }

    listEl.innerHTML = info("Загрузка очереди…");
    API.moderation.queue().then(function (items) {
      items = items || [];
      listEl.innerHTML = items.length ? items.map(card).join("") : info("Очередь пуста — новых заявок нет.");
    }).catch(function (err) {
      var m = err && err.status === 401 ? "Недостаточно прав или сессия истекла." : "Не удалось загрузить очередь.";
      listEl.innerHTML = info(m);
    });

    function card(it) {
      var isCargo = (it.type || "").toUpperCase() === "CARGO";
      var icon = isCargo
        ? '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8l-9-5-9 5v8l9 5z"/><path d="M3 8l9 5 9-5"/></svg>'
        : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>';
      var detail = (isCargo ? "moderator-detail-cargo.html" : "moderator-detail-transport.html") + "?id=" + encodeURIComponent(it.listingId);
      return '<article class="request-card">'
        + '<div class="request-card__icon request-card__icon--' + (isCargo ? "cargo" : "transport") + '">' + icon + '</div>'
        + '<div class="request-card__body">'
        + '<span class="badge badge--green">' + (isCargo ? "Груз" : "Транспорт") + '</span>'
        + '<div class="request-card__title">' + esc(it.listingTitle || it.description || "Без названия") + '</div>'
        + '<div class="request-card__route">' + routeText(it.route) + '</div>'
        + '</div>'
        + '<a href="' + detail + '" class="btn btn--outline">Просмотреть</a>'
        + '</article>';
    }
  }

  // ============================================================
  // ВЫХОД
  // ============================================================
  function wireLogout() {
    document.querySelectorAll("[data-logout]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        API.auth.logout().then(function () { window.location.href = "index.html"; });
      });
    });
  }

  // ============================================================
  // КНОПКА ВОЙТИ / ВЫЙТИ В ШАПКЕ
  // ============================================================
  function wireLoginButton() {
    console.log("wireLoginButton called");

    var btn = document.querySelector("[data-login-btn]");
    if (!btn) return;

    var actions = btn.parentElement;
    var authed = API.tokens.isAuthed;
    console.log("isAuthed =", authed);

    var oldProfile = document.querySelector("[data-profile-btn]");
    if (oldProfile) oldProfile.remove();

    if (authed) {
      var profileBtn = document.createElement("a");
      profileBtn.href = "cabinet.html";
      profileBtn.className = "btn btn--outline";
      profileBtn.setAttribute("data-profile-btn", "");
      profileBtn.textContent = "Профиль";

      actions.insertBefore(profileBtn, btn);

      btn.innerHTML = 'Выйти <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path></svg>';
      btn.removeAttribute("href");

      btn.onclick = function (e) {
        e.preventDefault();
        API.auth.logout().then(function () {
          window.location.href = "index.html";
        });
      };
    } else {
      btn.innerHTML = 'Войти <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path></svg>';
      btn.setAttribute("href", "auth.html");
    }
  }

  // ============================================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ СБОРА ДАННЫХ ИЗ ВИЗАРДА
  // ============================================================
  function getVal(stepIndex, inputIndex) {
    var step = document.querySelectorAll("[data-wizard-step]")[stepIndex];
    if (!step) return null;
    var inputs = step.querySelectorAll("input, select, textarea");
    return (inputs[inputIndex] && inputs[inputIndex].value && inputs[inputIndex].value.trim()) || null;
  }

  function getSelect(stepIndex, index) {
    var step = document.querySelectorAll("[data-wizard-step]")[stepIndex];
    if (!step) return null;
    var sel = step.querySelectorAll("select")[index];
    return sel ? sel.value : null;
  }

  function getTextarea() {
    var ta = document.querySelector("textarea");
    return ta ? (ta.value || "").trim() : "";
  }

  function buildRoute() {
    var inputs = document.querySelectorAll(".wizard-step input");
    return {
      origin: {
        country: (inputs[0] && inputs[0].value) || "",
        city: (inputs[1] && inputs[1].value) || ""
      },
      destination: {
        country: (inputs[3] && inputs[3].value) || "",
        city: (inputs[4] && inputs[4].value) || ""
      },
      waypoints: []
    };
  }

  function buildCargoPayload() {
    return {
      type: "CARGO",
      title: getVal(0, 0) || "Объявление о грузе",
      description: getTextarea(),
      route: buildRoute(),
      cargo: {
        cargoType: getSelect(1, 0),
        weight: Number(getVal(1, 1)) || 0,
        length: Number(getVal(1, 2)) || 0,
        width: Number(getVal(1, 3)) || 0,
        height: Number(getVal(1, 4)) || 0,
        volume: null,
        price: Number(getVal(2, 0)) || 0
      }
    };
  }

  function buildTransportPayload() {
    return {
      type: "TRANSPORT",
      title: getVal(0, 0) || "Объявление о транспорте",
      description: getTextarea(),
      route: buildRoute(),
      transport: {
        transportType: getSelect(1, 0),
        maxWeight: Number(getVal(1, 1)) || 0,
        maxVolume: Number(getVal(1, 2)) || 0
      }
    };
  }

  function setButtonLoading(btn, loading, defaultText) {
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? "Сохранение…" : defaultText;
  }

  // ============================================================
  // СОЗДАНИЕ ГРУЗА
  // ============================================================
  function wireCreateCargo() {
    console.log("wireCreateCargo init");

    if (document.body.dataset.page !== "cargo") return;

    // --- Кнопка «Опубликовать» ---
    var publishBtn = document.getElementById("publishBtn");
    if (publishBtn) {
      publishBtn.addEventListener("click", async function () {
        console.log("CLICK publish cargo");
        var payload = buildCargoPayload();
        console.log("PAYLOAD:", payload);

        setButtonLoading(publishBtn, true, "Опубликовать объявление");
        try {
          var res = await API.listings.create(payload);
          console.log("CREATED:", res);

          // Отправляем на модерацию
          if (res && res.id) {
            await API.listings.sendToModeration(res.id);
            console.log("SENT TO MODERATION:", res.id);
          }

          window.location.href = "cabinet.html";
        } catch (e) {
          console.error("CREATE/MODERATION ERROR:", e);
          alert("Ошибка публикации объявления: " + (e.message || "неизвестная ошибка"));
          setButtonLoading(publishBtn, false, "Опубликовать объявление");
        }
      });
    }

    // --- Кнопка «Сохранить черновик» ---
    // Ищем ссылку с текстом «Сохранить черновик» в блоке .publish__actions
    var draftLink = findDraftButton();
    if (draftLink) {
      // Превращаем ссылку в кнопку — перехватываем клик и останавливаем переход
      draftLink.addEventListener("click", async function (e) {
        e.preventDefault();
        console.log("CLICK save draft cargo");

        var payload = buildCargoPayload();
        console.log("DRAFT PAYLOAD:", payload);

        var origText = draftLink.textContent;
        draftLink.textContent = "Сохранение…";
        draftLink.style.pointerEvents = "none";

        try {
          var res = await API.listings.create(payload);
          console.log("DRAFT CREATED:", res);
          // Бэк создаёт листинг со статусом DRAFT — просто переходим в кабинет
          window.location.href = "cabinet.html";
        } catch (e) {
          console.error("DRAFT ERROR:", e);
          alert("Ошибка сохранения черновика: " + (e.message || "неизвестная ошибка"));
          draftLink.textContent = origText;
          draftLink.style.pointerEvents = "";
        }
      });
    } else {
      console.warn("Draft button not found on cargo page");
    }
  }

  // ============================================================
  // СОЗДАНИЕ ТРАНСПОРТА
  // ============================================================
  function wireCreateTransport() {
    console.log("wireCreateTransport init");

    if (document.body.dataset.page !== "transport") return;

    // --- Кнопка «Опубликовать» ---
    var publishBtn = document.getElementById("publishBtn");
    if (publishBtn) {
      publishBtn.addEventListener("click", async function () {
        console.log("CLICK publish transport");
        var payload = buildTransportPayload();
        console.log("PAYLOAD:", payload);

        setButtonLoading(publishBtn, true, "Опубликовать объявление");
        try {
          var res = await API.listings.create(payload);
          console.log("CREATED:", res);

          // Отправляем на модерацию
          if (res && res.id) {
            await API.listings.sendToModeration(res.id);
            console.log("SENT TO MODERATION:", res.id);
          }

          window.location.href = "cabinet.html";
        } catch (e) {
          console.error("CREATE/MODERATION ERROR:", e);
          alert("Ошибка публикации объявления: " + (e.message || "неизвестная ошибка"));
          setButtonLoading(publishBtn, false, "Опубликовать объявление");
        }
      });
    }

    // --- Кнопка «Сохранить черновик» ---
    var draftLink = findDraftButton();
    if (draftLink) {
      draftLink.addEventListener("click", async function (e) {
        e.preventDefault();
        console.log("CLICK save draft transport");

        var payload = buildTransportPayload();
        console.log("DRAFT PAYLOAD:", payload);

        var origText = draftLink.textContent;
        draftLink.textContent = "Сохранение…";
        draftLink.style.pointerEvents = "none";

        try {
          var res = await API.listings.create(payload);
          console.log("DRAFT CREATED:", res);
          window.location.href = "cabinet.html";
        } catch (e) {
          console.error("DRAFT ERROR:", e);
          alert("Ошибка сохранения черновика: " + (e.message || "неизвестная ошибка"));
          draftLink.textContent = origText;
          draftLink.style.pointerEvents = "";
        }
      });
    } else {
      console.warn("Draft button not found on transport page");
    }
  }

  // Находит кнопку/ссылку «Сохранить черновик» в блоке publish__actions
  function findDraftButton() {
    // Сначала ищем в .publish__actions
    var actions = document.querySelector(".publish__actions");
    if (actions) {
      var links = actions.querySelectorAll("a, button");
      for (var i = 0; i < links.length; i++) {
        if (links[i].textContent.trim().indexOf("Сохранить") !== -1) {
          return links[i];
        }
      }
    }
    // Запасной вариант — ищем по всей странице
    var allLinks = document.querySelectorAll("a[href='cabinet.html'], a[href='cabinet.html ']");
    for (var j = 0; j < allLinks.length; j++) {
      if (allLinks[j].textContent.trim().indexOf("Сохранить") !== -1) {
        return allLinks[j];
      }
    }
    return null;
  }

  // ============================================================
  // SETTINGS PAGE
  // ============================================================
  function wireSettings() {
    if (document.body.dataset.page !== "settings") return;

    if (!API.tokens.isAuthed) {
      window.location.replace("auth.html");
      return;
    }

    var form = document.querySelector(".settings-form");
    if (!form) return;

    var inputs = form.querySelectorAll("input");
    var nameInput = inputs[0];
    var emailInput = inputs[1];
    var phoneInput = inputs[2];

    API.users.me()
      .then(function (user) {
        var email = user.email;
        var name = user.name || email.split("@")[0];
        var phone = user.phone || "";

        var nameEl = document.querySelector(".profile-card__name");
        var emailEl = document.querySelector(".profile-card__email");
        var avatar = document.querySelector(".avatar");

        if (nameEl) nameEl.textContent = name;
        if (emailEl) emailEl.textContent = email;
        if (avatar) avatar.textContent = (name[0] || "U").toUpperCase();

        if (emailInput) {
          emailInput.value = email;
          emailInput.readOnly = true;
          emailInput.classList.add("input--readonly");
        }

        if (nameInput) {
          nameInput.value = name;
          if (!nameInput.value.trim()) nameInput.placeholder = "Введите имя";
          nameInput.addEventListener("input", function () {
            nameInput.placeholder = nameInput.value.trim() ? "" : "Введите имя";
          });
        }

        if (phoneInput) {
          phoneInput.value = phone;
          if (!phoneInput.value.trim()) phoneInput.placeholder = "Введите телефон";
          phoneInput.addEventListener("input", function () {
            phoneInput.placeholder = phoneInput.value.trim() ? "" : "Введите телефон";
          });
        }
      })
      .catch(function (err) {
        console.error(err);
        alert("Не удалось загрузить данные пользователя");
      });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = (nameInput.value || "").trim();
      var phone = (phoneInput.value || "").trim();

      if (!name) {
        setFieldError(nameInput, "Введите имя");
        return;
      }

      setFieldError(nameInput, null);

      API.users.updateMe({ name: name, phone: phone || null })
        .then(function (updatedUser) {
          var actualName = updatedUser.name || updatedUser.email.split("@")[0];
          var nameEl = document.querySelector(".profile-card__name");
          var avatar = document.querySelector(".avatar");
          if (nameEl) nameEl.textContent = actualName;
          if (avatar) avatar.textContent = (actualName[0] || "U").toUpperCase();
          alert("Данные успешно сохранены");
        })
        .catch(function (err) {
          console.error(err);
          alert("Не удалось сохранить изменения");
        });
    });
  }

  // ============================================================
  // EDIT TRANSPORT
  // ============================================================
  function wireEditTransport() {
    console.log("wireEditTransport started");

    if (document.body.dataset.page !== "edit-transport") return;

    if (!API.tokens.isAuthed) {
      window.location.replace("auth.html");
      return;
    }

    var id = new URLSearchParams(location.search).get("id");
    if (!id) return;

    var form = document.querySelector("form");
    if (!form) return;

    var btn = form.querySelector("button[type='submit']");

    function setField(key, value) {
      var el = form.querySelector('[data-field="' + key + '"]');
      if (el) el.value = value != null ? value : "";
    }

    function getField(key) {
      var el = form.querySelector('[data-field="' + key + '"]');
      return el ? el.value : "";
    }

    API.listings.get(id, { auth: true })
      .then(function (data) {
        if (!data) return;

        setField("title", data.title);
        setField("description", data.description);

        setField("route.origin.country", data.route && data.route.origin && data.route.origin.country);
        setField("route.origin.city", data.route && data.route.origin && data.route.origin.city);

        setField("route.destination.country", data.route && data.route.destination && data.route.destination.country);
        setField("route.destination.city", data.route && data.route.destination && data.route.destination.city);

        setField("transport.transportType", data.transport && data.transport.transportType);
        setField("transport.maxWeight", data.transport && data.transport.maxWeight);
        setField("transport.maxVolume", data.transport && data.transport.maxVolume);
      })
      .catch(function (err) {
        console.error(err);
        if (err.status === 403 || err.status === 401) {
          alert("Нет доступа к объявлению");
          window.location.replace("cabinet.html");
        } else {
          alert("Ошибка загрузки объявления");
        }
      });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var payload = {
        type: "TRANSPORT",
        title: getField("title"),
        description: getField("description"),
        route: {
          origin: {
            country: getField("route.origin.country"),
            city: getField("route.origin.city")
          },
          destination: {
            country: getField("route.destination.country"),
            city: getField("route.destination.city")
          },
          waypoints: []
        },
        transport: {
          transportType: getField("transport.transportType"),
          maxWeight: Number(getField("transport.maxWeight")),
          maxVolume: Number(getField("transport.maxVolume"))
        }
      };

      btn.disabled = true;

      API.listings.update(id, payload)
        .then(function () {
          window.location.href = "cabinet.html";
        })
        .catch(function (err) {
          console.error(err);
          alert("Ошибка сохранения");
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  }

  // ============================================================
  // ПЕРЕКЛЮЧЕНИЕ ГРУЗ <-> ТРАНСПОРТ
  // ============================================================
  function wireListingTypeSelector() {
    var wrapper = document.querySelector("[data-type-select]");
    if (!wrapper) return;

    var select = wrapper.querySelector("select");
    if (!select) return;

    select.addEventListener("change", function () {
      var value = (select.value || "").trim().toLowerCase();
      if (value === "транспорт") window.location.href = "create-transport.html";
      if (value === "груз") window.location.href = "create-cargo.html";
    });
  }

})();
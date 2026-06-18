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
      wireModeratorProfile();
      wireModeratorActions();
      wireModeratorDetailCargo();
      wireModeratorDetailTransport();
      wireLogout();
      wireLoginButton();
      wireWizardMap();       // карта + геокодинг на страницах создания объявления
      wireCreateCargo();
      wireCreateTransport();
      wireSettings();
      wireEditTransport();
      wireEditCargo();
      wireTransportDetail();
      wireCargoDetail();
      wireListingTypeSelector();
      wireSearchTypeSelector();
      wireCreateListingButton();
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
          typeWeight = esc(c.cargoType || "Груз") + (c.weight != null ? "<br>" + fmtNum(c.weight) + " кг" : "");
          price = c.price != null ? fmtNum(c.price) + " €" : "—";
        } else {
          var t = it.transport || {};
          typeWeight = esc(t.transportType || "Транспорт") + (t.maxWeight != null ? "<br>до " + fmtNum(t.maxWeight) + " кг" : "");
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
    // MODERATOR PROFILE
    // ============================================================
    function wireModeratorProfile() {

      if (!location.pathname.includes("moderator")) {
        return;
      }

      if (!API.tokens.isAuthed) {
        return;
      }

      API.users.me()
        .then(function(user) {

          var nameElement =
            document.querySelector(".userchip__name");

          if (nameElement) {
            nameElement.textContent =
              user.name ||
              user.email ||
              "Модератор";
          }

          var roleElement =
            document.querySelector(".userchip__role");

          if (roleElement) {
            roleElement.textContent = "Модератор";
          }
        })
        .catch(function(err) {
          console.error(
            "Failed to load moderator profile",
            err
          );
        });
    }

    // ============================================================
    // MODERATION ACTIONS
    // ============================================================
    function wireModeratorActions() {

      var page = document.body.dataset.page;

      if (
        page !== "moderator-detail-cargo" &&
        page !== "moderator-detail-transport"
      ) {
        return;
      }

      var id = new URLSearchParams(location.search).get("id");

      if (!id) {
        return;
      }

      var approveBtn = document.querySelector("[data-approve]");
      var rejectBtn = document.querySelector("[data-reject]");
      var reasonField = document.querySelector("[data-reject-reason]");

      // ----------------------------
      // APPROVE
      // ----------------------------

      if (approveBtn) {

        approveBtn.addEventListener("click", async function () {

          try {

            approveBtn.disabled = true;

            await API.moderation.approve(id);

            alert("Объявление успешно одобрено");

            window.location.href = "moderator.html";

          } catch (err) {

            console.error(err);
            alert("Не удалось одобрить объявление");

            approveBtn.disabled = false;
          }
        });
      }

      // ----------------------------
      // REJECT
      // ----------------------------

      if (rejectBtn) {

        rejectBtn.addEventListener("click", async function () {

          var reason = "";

          if (reasonField) {
            reason = reasonField.value.trim();
          }

          if (!reason) {
            alert("Укажите причину отклонения");
            return;
          }

          try {

            rejectBtn.disabled = true;

            await API.moderation.reject(id, reason);

            alert("Объявление отклонено");

            window.location.href = "moderator.html";

          } catch (err) {

            console.error(err);
            alert("Не удалось отклонить объявление");

            rejectBtn.disabled = false;
          }
        });
      }
    }

    // ============================================================
    // MODERATOR DETAIL TRANSPORT
    // ============================================================

    function wireModeratorDetailTransport() {

      if (document.body.dataset.page !== "moderator-detail-transport") {
        return;
      }

      var id = new URLSearchParams(location.search).get("id");

      if (!id) {
        console.error("Moderation listing id not found");
        return;
      }

      (async function () {

        try {

          var queue = await API.moderation.queue();

          var listing = queue.find(function (item) {
            return item.listingId === id;
          });

          if (!listing) {
            console.error("Listing not found in moderation queue");
            return;
          }

          var route = listing.route || {};
          var origin = route.origin || {};
          var dest = route.destination || {};
          var transport = listing.transport || {};

          // ----------------------------
          // HEADER
          // ----------------------------

          var title = document.querySelector(".detail-head__title");

          if (title) {
            title.textContent =
              (origin.city || "") +
              " → " +
              (dest.city || "");
          }

          var sub = document.querySelector(".detail-head__sub");

          if (sub) {
            sub.textContent =
              "Расстояние: " +
              Math.round(route.distanceKm || 0) +
              " км • Опубликовано " +
              fmtDate(listing.createdAt);
          }

          // ----------------------------
          // ROUTE
          // ----------------------------

          var originCity = document.querySelector("[data-origin-city]");
          if (originCity) originCity.textContent = origin.city || "";

          var originCountry =
            document.querySelector("[data-origin-country]");

          if (originCountry) {
            originCountry.textContent =
              (origin.country || "")
                .substring(0, 2)
                .toUpperCase();
          }

          var destCity =
            document.querySelector("[data-dest-city]");

          if (destCity) {
            destCity.textContent = dest.city || "";
          }

          var destCountry =
            document.querySelector("[data-dest-country]");

          if (destCountry) {
            destCountry.textContent =
              (dest.country || "")
                .substring(0, 2)
                .toUpperCase();
          }

          var routeLine =
            document.querySelector(".route-line");

          if (routeLine) {
            routeLine.innerHTML =
              'Прямой рейс<span class="dash"></span>' +
              Math.round(route.distanceKm || 0) +
              " км";
          }

          // ----------------------------
          // TRANSPORT
          // ----------------------------

          var badge = document.querySelector(
            "[data-transport-type-badge]"
          );

          if (badge) {
            badge.textContent =
              transport.transportType || "Транспорт";
          }

          var transportType =
            document.querySelector("[data-transport-type]");

          if (transportType) {
            transportType.textContent =
              transport.transportType || "—";
          }

          var maxWeight =
            document.querySelector("[data-max-weight]");

          if (maxWeight) {
            maxWeight.textContent =
              transport.maxWeight != null
                ? transport.maxWeight + " т"
                : "—";
          }

          var maxVolume =
            document.querySelector("[data-max-volume]");

          if (maxVolume) {
            maxVolume.textContent =
              transport.maxVolume != null
                ? transport.maxVolume + " м³"
                : "—";
          }

          // ----------------------------
          // DESCRIPTION
          // ----------------------------

          var desc =
            document.querySelector("[data-description]");

          if (desc) {
            desc.textContent =
              listing.description || "";
          }

          // ----------------------------
          // OWNER
          // ----------------------------

          try {

            var owner =
              await API.users.get(listing.ownerId);

            var ownerName =
              document.querySelector("[data-owner-name]");

            var ownerEmail =
              document.querySelector("[data-owner-email]");

            var ownerPhone =
              document.querySelector("[data-owner-phone]");

            if (ownerName) {
              ownerName.textContent =
                owner.name || "Не указано";
            }

            if (ownerEmail) {
              ownerEmail.textContent =
                owner.email || "Не указано";
            }

            if (ownerPhone) {
              ownerPhone.textContent =
                owner.phone || "Не указан";
            }

          } catch (e) {
            console.error("Failed to load owner", e);
          }

        } catch (err) {

          console.error(err);
          alert("Ошибка загрузки заявки");

        }

      })();
    }

    function wireModeratorDetailCargo() {

      if (document.body.dataset.page !== "moderator-detail-cargo") {
        return;
      }
    
      var id = new URLSearchParams(location.search).get("id");
    
      if (!id) {
        console.error("Moderation listing id not found");
        return;
      }
    
      (async function () {
    
        try {
    
          var queue = await API.moderation.queue();
    
          var listing = queue.find(function (item) {
            return item.listingId === id;
          });
    
          if (!listing) {
            console.error("Listing not found in moderation queue");
            return;
          }
    
          var route = listing.route || {};
          var origin = route.origin || {};
          var dest = route.destination || {};
          var cargo = listing.cargo || {};
    
          // ----------------------------
          // HEADER
          // ----------------------------
    
          var title = document.querySelector(".detail-head__title");
          if (title) {
            title.textContent =
              (origin.city || "") + " → " + (dest.city || "");
          }
    
          var sub = document.querySelector(".detail-head__sub");
          if (sub) {
            sub.textContent =
              "Расстояние: " +
              Math.round(route.distanceKm || 0) +
              " км • Опубликовано " +
              fmtDate(listing.createdAt);
          }
    
          // ----------------------------
          // ROUTE
          // ----------------------------
    
          var originCity = document.querySelector("[data-origin-city]");
          if (originCity) originCity.textContent = origin.city || "";
    
          var originCountry = document.querySelector("[data-origin-country]");
          if (originCountry) {
            originCountry.textContent =
              (origin.country || "").substring(0, 2).toUpperCase();
          }
    
          var destCity = document.querySelector("[data-dest-city]");
          if (destCity) destCity.textContent = dest.city || "";
    
          var destCountry = document.querySelector("[data-dest-country]");
          if (destCountry) {
            destCountry.textContent =
              (dest.country || "").substring(0, 2).toUpperCase();
          }
    
          var routeLine = document.querySelector(".route-line");
          if (routeLine) {
            routeLine.innerHTML =
              'Прямой рейс<span class="dash"></span>' +
              Math.round(route.distanceKm || 0) +
              " км";
          }
    
          // ----------------------------
          // CARGO
          // ----------------------------
    
          var badge = document.querySelector(".badge");
          if (badge) {
            badge.textContent = cargo.cargoType || "Груз";
          }
    
          var cargoType = document.querySelector("[data-cargo-type]");
          if (cargoType) {
            cargoType.textContent = cargo.cargoType || "—";
          }
    
          var weight = document.querySelector("[data-weight]");
          if (weight) {
            weight.textContent =
              cargo.weight != null ? cargo.weight + " т" : "—";
          }
    
          var volume = document.querySelector("[data-volume]");
          if (volume) {
            volume.textContent =
              cargo.volume != null ? cargo.volume + " м³" : "—";
          }
    
          var dims = document.querySelector("[data-dimensions]");
          if (dims) {
            dims.textContent =
              (cargo.length || "—") + " × " +
              (cargo.width || "—") + " × " +
              (cargo.height || "—") + " м";
          }
    
          var desc = document.querySelector("[data-description]");
          if (desc) {
            desc.textContent = listing.description || "";
          }

          // ----------------------------
          // price
          // ----------------------------

          var price = document.querySelector("[data-cargo-price]");
          var pricePerKm = document.querySelector("[data-price-per-km]");

          if (price) {
            price.textContent =
              cargo.price != null
                ? cargo.price + " €"
                : "Цена не указана";
          }

          if (pricePerKm) {

            if (
              cargo.price != null &&
              route.distanceKm
            ) {

              pricePerKm.textContent =
                "= " +
                (cargo.price / route.distanceKm).toFixed(2) +
                " €/км";

            } else {

              pricePerKm.textContent = "";
            }
          }
    
          // ----------------------------
          // OWNER (ВТОРОЙ ЗАПРОС)
          // ----------------------------
    
          try {
    
            var owner = await API.users.get(listing.ownerId);
    
            var ownerName = document.querySelector("[data-owner-name]");
            var ownerEmail = document.querySelector("[data-owner-email]");
            var ownerPhone = document.querySelector("[data-owner-phone]");
    
            if (ownerName) {
              ownerName.textContent = owner.name || "Не указано";
            }
    
            if (ownerEmail) {
              ownerEmail.textContent = owner.email || "Не указано";
            }
    
            if (ownerPhone) {
              ownerPhone.textContent = owner.phone || "Не указан";
            }
    
          } catch (e) {
            console.error("Failed to load owner", e);
          }
    
        } catch (err) {
          console.error(err);
          alert("Ошибка загрузки заявки");
        }
    
      })();
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

    // Маппинг русских названий из <select> → enum-значения бэка
    var CARGO_TYPE_MAP = {
      "Генеральный": "GENERAL",
      "Рефрижератор": "REFRIGERATED",
      "Наливной": "LIQUID",
      "Выбрать": null
    };

    var TRANSPORT_TYPE_MAP = {
      "Тентованный": "TENTED",
      "Рефрижератор": "REFRIGERATED",
      "Бортовой": "FLATBED",
      "Выбрать": null
    };

    function toCargoTypeEnum(ruLabel) {
      return CARGO_TYPE_MAP[ruLabel] || ruLabel || null;
    }

    function toTransportTypeEnum(ruLabel) {
      return TRANSPORT_TYPE_MAP[ruLabel] || ruLabel || null;
    }

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

    // ============================================================
    // КАРТА И ГЕОКОДИНГ
    // ============================================================

    // Состояние карты — хранит текущие координаты и объекты Leaflet
    var mapState = {
      map: null,
      originMarker: null,
      destMarker: null,
      routeLayer: null,
      origin: null,     // { latitude, longitude, city, country }
      destination: null // { latitude, longitude, city, country }
    };

    // Иконки для маркеров
    function makeIcon(color) {
      return window.L && L.divIcon({
        className: "",
        html: '<div style="width:14px;height:14px;border-radius:50%;background:' + color + ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
    }

    // Инициализирует карту Leaflet внутри .map-box__area
    function initMap() {
      if (!window.L) return;
      var container = document.querySelector(".map-box__area");
      if (!container) return;

      // Убираем заглушку, ставим нормальный контейнер
      container.innerHTML = '<div id="wizard-map" style="width:100%;height:100%;border-radius:inherit"></div>';

      mapState.map = L.map("wizard-map", { zoomControl: true }).setView([51.0, 10.0], 5);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18
      }).addTo(mapState.map);
    }

    // Обновляет маркер на карте
    function setMarker(role, lat, lon, label) {
      if (!mapState.map) return;
      var color = role === "origin" ? "#2563eb" : "#dc2626";
      var icon = makeIcon(color);

      if (role === "origin") {
        if (mapState.originMarker) mapState.originMarker.remove();
        mapState.originMarker = L.marker([lat, lon], { icon: icon })
          .addTo(mapState.map)
          .bindPopup(label || "Отправление");
      } else {
        if (mapState.destMarker) mapState.destMarker.remove();
        mapState.destMarker = L.marker([lat, lon], { icon: icon })
          .addTo(mapState.map)
          .bindPopup(label || "Назначение");
      }
    }

    // Подгоняет карту под видимые маркеры
    function fitMapBounds() {
      if (!mapState.map) return;
      var points = [];
      if (mapState.origin)      points.push([mapState.origin.latitude,      mapState.origin.longitude]);
      if (mapState.destination) points.push([mapState.destination.latitude, mapState.destination.longitude]);
      if (points.length === 1)  mapState.map.setView(points[0], 10);
      if (points.length === 2)  mapState.map.fitBounds(points, { padding: [40, 40] });
    }

    // Рисует маршрут по polyline из /routes/calculate
    // ORS возвращает encoded polyline (строка), декодируем через L.Polyline.fromEncoded если доступен,
    // иначе через нашу встроенную функцию
    function drawRoute(polyline) {
      if (!mapState.map || !polyline) return;
      if (mapState.routeLayer) { mapState.routeLayer.remove(); mapState.routeLayer = null; }

      var latlngs = decodePolyline(polyline);
      if (!latlngs || !latlngs.length) return;

      mapState.routeLayer = L.polyline(latlngs, {
        color: "#2563eb",
        weight: 4,
        opacity: 0.75,
        lineJoin: "round"
      }).addTo(mapState.map);

      mapState.map.fitBounds(mapState.routeLayer.getBounds(), { padding: [40, 40] });
    }

    // Стандартный Google/ORS encoded polyline decoder
    function decodePolyline(encoded) {
      var result = [];
      var index = 0, lat = 0, lng = 0;
      while (index < encoded.length) {
        var b, shift = 0, result2 = 0;
        do { b = encoded.charCodeAt(index++) - 63; result2 |= (b & 0x1f) << shift; shift += 5; } while (b >= 32);
        var dlat = (result2 & 1) ? ~(result2 >> 1) : (result2 >> 1); lat += dlat;
        shift = 0; result2 = 0;
        do { b = encoded.charCodeAt(index++) - 63; result2 |= (b & 0x1f) << shift; shift += 5; } while (b >= 32);
        var dlng = (result2 & 1) ? ~(result2 >> 1) : (result2 >> 1); lng += dlng;
        result.push([lat / 1e5, lng / 1e5]);
      }
      return result;
    }

    // Запрашивает маршрут у бэка и рисует его на карте
    async function updateMapRoute() {
      if (!mapState.origin || !mapState.destination) return;
      try {
        var routeData = await API.routes.calculate({
          origin:      { latitude: mapState.origin.latitude,      longitude: mapState.origin.longitude },
          destination: { latitude: mapState.destination.latitude, longitude: mapState.destination.longitude },
          waypoints:   []
        });

        if (routeData && routeData.polyline) {
          drawRoute(routeData.polyline);

          // Показываем расстояние и время в шапке карты
          var head = document.querySelector(".map-box__head");
          if (head && routeData.distanceKm) {
            var km = Math.round(routeData.distanceKm);
            var hrs = routeData.estimatedDurationMinutes ? Math.round(routeData.estimatedDurationMinutes / 60) : null;
            head.textContent = "Маршрут на карте — " + km + " км" + (hrs ? " (~" + hrs + " ч)" : "");
          }
        }
      } catch (e) {
        console.warn("Route calculate failed:", e);
      }
    }

    // Геокодирует адресную строку → возвращает первый результат или null
    // Принимает полную строку: «Берлин, Германия» или «ул. Мясницкая 20, Москва»
    async function geocodeAddress(query) {
      if (!query || !query.trim()) return null;
      try {
        // /api/v1/routes/geocode?query=... возвращает массив LocationResult
        var results = await API.routes.geocode(query.trim());
        if (Array.isArray(results) && results.length > 0) {
          var r = results[0];
          return {
            latitude:  Number(r.latitude),
            longitude: Number(r.longitude),
            city:      r.city    || null,
            country:   r.country || null,
            displayName: r.displayName || query
          };
        }
      } catch (e) {
        console.warn("Geocode failed:", query, e);
      }
      return null;
    }

    // Показывает autocomplete-подсказки под input-ом
    function showSuggestions(input, results, onSelect) {
      // Удаляем старый список
      var old = input.parentNode.querySelector(".geocode-suggestions");
      if (old) old.remove();
      if (!results || !results.length) return;

      var list = document.createElement("ul");
      list.className = "geocode-suggestions";
      list.style.cssText = "position:absolute;z-index:9999;background:#fff;border:1px solid var(--border,#e2e8f0);border-radius:8px;padding:4px 0;list-style:none;margin:0;width:100%;max-height:180px;overflow-y:auto;box-shadow:0 4px 16px rgba(0,0,0,.12);top:calc(100% + 4px);left:0";

      results.slice(0, 5).forEach(function (r) {
        var li = document.createElement("li");
        li.textContent = r.displayName || (r.city ? r.city + ", " + r.country : "");
        li.style.cssText = "padding:8px 14px;cursor:pointer;font-size:14px;color:var(--text,#1e293b)";
        li.addEventListener("mouseenter", function () { li.style.background = "#f1f5f9"; });
        li.addEventListener("mouseleave", function () { li.style.background = ""; });
        li.addEventListener("mousedown", function (e) {
          e.preventDefault(); // не даём blur сработать раньше
          onSelect(r, li.textContent);
          list.remove();
        });
        list.appendChild(li);
      });

      // Позиционируем относительно input-icon обёртки
      var wrap = input.closest(".input-icon") || input.parentNode;
      wrap.style.position = "relative";
      wrap.appendChild(list);

      // Закрываем при blur
      function onBlur() {
        setTimeout(function () { if (list.parentNode) list.remove(); }, 150);
        input.removeEventListener("blur", onBlur);
      }
      input.addEventListener("blur", onBlur);
    }

    // Подвешивает geocode-автодополнение на один input
    // role: "origin" или "destination"
    // onResolved(coords) — колбэк когда координаты определены
    function attachGeocodeInput(input, role, onResolved) {
      if (!input) return;
      var debounceTimer = null;

      input.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        var q = input.value.trim();
        if (q.length < 2) return;

        debounceTimer = setTimeout(async function () {
          try {
            var results = await API.routes.geocode(q);
            if (!Array.isArray(results) || !results.length) return;
            showSuggestions(input, results, function (r, label) {
              input.value = label;
              onResolved({
                latitude:    Number(r.latitude),
                longitude:   Number(r.longitude),
                city:        r.city    || null,
                country:     r.country || null,
                displayName: r.displayName || label
              });
            });
          } catch (e) { /* тихо игнорируем */ }
        }, 350);
      });
    }

    // Главная функция — инициализирует карту и вешает геокодинг на поля шага 1
    function wireWizardMap() {
      // Только на страницах создания объявления
      var page = document.body.dataset.page;
      if (page !== "cargo" && page !== "transport") return;

      // Загружаем Leaflet CSS и JS, потом инициализируем
      if (!window.L) {
        var cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(cssLink);

        var script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
        script.onload = function () { setupMapAndGeocoding(); };
        document.head.appendChild(script);
      } else {
        setupMapAndGeocoding();
      }
    }

    function setupMapAndGeocoding() {
      initMap();

      // Поля шага 1 в порядке: страна_откуда, город_откуда, адрес_погрузки, страна_куда, город_куда, адрес_разгрузки
      var step0 = document.querySelectorAll("[data-wizard-step]")[0];
      if (!step0) return;

      var allInputs = step0.querySelectorAll("input");
      // [0] страна откуда, [1] город откуда, [2] адрес погрузки
      // [3] страна куда,   [4] город куда,   [5] адрес разгрузки

      // Когда выбран пункт отправления — ставим маркер и обновляем маршрут
      function onOriginResolved(coords) {
        mapState.origin = coords;
        setMarker("origin", coords.latitude, coords.longitude, coords.displayName);
        fitMapBounds();
        updateMapRoute();
      }

      // Когда выбран пункт назначения
      function onDestResolved(coords) {
        mapState.destination = coords;
        setMarker("dest", coords.latitude, coords.longitude, coords.displayName);
        fitMapBounds();
        updateMapRoute();
      }

      // Вешаем автодополнение:
      // Приоритет точности: если заполнен «точный адрес» — геокодируем его,
      // если нет — геокодируем «город + страна»
      // Для простоты: автодополнение на поле «город» и поле «точный адрес»

      // Поле города отправления
      attachGeocodeInput(allInputs[1], "origin", function (coords) {
        // Если страна не заполнена — подставляем из результата
        if (allInputs[0] && !allInputs[0].value && coords.country) allInputs[0].value = coords.country;
        onOriginResolved(coords);
      });

      // Поле точного адреса погрузки — более точный геокодинг, перезаписывает координаты
      attachGeocodeInput(allInputs[2], "origin", onOriginResolved);

      // Поле города назначения
      attachGeocodeInput(allInputs[4], "destination", function (coords) {
        if (allInputs[3] && !allInputs[3].value && coords.country) allInputs[3].value = coords.country;
        onDestResolved(coords);
      });

      // Поле точного адреса разгрузки
      attachGeocodeInput(allInputs[5], "destination", onDestResolved);
    }

    // Собирает route из mapState (координаты уже есть) + читает текстовые поля
    async function buildRoute() {
      var step0 = document.querySelectorAll("[data-wizard-step]")[0];
      var inputs = step0 ? step0.querySelectorAll("input") : [];

      var originCountry = (inputs[0] && inputs[0].value) || (mapState.origin && mapState.origin.country) || "";
      var originCity    = (inputs[1] && inputs[1].value) || (mapState.origin && mapState.origin.city)    || "";
      var destCountry   = (inputs[3] && inputs[3].value) || (mapState.destination && mapState.destination.country) || "";
      var destCity      = (inputs[4] && inputs[4].value) || (mapState.destination && mapState.destination.city)    || "";

      // Если координаты ещё не получены через autocomplete — геокодируем прямо сейчас
      if (!mapState.origin || !mapState.origin.latitude) {
        var query = [inputs[2] && inputs[2].value, originCity, originCountry].filter(Boolean).join(", ");
        mapState.origin = await geocodeAddress(query) || { latitude: 0, longitude: 0, city: originCity, country: originCountry };
      }
      if (!mapState.destination || !mapState.destination.latitude) {
        var query2 = [inputs[5] && inputs[5].value, destCity, destCountry].filter(Boolean).join(", ");
        mapState.destination = await geocodeAddress(query2) || { latitude: 0, longitude: 0, city: destCity, country: destCountry };
      }

      return {
        origin: {
          country:   originCountry,
          city:      originCity,
          latitude:  mapState.origin.latitude,
          longitude: mapState.origin.longitude
        },
        destination: {
          country:   destCountry,
          city:      destCity,
          latitude:  mapState.destination.latitude,
          longitude: mapState.destination.longitude
        },
        waypoints: []
      };
    }

    // Строит человекочитаемый title из маршрута
    function buildTitle(originCity, originCountry, destCity, destCountry) {
      var from = originCity || originCountry || "?";
      var to   = destCity   || destCountry   || "?";
      return from + " — " + to;
    }

    async function buildCargoPayload() {
      var step0 = document.querySelectorAll("[data-wizard-step]")[0];
      var inputs0 = step0 ? step0.querySelectorAll("input") : [];
      var originCity    = (inputs0[1] && inputs0[1].value) || "";
      var originCountry = (inputs0[0] && inputs0[0].value) || "";
      var destCity      = (inputs0[4] && inputs0[4].value) || "";
      var destCountry   = (inputs0[3] && inputs0[3].value) || "";

      var route = await buildRoute();

      return {
        type: "CARGO",
        title: buildTitle(originCity, originCountry, destCity, destCountry),
        description: getTextarea(),
        route: route,
        cargo: {
          cargoType: toCargoTypeEnum(getSelect(1, 0)),
          weight:    Number(getVal(1, 1)) || 0,
          length:    Number(getVal(1, 2)) || 0,
          width:     Number(getVal(1, 3)) || 0,
          height:    Number(getVal(1, 4)) || 0,
          volume:    0,
          price:     Number(getVal(2, 0)) || 0
        }
      };
    }

    async function buildTransportPayload() {
      var step0 = document.querySelectorAll("[data-wizard-step]")[0];
      var inputs0 = step0 ? step0.querySelectorAll("input") : [];
      var originCity    = (inputs0[1] && inputs0[1].value) || "";
      var originCountry = (inputs0[0] && inputs0[0].value) || "";
      var destCity      = (inputs0[4] && inputs0[4].value) || "";
      var destCountry   = (inputs0[3] && inputs0[3].value) || "";

      var route = await buildRoute();

      return {
        type: "TRANSPORT",
        title: buildTitle(originCity, originCountry, destCity, destCountry),
        description: getTextarea(),
        route: route,
        transport: {
          transportType: toTransportTypeEnum(getSelect(1, 0)),
          maxWeight:     Number(getVal(1, 1)) || 0,
          maxVolume:     Number(getVal(1, 2)) || 0
        }
      };
    }

    function setButtonLoading(btn, loading, defaultText, loadingText) {
      if (!btn) return;
      btn.disabled = loading;
      btn.textContent = loading ? (loadingText || "Сохранение…") : defaultText;
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
          setButtonLoading(publishBtn, true, "Опубликовать объявление");
          var payload = await buildCargoPayload();
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

          var origText = draftLink.textContent;
          draftLink.textContent = "Сохранение…";
          draftLink.style.pointerEvents = "none";

          var payload = await buildCargoPayload();
          console.log("DRAFT PAYLOAD:", payload);

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
          setButtonLoading(publishBtn, true, "Опубликовать объявление");
          var payload = await buildTransportPayload();
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

          var origText = draftLink.textContent;
          draftLink.textContent = "Сохранение…";
          draftLink.style.pointerEvents = "none";

          var payload = await buildTransportPayload();
          console.log("DRAFT PAYLOAD:", payload);

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
    // РЕДАКТИРОВАНИЕ ОБЪЯВЛЕНИЯ — общая логика (груз + транспорт)
    // ============================================================
    // wireEditTransport() и wireEditCargo() — это тонкие обёртки
    // над одной функцией: они различаются только тем, какие поля
    // загружать/собирать (transport.* / cargo.*) и нужен ли адрес
    // в маршруте. Вся логика загрузки, сохранения и отправки на
    // модерацию — общая, в одном месте.
    //
    // Кнопка "Отправить на модерацию" сначала сохраняет форму тем
    // же способом, что и кнопка "Сохранить изменения" (PUT
    // listings/{id}), и только при успехе дёргает
    // listings/{id}/send-to-moderation — иначе модерация увидела
    // бы старую, несохранённую версию объявления.
    function wireEditListingForm(config) {
      console.log(config.logLabel + " started");

      if (document.body.dataset.page !== config.page) return;

      if (!API.tokens.isAuthed) {
        window.location.replace("auth.html");
        return;
      }

      var id = new URLSearchParams(location.search).get("id");
      if (!id) return;

      var form = document.querySelector("form");
      if (!form) return;

      var saveBtn = form.querySelector("button[type='submit']");
      var moderationBtn = form.querySelector("[data-send-moderation]");

      function setField(key, value) {
        var el = form.querySelector('[data-field="' + key + '"]');
        if (el) el.value = value ?? "";
      }

      function getField(key) {
        var el = form.querySelector('[data-field="' + key + '"]');
        return el ? el.value : "";
      }

      // =========================
      // LOAD
      // =========================
      API.listings.get(id, { auth: true })
        .then(function (data) {
          if (!data) return;

          setField("title", data.title);
          setField("description", data.description);

          setField("route.origin.country", data.route?.origin?.country);
          setField("route.origin.city", data.route?.origin?.city);

          setField("route.destination.country", data.route?.destination?.country);
          setField("route.destination.city", data.route?.destination?.city);

          if (config.withAddress) {
            setField("route.origin.address", data.route?.origin?.address || "");
            setField("route.destination.address", data.route?.destination?.address || "");
          }

          config.populateFields(data, setField);
        })
        .catch(function (err) {
          console.error(err);
          if (err.status === 401 || err.status === 403) {
            alert("Нет доступа к объявлению");
            window.location.replace("cabinet.html");
          } else {
            alert("Ошибка загрузки объявления");
          }
        });

      // =========================
      // PAYLOAD — общий для "Сохранить" и "На модерацию"
      // =========================
      function buildPayload() {
        var origin = {
          country: getField("route.origin.country"),
          city: getField("route.origin.city")
        };
        var destination = {
          country: getField("route.destination.country"),
          city: getField("route.destination.city")
        };

        if (config.withAddress) {
          origin.address = getField("route.origin.address");
          destination.address = getField("route.destination.address");
        }

        var payload = {
          type: config.type,
          title: getField("title"),
          description: getField("description"),
          route: { origin: origin, destination: destination, waypoints: [] }
        };

        return Object.assign(payload, config.buildExtra(getField));
      }

      // Сохраняет текущее состояние формы. Используется и кнопкой
      // "Сохранить изменения", и кнопкой "Отправить на модерацию".
      function save() {
        return API.listings.update(id, buildPayload());
      }

      // =========================
      // SAVE — кнопка "Сохранить изменения"
      // =========================
      form.addEventListener("submit", function (e) {
        e.preventDefault();

        setButtonLoading(saveBtn, true, "Сохранить изменения");
        if (moderationBtn) moderationBtn.disabled = true;

        save()
          .then(function () {
            window.location.href = "cabinet.html";
          })
          .catch(function (err) {
            console.error(err);
            alert("Ошибка сохранения");
          })
          .finally(function () {
            setButtonLoading(saveBtn, false, "Сохранить изменения");
            if (moderationBtn) moderationBtn.disabled = false;
          });
      });

      // =========================
      // ОТПРАВКА НА МОДЕРАЦИЮ — сначала сохраняем, потом шлём
      // =========================
      if (moderationBtn) {
        var moderationLabel = moderationBtn.textContent.trim() || "Отправить на модерацию";

        moderationBtn.addEventListener("click", function () {
          if (saveBtn) saveBtn.disabled = true;
          setButtonLoading(moderationBtn, true, moderationLabel, "Сохранение…");

          save()
            .then(function () {
              setButtonLoading(moderationBtn, true, moderationLabel, "Отправка на модерацию…");
              return API.listings.sendToModeration(id);
            })
            .then(function () {
              window.location.href = "cabinet.html";
            })
            .catch(function (err) {
              console.error(err);
              alert("Ошибка отправки на модерацию");
            })
            .finally(function () {
              setButtonLoading(moderationBtn, false, moderationLabel);
              if (saveBtn) saveBtn.disabled = false;
            });
        });
      }
    }

    // ============================================================
    // EDIT TRANSPORT
    // ============================================================
    function wireEditTransport() {
      wireEditListingForm({
        page: "edit-transport",
        type: "TRANSPORT",
        logLabel: "wireEditTransport",
        withAddress: false,

        populateFields: function (data, setField) {
          setField("transport.transportType", data.transport?.transportType);
          setField("transport.maxWeight", data.transport?.maxWeight);
          setField("transport.maxVolume", data.transport?.maxVolume);
        },

        buildExtra: function (getField) {
          return {
            transport: {
              transportType: getField("transport.transportType"),
              maxWeight: Number(getField("transport.maxWeight")),
              maxVolume: Number(getField("transport.maxVolume"))
            }
          };
        }
      });
    }

    // ============================================================
    // EDIT CARGO
    // ============================================================
    function wireEditCargo() {
      wireEditListingForm({
        page: "edit-cargo",
        type: "CARGO",
        logLabel: "wireEditCargo",
        withAddress: true,

        populateFields: function (data, setField) {
          setField("cargo.cargoType", data.cargo?.cargoType);
          setField("cargo.length", data.cargo?.length);
          setField("cargo.width", data.cargo?.width);
          setField("cargo.height", data.cargo?.height);
          setField("cargo.weight", data.cargo?.weight);
          setField("cargo.volume", data.cargo?.volume);
          setField("cargo.price", data.cargo?.price);
        },

        buildExtra: function (getField) {
          return {
            cargo: {
              cargoType: getField("cargo.cargoType"),
              length: Number(getField("cargo.length")),
              width: Number(getField("cargo.width")),
              height: Number(getField("cargo.height")),
              weight: Number(getField("cargo.weight")),
              volume: Number(getField("cargo.volume")),
              price: Number(getField("cargo.price"))
            }
          };
        }
      });
    }

    // ============================================================
    // DETAIL TRANSPORT PAGE
    // ============================================================
    function wireTransportDetail() {

      if (document.body.dataset.page !== "transport-detail") {
        return;
      }

      var id = new URLSearchParams(location.search).get("id");

      if (!id) {
        console.error("Listing id not found");
        return;
      }

      (async function () {

        try {

          var listing = await API.listings.get(id);

          if (!listing) {
            return;
          }

          var transport = listing.transport || {};
          var route = listing.route || {};
          var origin = route.origin || {};
          var destination = route.destination || {};

          // ===================================
          // OWNER
          // ===================================

          try {

            var owner = await API.users.get(listing.owner_id);

            var ownerName = document.querySelector("[data-owner-name]");
            var ownerEmail = document.querySelector("[data-owner-email]");
            var ownerPhone = document.querySelector("[data-owner-phone]");

            if (ownerName) {
              ownerName.textContent =
                owner.name || "Не указано";
            }

            if (ownerEmail) {
              ownerEmail.textContent =
                owner.email || "Не указано";
            }

            if (ownerPhone) {
              ownerPhone.textContent =
                owner.phone || "Не указан";
            }

          } catch (e) {
            console.error("Failed to load owner", e);
          }

          // -----------------------------------
          // Заголовок
          // -----------------------------------

          var title = document.querySelector(".detail-head__title");

          if (title) {
            title.innerHTML =
              esc(origin.city || "") +
              ' <span style="color:var(--green-700)">→</span> ' +
              esc(destination.city || "");
          }

          // -----------------------------------
          // Подзаголовок
          // -----------------------------------

          var sub = document.querySelector(".detail-head__sub");

          if (sub) {
            sub.textContent =
              "Расстояние: " +
              Math.round(route.distance_km || 0) +
              " км • Опубликовано " +
              fmtDate(listing.created_at);
          }

          // -----------------------------------
          // Маршрут
          // -----------------------------------

          var countries = document.querySelectorAll(".route-point__country");

          if (countries.length >= 2) {
            countries[0].textContent =
              (origin.country || "").substring(0, 2).toUpperCase();

            countries[1].textContent =
              (destination.country || "").substring(0, 2).toUpperCase();
          }

          var cities = document.querySelectorAll(".route-point__city");

          if (cities.length >= 2) {
            cities[0].textContent = origin.city || "";
            cities[1].textContent = destination.city || "";
          }

          var places = document.querySelectorAll(".route-point__place");

          if (places.length >= 2) {
            places[0].textContent = origin.country || "";
            places[1].textContent = destination.country || "";
          }

          var routeLine = document.querySelector(".route-line");

          if (routeLine) {
            routeLine.innerHTML =
              'Прямой рейс<span class="dash"></span>' +
              Math.round(route.distance_km || 0) +
              " км";
          }

          // -----------------------------------
          // Параметры транспорта
          // -----------------------------------

          var transportTypes = document.querySelectorAll("[data-transport-type]");
          var maxWeight = document.querySelector("[data-max-weight]");
          var maxVolume = document.querySelector("[data-max-volume]");

          transportTypes.forEach(function (element) {
            element.textContent =
              transport.transportType || "—";
          });

          if (maxWeight) {
            maxWeight.textContent =
              transport.maxWeight != null
                ? transport.maxWeight + " кг"
                : "—";
          }

          if (maxVolume) {
            maxVolume.textContent =
              transport.maxVolume != null
                ? transport.maxVolume + " м³"
                : "—";
          }

          // -----------------------------------
          // Описание
          // -----------------------------------

          var desc = document.querySelector(".desc-text");

          if (desc) {
            desc.textContent =
              listing.description || "";
          }

          // -----------------------------------
          // Breadcrumb
          // -----------------------------------

          var breadcrumb = document.querySelector(".breadcrumb");

          if (breadcrumb) {
            breadcrumb.innerHTML =
              '<a href="search-transport.html">‹ Назад к списку</a> / ' +
              esc(origin.city || "") +
              " → " +
              esc(destination.city || "");
          }

        } catch (err) {
          console.error(err);
          alert("Не удалось загрузить объявление");
        }

      })();
    }

    // ============================================================
    // DETAIL CARGO PAGE
    // ============================================================
    function wireCargoDetail() {

      if (document.body.dataset.page !== "cargo") {
        return;
      }

      var id = new URLSearchParams(location.search).get("id");

      if (!id) {
        console.error("Listing id not found");
        return;
      }

      (async function () {

        try {

          var listing = await API.listings.get(id);

          if (!listing) {
            return;
          }

          var cargo = listing.cargo || {};
          var route = listing.route || {};
          var origin = route.origin || {};
          var destination = route.destination || {};

          // ===================================
          // OWNER
          // ===================================

          try {

            var owner = await API.users.get(listing.owner_id);

            var ownerName = document.querySelector("[data-owner-name]");
            var ownerEmail = document.querySelector("[data-owner-email]");
            var ownerPhone = document.querySelector("[data-owner-phone]");

            if (ownerName) {
              ownerName.textContent = owner.name || "Не указано";
            }

            if (ownerEmail) {
              ownerEmail.textContent = owner.email || "Не указано";
            }

            if (ownerPhone) {
              ownerPhone.textContent = owner.phone || "Не указан";
            }

          } catch (e) {
            console.error("Failed to load owner", e);
          }

          // ===================================
          // HEADER
          // ===================================

          var title = document.querySelector(".detail-head__title");

          if (title) {
            title.innerHTML =
              esc(origin.city || "") +
              ' <span style="color:var(--green-700)">→</span> ' +
              esc(destination.city || "");
          }

          var subtitle = document.querySelector(".detail-head__sub");

          if (subtitle) {
            subtitle.textContent =
              "Расстояние: " +
              Math.round(route.distance_km || 0) +
              " км • Опубликовано " +
              fmtDate(listing.created_at);
          }

          // ===================================
          // BADGE
          // ===================================

          var badge = document.querySelector(".badge");

          if (badge) {
            badge.textContent = cargo.cargoType || "Груз";
          }

          // ===================================
          // ROUTE
          // ===================================

          var countries = document.querySelectorAll(".route-point__country");

          if (countries.length >= 2) {
            countries[0].textContent =
              (origin.country || "").substring(0, 2).toUpperCase();

            countries[1].textContent =
              (destination.country || "").substring(0, 2).toUpperCase();
          }

          var cities = document.querySelectorAll(".route-point__city");

          if (cities.length >= 2) {
            cities[0].textContent = origin.city || "";
            cities[1].textContent = destination.city || "";
          }

          var places = document.querySelectorAll(".route-point__place");

          if (places.length >= 2) {
            places[0].textContent = origin.country || "";
            places[1].textContent = destination.country || "";
          }

          var routeLine = document.querySelector(".route-line");

          if (routeLine) {
            routeLine.innerHTML =
              'Прямой рейс<span class="dash"></span>' +
              Math.round(route.distance_km || 0) +
              " км";
          }

          // ===================================
          // CARGO
          // ===================================

          var cargoType = document.querySelector("[data-cargo-type]");
          var cargoWeight = document.querySelector("[data-cargo-weight]");
          var cargoDimensions = document.querySelector("[data-cargo-dimensions]");
          var cargoVolume = document.querySelector("[data-cargo-volume]");

          if (cargoType) {
            cargoType.textContent = cargo.cargoType || "—";
          }

          if (cargoWeight) {
            cargoWeight.textContent =
              cargo.weight != null
                ? cargo.weight + " кг"
                : "—";
          }

          if (cargoDimensions) {
            cargoDimensions.textContent =
              (cargo.length || 0) +
              " × " +
              (cargo.width || 0) +
              " × " +
              (cargo.height || 0) +
              " м";
          }

          if (cargoVolume) {
            cargoVolume.textContent =
              cargo.volume != null
                ? cargo.volume + " м³"
                : "—";
          }

          // ===================================
          // PRICE
          // ===================================

          var price = document.querySelector("[data-cargo-price]");
          var pricePerKm = document.querySelector("[data-price-per-km]");

          if (price) {
            price.textContent =
              cargo.price != null
                ? cargo.price + " €"
                : "Цена не указана";
          }

          if (pricePerKm) {

            if (
              cargo.price != null &&
              route.distance_km
            ) {

              pricePerKm.textContent =
                "= " +
                (cargo.price / route.distance_km).toFixed(2) +
                " €/км";

            } else {

              pricePerKm.textContent = "";
            }
          }

          // ===================================
          // DESCRIPTION
          // ===================================

          var desc = document.querySelector(".desc-text");

          if (desc) {
            desc.textContent =
              listing.description || "";
          }

          // ===================================
          // BREADCRUMB
          // ===================================

          var breadcrumb = document.querySelector(".breadcrumb");

          if (breadcrumb) {
            breadcrumb.innerHTML =
              '<a href="search-cargo.html">‹ Назад к списку</a> / ' +
              esc(origin.city || "") +
              " → " +
              esc(destination.city || "");
          }

        } catch (err) {

          console.error(err);
          alert("Не удалось загрузить объявление");

        }

      })();
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

    // ============================================================
    // ПЕРЕКЛЮЧЕНИЕ ПОИСКА ГРУЗ <-> ТРАНСПОРТ
    // ============================================================
    function wireSearchTypeSelector() {
      var wrapper = document.querySelector("[data-search-type-select]");
      if (!wrapper) return;

      var select = wrapper.querySelector("select");
      if (!select) return;

      select.addEventListener("change", function () {
        var value = (select.value || "").trim().toLowerCase();

        if (value === "транспорт") {
          window.location.href = "search-transport.html";
        }

        if (value === "груз") {
          window.location.href = "search-cargo.html";
        }
      });
    }

    // ============================================================
    // КНОПКА "РАЗМЕСТИТЬ ОБЪЯВЛЕНИЕ"
    // ============================================================
    function wireCreateListingButton() {
        var btn = document.querySelector("[data-create-listing-btn]");
        if (!btn) return;

        btn.addEventListener("click", function (e) {
            e.preventDefault();

            if (API.tokens.isAuthed) {
                window.location.href = "create-cargo.html";
            } else {
                window.location.href = "auth.html";
            }
        });
    }
  })();
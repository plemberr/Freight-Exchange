/* ============================================================
   site.js — поведение всего сайта.
   Шапка и подвал теперь вшиты в разметку (работает и по file://).
   Паттерны: progressive enhancement, Wizard/Stepper.
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    initActiveNav();
    initLoginStyle();
    initBurger();
    initTabs();
    initWizard();
    initPriceType();
    initValidation();
    initModeratorSidebar();
    initModeratorRole();
    initAccountMenuPlaceholders();
  });

  /* активный пункт меню по data-page на <body> */
  function initActiveNav() {
    var page = document.body.dataset.page;
    if (!page) return;
    var link = document.querySelector('.nav__link[data-nav-key="' + page + '"]');
    if (link) link.classList.add("nav__link--active");
  }

  /* стиль кнопки «Войти»: outline на витрине, primary внутри */
  function initLoginStyle() {
    var btn = document.querySelector("[data-login-btn]");
    if (btn && document.body.dataset.login === "outline") {
      btn.classList.remove("btn--primary");
      btn.classList.add("btn--outline");
    }
  }

  function initBurger() {
    var burger = document.querySelector("[data-burger]");
    var nav = document.querySelector("[data-nav-menu]");
    if (!burger || !nav) return;
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Табы (Войти / Регистрация) */
  function initTabs() {
    document.querySelectorAll("[data-tabs]").forEach(function (group) {
      var buttons = group.querySelectorAll("[data-tab-target]");
      buttons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var target = btn.getAttribute("data-tab-target");
          buttons.forEach(function (b) {
            var active = b === btn;
            b.classList.toggle("is-active", active);
            b.setAttribute("aria-selected", String(active));
          });
          group.querySelectorAll("[data-tab-panel]").forEach(function (p) {
            p.hidden = p.id !== target;
          });
        });
      });
    });
  }

  /* Мастер создания объявления (Wizard/Stepper) */
  function initWizard() {
    var wizard = document.querySelector("[data-wizard]");
    if (!wizard) return;
    var steps = wizard.querySelectorAll("[data-wizard-step]");
    var dots = wizard.querySelectorAll("[data-step]");
    var current = 0;

    function render() {
      steps.forEach(function (s, i) { s.hidden = i !== current; });
      dots.forEach(function (d, i) {
        d.classList.toggle("is-active", i === current);
        d.classList.toggle("is-done", i < current);
      });
      var typeSel = wizard.querySelector("[data-type-select]");
      if (typeSel) typeSel.hidden = current !== 0;
      window.scrollTo({ top: wizard.offsetTop - 80, behavior: "smooth" });
    }

    wizard.addEventListener("click", function (e) {
      var next = e.target.closest("[data-next]");
      var prev = e.target.closest("[data-prev]");
      if (next && current < steps.length - 1) { current++; render(); }
      if (prev && current > 0) { current--; render(); }
    });
    render();
  }

  /* Переключатель типа цены */
  function initPriceType() {
    document.querySelectorAll("[data-price-type]").forEach(function (group) {
      group.querySelectorAll(".price-type__btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          group.querySelectorAll(".price-type__btn").forEach(function (b) {
            b.classList.toggle("is-active", b === btn);
          });
        });
      });
    });
  }

  /* Демонстрационная валидация (реальную делаем на ASP.NET Core) */
  function initValidation() {
    document.querySelectorAll("[data-validate]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ok = true;
        var email = form.querySelector('input[type="email"]');
        if (email) {
          var ev = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value.trim());
          toggleError(email, !ev, "Введите корректный адрес почты");
          ok = ok && ev;
        }
        var pass = form.querySelector('input[type="password"]');
        if (pass) {
          ok = ok && pv;
        }
        if (ok) {
          if (form.dataset.redirect) window.location.href = form.dataset.redirect;
          else form.submit();
        }
      });
    });
  }
  function toggleError(input, hasError, message) {
    input.classList.toggle("input--error", hasError);
    var field = input.closest(".field");
    if (!field) return;
    var err = field.querySelector(".field__error");
    if (hasError) {
      if (!err) { err = document.createElement("span"); err.className = "field__error"; field.appendChild(err); }
      err.textContent = message;
    } else if (err) { err.remove(); }
  }

  /* Боковое меню модератора (мобайл) */
  function initModeratorSidebar() {
    var burger = document.querySelector("[data-mod-burger]");
    var sidebar = document.querySelector("[data-mod-sidebar]");
    if (!burger || !sidebar) return;
    burger.addEventListener("click", function () { sidebar.classList.toggle("is-open"); });
  }

  /* Роль модератора: ссылка «Модерация» видна только модератору.
     Прототип на localStorage; на бэке заменим проверкой роли пользователя
     (напр. в Razor: @if (User.IsInRole("Moderator")) { ... }).
     Для теста: открыть любую страницу с ?role=moderator (включить) / ?role=user (выключить). */
  function initModeratorRole() {
    var role = null;
    try {
      var params = new URLSearchParams(location.search);
      if (params.get("role") === "moderator") localStorage.setItem("fh_role", "moderator");
      if (params.get("role") === "user") localStorage.removeItem("fh_role");
      // нахождение внутри кабинета модератора означает роль модератора
      if (document.querySelector("[data-mod-sidebar]")) localStorage.setItem("fh_role", "moderator");
      role = localStorage.getItem("fh_role");
      // выход из модерации сбрасывает роль
      var logout = document.querySelector(".mod__logout");
      if (logout) logout.addEventListener("click", function () { try { localStorage.removeItem("fh_role"); } catch (e) {} });
    } catch (e) { /* localStorage недоступен (file://) — ссылка останется скрытой */ }
    if (role === "moderator") {
      document.querySelectorAll("[data-mod-link]").forEach(function (el) { el.hidden = false; });
    }
  }

  /* Меню кабинета: переход по data-href */
  function initAccountMenuPlaceholders() {
    document.querySelectorAll("[data-account-menu] .account-menu__item").forEach(function (item) {
      item.addEventListener("click", function () {
        if (item.dataset.href) window.location.href = item.dataset.href;
      });
    });
  }
})();

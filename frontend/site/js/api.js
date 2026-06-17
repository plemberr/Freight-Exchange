/* ============================================================
   api.js — клиентский слой доступа к бэкенду FreightHub.

   Паттерны:
   - Module (IIFE): инкапсулируем приватные функции, наружу
     отдаём один объект FreightAPI.
   - Gateway/Facade: страницы не знают про конкретные сервисы и
     порты — все запросы идут на один origin через "/api/v1/...".
     Маршрутизацией на нужный микросервис занимается nginx
     (reverse proxy), поэтому здесь нет ни хостов, ни CORS.
   - Все методы возвращают Promise и бросают ApiError при !ok,
     чтобы вызывающий код решал, как реагировать (progressive
     enhancement на страницах).
   ============================================================ */
window.FreightAPI = (function () {
  "use strict";

  var BASE = "/api/v1";

  // --- Хранилище токенов (localStorage) -------------------------
  var KEY_ACCESS = "fh_access";
  var KEY_REFRESH = "fh_refresh";

  var tokens = {
    get access() { try { return localStorage.getItem(KEY_ACCESS); } catch (e) { return null; } },
    get refresh() { try { return localStorage.getItem(KEY_REFRESH); } catch (e) { return null; } },
    save: function (auth) {
      try {
        if (auth && auth.accessToken) localStorage.setItem(KEY_ACCESS, auth.accessToken);
        if (auth && auth.refreshToken) localStorage.setItem(KEY_REFRESH, auth.refreshToken);
      } catch (e) { /* file:// / приватный режим — просто игнорируем */ }
    },
    clear: function () {
      try { localStorage.removeItem(KEY_ACCESS); localStorage.removeItem(KEY_REFRESH); } catch (e) {}
    },
    get isAuthed() { return !!this.access; },

    // разбор payload access-токена (без проверки подписи — только для UI;
    // реальная авторизация остаётся на бэке)
    claims: function () {
      var t = this.access;
      if (!t) return null;
      try {
        var p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        var pad = p.length % 4; if (pad) p += "====".slice(pad);
        return JSON.parse(decodeURIComponent(escape(atob(p))));
      } catch (e) { return null; }
    },
    role: function () { var c = this.claims(); return c ? c.role : null; },
    email: function () { var c = this.claims(); return c ? c.email : null; },
    isModerator: function () { var r = this.role(); return r === "ROLE_MODERATOR" || r === "ROLE_ADMIN"; }
  };

  // --- Единый тип ошибки ----------------------------------------
  function ApiError(message, status, body) {
    this.name = "ApiError";
    this.message = message || "Ошибка запроса";
    this.status = status;
    this.body = body;
  }
  ApiError.prototype = Object.create(Error.prototype);

  // --- Низкоуровневый запрос ------------------------------------
  // opts: { method, body, auth (bool), query (obj), _retried (bool) }
  function request(path, opts) {
    opts = opts || {};
    var url = BASE + path;

    if (opts.query) {
      var qs = Object.keys(opts.query)
        .filter(function (k) { return opts.query[k] !== undefined && opts.query[k] !== null && opts.query[k] !== ""; })
        .map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(opts.query[k]); })
        .join("&");
      if (qs) url += "?" + qs;
    }

    var headers = { "Accept": "application/json" };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.auth && tokens.access) headers["Authorization"] = "Bearer " + tokens.access;

    return fetch(url, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      // одноразовая попытка refresh при 401 на защищённых запросах
      if (res.status === 401 && opts.auth && !opts._retried && tokens.refresh) {
        return refreshTokens().then(function () {
          return request(path, Object.assign({}, opts, { _retried: true }));
        });
      }
      return parse(res);
    });
  }

  function parse(res) {
    var ct = res.headers.get("content-type") || "";
    var asJson = ct.indexOf("application/json") !== -1;
    return (asJson ? res.json().catch(function () { return null; }) : res.text())
      .then(function (data) {
        if (!res.ok) {
          var msg = (data && (data.message || data.detail || data.error)) || ("HTTP " + res.status);
          throw new ApiError(msg, res.status, data);
        }
        return data;
      });
  }

  // refresh без рекурсивного 401-перехвата
  function refreshTokens() {
    return fetch(BASE + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refresh })
    }).then(function (res) {
      if (!res.ok) { tokens.clear(); throw new ApiError("Сессия истекла", res.status); }
      return res.json();
    }).then(function (auth) { tokens.save(auth); return auth; });
  }

  // ============================================================
  // Публичное API, сгруппированное по доменам
  // ============================================================
  return {
    tokens: tokens,
    ApiError: ApiError,

    auth: {
      register: function (email, password) {
        return request("/auth/register", { method: "POST", body: { email: email, password: password } })
          .then(function (auth) { tokens.save(auth); return auth; });
      },
      login: function (email, password) {
        return request("/auth/login", { method: "POST", body: { email: email, password: password } })
          .then(function (auth) { tokens.save(auth); return auth; });
      },
      logout: function () {
        var rt = tokens.refresh;
        var done = rt
          ? request("/auth/logout", { method: "POST", auth: true, body: { refreshToken: rt } }).catch(function () {})
          : Promise.resolve();
        return done.then(function () { tokens.clear(); });
      },
      isAuthed: function () { return tokens.isAuthed; }
    },

    // GET /api/v1/search/listings — params: type, origin, destination,
    // cargoType, minWeight/maxWeight, minVolume/maxVolume, minPrice/maxPrice,
    // minLength/maxLength, minWidth/maxWidth, minHeight/maxHeight,
    // transportType, minMaxWeight/maxMaxWeight, minMaxVolume/maxMaxVolume,
    // page, size, sort, order
    search: {
      listings: function (params) { return request("/search/listings", { query: params || {} }); }
    },

    listings: {
      create: function (payload) { return request("/listings/", { method: "POST", auth: true, body: payload }); },
      mine: function (status) { return request("/listings/", { auth: true, query: { status: status } }); },
      get: function (id) { return request("/listings/" + encodeURIComponent(id)); },
      update: function (id, payload) { return request("/listings/" + encodeURIComponent(id), { method: "PUT", auth: true, body: payload }); },
      remove: function (id) { return request("/listings/" + encodeURIComponent(id), { method: "DELETE", auth: true }); },
      sendToModeration: function (id) { return request("/listings/" + encodeURIComponent(id) + "/send-to-moderation", { method: "POST", auth: true }); }
    },

    users: {
      me: function () { return request("/users/me", { auth: true }); },
      get: function (id) { return request("/users/" + encodeURIComponent(id)); },
      updateMe: function (payload) { return request("/users/me", { method: "PUT", auth: true, body: payload }); }
    },

    moderation: {
      queue: function () { return request("/moderation/queue", { auth: true }); },
      approve: function (id) { return request("/moderation/" + encodeURIComponent(id) + "/approve", { method: "POST", auth: true }); },
      reject: function (id, reason) { return request("/moderation/" + encodeURIComponent(id) + "/reject", { method: "POST", auth: true, body: { reason: reason } }); }
    }
  };
})();

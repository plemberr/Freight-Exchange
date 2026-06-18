window.FreightAPI = (function () {
  "use strict";

  var BASE = "/api/v1";

  // =========================
  // TOKENS
  // =========================
  var KEY_ACCESS = "fh_access";
  var KEY_REFRESH = "fh_refresh";

  var tokens = {
    get access() {
      try { return localStorage.getItem(KEY_ACCESS); } catch (e) { return null; }
    },
    get refresh() {
      try { return localStorage.getItem(KEY_REFRESH); } catch (e) { return null; }
    },
    save: function (auth) {
      try {
        if (auth?.accessToken) localStorage.setItem(KEY_ACCESS, auth.accessToken);
        if (auth?.refreshToken) localStorage.setItem(KEY_REFRESH, auth.refreshToken);
      } catch (e) {}
    },
    clear: function () {
      try {
        localStorage.removeItem(KEY_ACCESS);
        localStorage.removeItem(KEY_REFRESH);
      } catch (e) {}
    },
    get isAuthed() {
      return !!this.access;
    },

    claims: function () {
      var t = this.access;
      if (!t) return null;
      try {
        var p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        var pad = p.length % 4;
        if (pad) p += "====".slice(pad);
        return JSON.parse(atob(p));
      } catch (e) {
        return null;
      }
    },

    role: function () {
      var c = this.claims();
      return c?.role || null;
    },

    email: function () {
      var c = this.claims();
      return c?.email || null;
    },

    isModerator: function () {
      var r = this.role();
      return r === "ROLE_MODERATOR" || r === "ROLE_ADMIN";
    }
  };

  // =========================
  // ERROR
  // =========================
  function ApiError(message, status, body) {
    this.name = "ApiError";
    this.message = message;
    this.status = status;
    this.body = body;
  }
  ApiError.prototype = Object.create(Error.prototype);

  // =========================
  // REQUEST CORE
  // =========================
  function request(path, opts) {
    opts = opts || {};

    var url = BASE + path;

    if (opts.query) {
      var qs = Object.keys(opts.query)
        .filter(k => opts.query[k] !== undefined && opts.query[k] !== null && opts.query[k] !== "")
        .map(k => encodeURIComponent(k) + "=" + encodeURIComponent(opts.query[k]))
        .join("&");

      if (qs) url += "?" + qs;
    }

    var headers = {
      Accept: "application/json"
    };

    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (opts.auth && tokens.access) {
      headers["Authorization"] = "Bearer " + tokens.access;
    }

    return fetch(url, {
      method: opts.method || "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    }).then(res => {
      if (res.status === 401 && opts.auth && !opts._retried && tokens.refresh) {
        return refreshTokens().then(() =>
          request(path, Object.assign({}, opts, { _retried: true }))
        );
      }
      return parse(res);
    });
  }

  function parse(res) {
    var ct = res.headers.get("content-type") || "";
    var isJson = ct.includes("application/json");

    return (isJson ? res.json() : res.text()).then(data => {
      if (!res.ok) {
        throw new ApiError(
          (data && (data.message || data.error || data.detail)) || ("HTTP " + res.status),
          res.status,
          data
        );
      }
      return data;
    });
  }

  function refreshTokens() {
    return fetch(BASE + "/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ refreshToken: tokens.refresh })
    })
      .then(res => {
        if (!res.ok) {
          tokens.clear();
          throw new ApiError("Session expired", res.status);
        }
        return res.json();
      })
      .then(auth => {
        tokens.save(auth);
        return auth;
      });
  }

  // =========================
  // API
  // =========================
  return {
    tokens,
    ApiError,

    // -------------------------
    // AUTH
    // -------------------------
    auth: {
      register: (email, password) =>
        request("/auth/register", {
          method: "POST",
          body: { email, password }
        }).then(auth => {
          tokens.save(auth);
          return auth;
        }),

      login: (email, password) =>
        request("/auth/login", {
          method: "POST",
          body: { email, password }
        }).then(auth => {
          tokens.save(auth);
          return auth;
        }),

      refresh: () =>
        request("/auth/refresh", {
          method: "POST",
          body: { refreshToken: tokens.refresh }
        }),

      logout: () => {
        var rt = tokens.refresh;

        var done = rt
          ? request("/auth/logout", {
              method: "POST",
              auth: true,
              body: { refreshToken: rt }
            }).catch(() => {})
          : Promise.resolve();

        return done.then(() => tokens.clear());
      }
    },

    // -------------------------
    // USERS
    // -------------------------
    users: {
      me: () => request("/users/me", { auth: true }),

      get: (id) =>
        request("/users/" + encodeURIComponent(id)),

      updateMe: (payload) =>
        request("/users/me", {
          method: "PUT",
          auth: true,
          body: payload
        }),

      deleteMe: () =>
        request("/users/me", {
          method: "DELETE",
          auth: true
        })
    },

    // -------------------------
    // LISTINGS
    // -------------------------
    listings: {
      create: (payload) =>
        request("/listings/", {
          method: "POST",
          auth: true,
          body: payload
        }),

      mine: () =>
        request("/listings/", { auth: true }),

      get: (id) =>
        request("/listings/" + encodeURIComponent(id), {
          auth: true
        }),

      update: (id, payload) =>
        request("/listings/" + encodeURIComponent(id), {
          method: "PUT",
          auth: true,
          body: payload
        }),

      remove: (id) =>
        request("/listings/" + encodeURIComponent(id), {
          method: "DELETE",
          auth: true
        }),

      sendToModeration: (id) =>
        request("/listings/" + encodeURIComponent(id) + "/send-to-moderation", {
          method: "POST",
          auth: true
        }),

      byUser: (id) =>
        request("/listings/user/" + encodeURIComponent(id), { auth: true })
    },

    // -------------------------
    // MODERATION (ROLE: MODERATOR)
    // -------------------------
    moderation: {
      queue: () =>
        request("/moderation/queue", { auth: true }),

      approve: (id) =>
        request("/moderation/" + encodeURIComponent(id) + "/approve", {
          method: "POST",
          auth: true
        }),

      reject: (id, reason) =>
        request("/moderation/" + encodeURIComponent(id) + "/reject", {
          method: "POST",
          auth: true,
          body: { reason }
        })
    },

    // -------------------------
    // ROUTES
    // -------------------------
    routes: {
      // GET /api/v1/routes/geocode?query=<address>
      // Возвращает массив LocationResult: [{displayName, city, country, latitude, longitude}]
      geocode: (query) =>
        request("/routes/geocode", {
          query: { query }   // ← параметр называется "query", не "city"
        }),

      // GET /api/v1/routes/reverse-geocode?latitude=&longitude=
      reverseGeocode: (lat, lon) =>
        request("/routes/reverse-geocode", {
          query: { latitude: lat, longitude: lon }
        }),

      // POST /api/v1/routes/calculate
      // Body: { origin: Point, destination: Point, waypoints: Point[] }
      // Point: { latitude, longitude, city?, country? }
      calculate: (payload) =>
        request("/routes/calculate", {
          method: "POST",
          body: payload
        })
    },

    // -------------------------
    // CARGO CALC
    // -------------------------
    cargo: {
      calculateVolume: (width, length, height) =>
        request("/cargo/calculate-volume", {
          method: "POST",
          body: { width, length, height }
        }),

      calculateDensity: (volume, weight) =>
        request("/cargo/calculate-density", {
          method: "POST",
          body: { volume, weight }
        }),

      validateTransport: (payload) =>
        request("/cargo/validate-transport", {
          method: "POST",
          body: payload
        })
    },

    // -------------------------
    // SEARCH
    // -------------------------
    search: {
      listings: (filters) =>
        request("/search/listings", {
          query: filters || {}
        })
    }
  };
})();
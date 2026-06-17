# FreightHub — фронт + бэк (Docker Compose)

Полиглот-микросервисы (Java/Spring + Python/FastAPI) + статический фронт
(HTML/CSS/JS) за единым nginx, который работает и как раздача статики, и как
**reverse proxy / API gateway**.

## Запуск

```bash
docker compose up --build
```

- Фронт: **http://localhost:8080**
- Сервисы наружу (для отладки) остаются на своих портах: auth 8081, user 8000,
  listing 8001, moderation 8084, search 8085, cargo 8006, route 8004.

Из браузера в коде фронта НЕ используются ни хосты, ни порты сервисов — все
запросы идут на тот же origin по префиксу `/api/v1/...`, а nginx проксирует их
внутрь docker-сети. Это убирает CORS и хардкод адресов.

## Архитектура соединения

```
браузер ──> http://localhost:8080 ──> [ frontend / nginx ]
                                          ├── /            → статика сайта
                                          └── /api/v1/...  → reverse proxy:
                                               auth/        → auth-service:8081   (Java)
                                               moderation/  → moderation-service:8084 (Java)
                                               search/      → search-service:8085  (Java)
                                               users/       → user-service:8000    (Python)
                                               listings/    → listing-service:8000 (Python)
                                               cargo/       → cargo-service:8000   (Python)
                                               routes/      → route-service:8000   (Python)
```

Имена апстримов резолвятся через встроенный DNS Docker в рантайме
(`resolver 127.0.0.11`), поэтому nginx стартует независимо от готовности
сервисов и переживает их рестарты.

## Клиентский слой

- `frontend/site/js/api.js` — `FreightAPI`: единый шлюз к бэку, хранение JWT в
  localStorage, авто-`Authorization: Bearer` и одноразовый refresh при 401.
  Методы: `auth.{register,login,logout}`, `search.listings`,
  `listings.{create,mine,get,update,remove,sendToModeration}`,
  `users.{me,get,updateMe}`, `moderation.{queue,approve,reject}`.
- `frontend/site/js/integration.js` — постраничная подвязка с progressive
  enhancement (если бэк недоступен — остаётся статичное демо).

### Что уже подключено к API
- **Авторизация** (`auth.html`): вход/регистрация → `auth-service` → сохранение
  токенов → редирект в кабинет.
- **Поиск** (`search-cargo.html`, `search-transport.html`): запрос к
  `search-service` (origin/destination/сортировка/тип), рендер карточек из
  ответа, обновление счётчиков.

### Как расширять (контракты готовы в `FreightAPI`)
- **Создание объявления** (`create-cargo.html`): собрать поля мастера в payload
  `CreateListingRequest` (`{type, title, cargo|transport, route}`) и вызвать
  `FreightAPI.listings.create(payload)` — требует авторизации.
- **Кабинет** (`cabinet.html`): `FreightAPI.listings.mine(status)`.
- **Деталь** (`listing-detail*.html?id=...`): `FreightAPI.listings.get(id)`.
- **Модерация** (`moderator.html`): `FreightAPI.moderation.queue()` /
  `approve(id)` / `reject(id, reason)`.

## Примечания
- `auth-service` уже разрешает `/api/v1/auth/**` без токена; CORS на бэке не
  задействован, т.к. браузер ходит на один origin (nginx).
- Защищённые эндпойнты (`listings` create/mine, `users/me`, `moderation`)
  валидируют JWT — фронт автоматически прикладывает токен из localStorage.

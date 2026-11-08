# Реализованный API

Источник требований — [spec.md](../spec.md). Макет пока не подключён к API.

## Авторизация

- `POST /api/auth/login`: JSON `{"email":"student@mukpid.example","password":"..."}`. Email приводится к нижнему регистру. Ответ 200: `{"data":{"authenticated":true}}`. JWT приходит только через Set-Cookie, не в теле ответа.
- `POST /api/auth/logout`: 204 без тела; отзыв текущей серверной сессии и очистка cookie. Повторный выход допустим.
- `GET /api/auth/me`: `{"data":{"id":"uuid","email":"...","role":"student","fullName":"...","faculty":"...","department":null,"program":"...","year":1,"groupName":"..."}}`. У преподавателя без группы program/year/groupName равны null; department содержит кафедру. Старый /api/me удалён.
- `GET /health`: `{"status":"ok"}`, не проверяет PostgreSQL.

JWT: HS256, issuer mukpid-api, audience mukpid-web, sub — ID пользователя, jti — случайный идентификатор сессии. Проверяются подпись, обязательные claims, срок, совпадение пользователя и действующей сессии. Роль берётся из базы. В sessions.token_hash хранится SHA-256 от jti, не JWT. Срок 8 часов без продления. Новый успешный вход отзывает прежнюю сессию из cookie браузера. Cookie: session локально, __Host-session в production; HttpOnly, SameSite=Lax, Path=/, Secure в production.

Для POST нужен `X-CSRF-Protection: 1`, для JSON — Content-Type: application/json. Origin должен совпадать с APP_ORIGIN (по умолчанию http://localhost:5173). Фронтенд использует относительные URL и proxy /api. CORS не включён; запросы cross-site запрещены.

Ошибки имеют вид `{"error":{"code":"UNAUTHORIZED","message":"Войдите в аккаунт"}}`. 400 BAD_REQUEST — невалидный ввод; 401 INVALID_CREDENTIALS — неверные реквизиты; 401 UNAUTHORIZED — отсутствующая, поддельная, истёкшая или отозванная авторизация; 403 FORBIDDEN — CSRF; 429 RATE_LIMITED — больше 10 попыток входа в минуту с IP. Лимит в памяти процесса. Ответы не кешируются.

## Окружение и демоданные

JWT_SECRET — случайный секрет минимум 32 байта, только в окружении. Production требует NODE_ENV=production и HTTPS APP_ORIGIN. Смена JWT_SECRET инвалидирует все ранее выданные JWT.

Демо email: student@mukpid.example, student2@mukpid.example, teacher@mukpid.example. При создании пароли берутся из SEED_STUDENT_1_PASSWORD, SEED_STUDENT_2_PASSWORD, SEED_TEACHER_PASSWORD в .env. Уже существующим пользователям seed не меняет пароль и не требует его повторно; пустая переменная не означает пустой пароль в базе. Пароль demo123 из макета не используется сервером.

## Миграция и границы реализации

Миграция 0001 переименовывает students в users с сохранением ID, паролей и связей. Старые login student1/student2 преобразуются в указанные email; иные логины без @ — в <uuid>@legacy.example. Добавлены роли, faculty и department; group_id допускает null для преподавателя. Сессии ссылаются на user_id. Старые cookie перестают работать после перехода на JWT.

Расписание, оценки, заявки, уведомления, ведомости и обращения пока не реализованы как API. Их старые таблицы ещё нуждаются в адаптации. Очистка истёкших сессий пока не автоматизирована.

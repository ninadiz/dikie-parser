# Деплой

Стек: PHP (без фреймворка) + MySQL, фронтенд — собранный статический бандл (`dist/`),
раздаётся тем же PHP-хостингом. На хостинге Node.js нет и не нужен — сборка фронтенда
выполняется локально (или в CI) и коммитится в `dist/`. Подробности — в
[TZ_vk_wall_parser.md](TZ_vk_wall_parser.md).

## Первый деплой

1. **SSH на хостинг** (HostiMan, доступ через ISPmanager/cPanel).

2. **Клонировать репозиторий** в директорию, которая станет DocumentRoot домена:
   ```bash
   git clone git@github.com:ninadiz/dikie-parser.git .
   ```

3. **Создать `config.php`** из шаблона и заполнить реальными значениями (не коммитится,
   создаётся вручную на каждом окружении):
   ```bash
   cp config.example.php config.php
   ```
   Заполнить: `db` (креды MySQL хостинга), `vk.access_token` + `vk.group_domain` (см. ниже,
   "Получение VK access_token").

4. **Применить миграции**:
   ```bash
   php run_migrations.php
   ```

5. **Разложить собранный фронтенд в корень домена** (не оставлять его внутри `dist/`):
   ```bash
   rm -rf assets index.html favicon.svg
   cp -r dist/assets assets
   cp dist/index.html index.html
   cp dist/favicon.svg favicon.svg
   ```
   ⚠️ Это обязательный шаг, а не косметика: на многих хостингах (подтверждено на HostiMan)
   перед Apache стоит nginx, который отдаёт статику (`.js`/`.css`/`.svg`) напрямую с диска по
   буквальному пути запроса и отвечает 404, если файла там физически нет — до `.htaccess` и
   `mod_rewrite` такой запрос вообще не доходит. Поэтому alias вида `assets/ → dist/assets/`
   через rewrite здесь не работает в принципе — файлы должны реально лежать в корне.

6. **Проверить `.htaccess`** — он уже в репозитории и обеспечивает:
   - раздачу `index.html`/`assets/*`/`favicon.svg` из корня (после шага 5 выше);
   - блокировку прямого веб-доступа к `run_migrations.php`, `db.php`, `vk_api.php`,
     `config.php`, `config.example.php`, `migrations/`, `.git/`, а также
     к `frontend/`, `tests/`, `.github/` и служебным файлам репозитория (`README.md`,
     `DEPLOY.md`, `TZ_vk_wall_parser.md`, `package.json` и т.п.) — они не нужны на проде, но
     физически окажутся в DocumentRoot после `git clone . <DocumentRoot>` на шаге 2, поэтому
     `.htaccess` их прячет.
   - Требует `mod_rewrite` включённый на хостинге (стандартно для Apache/ISPmanager).

7. **Первичная загрузка постов** (Сценарий 1 из ТЗ) — вручную по SSH:
   ```bash
   php fetch.php
   ```

8. Открыть домен в браузере — таблица постов открывается сразу, без логина.

## Получение VK access_token

Нужен именно **сервисный ключ доступа** (service access token) — единственный тип токена,
который одновременно работает с `wall.get` и не истекает:

- Токен сообщества (community token) не подходит — `wall.get` не принимает его в принципе
  (VK возвращает `error_code: 27, "method is unavailable with group auth"`), это не связано
  с правами/scope.
- Обычный личный токен пользователя работает, но живёт всего 1 час — не годится для
  постоянной работы без ручного обновления.
- Сервисный токен не истекает и не привязан к тому, кто его создал — не обязательно, чтобы
  приложение создавал именно владелец/админ группы, чтения публичной стены достаточно.

**Как получить:**

1. Зайти в сервис авторизации VK ID: [id.vk.ru](https://id.vk.ru) → создать приложение.
   Вход туда сейчас возможен только через **VK Бизнес ID** (нужна верификация бизнеса).
2. Платформа — **Web**. Базовый домен / redirect URL можно указать любые (даже временные) —
   на сам сервисный ключ они не влияют, нужны только для веб-виджета авторизации.
3. В настройках созданного приложения найти именно **"Сервисный ключ доступа"** (не App ID,
   не "защищённый ключ") — это и есть значение для `config.php` → `vk.access_token`.
4. `vk.group_domain` — короткое имя группы из ссылки `vk.com/group_name`, без `https://` и
   без домена, просто `group_name`.

## Обновление кода (Сценарий 6 из ТЗ)

```bash
git pull
# если менялась схема БД:
php run_migrations.php
# если менялся frontend/src (пересобранный dist/ уже должен быть закоммичен, см. ниже):
rm -rf assets index.html favicon.svg
cp -r dist/assets assets
cp dist/index.html index.html
cp dist/favicon.svg favicon.svg
```

`config.php` вне репозитория — `git pull` его не тронет.

## Сборка фронтенда перед пушем

`dist/` коммитится в репозиторий, потому что на хостинге негде его собрать. Перед пушем
любых изменений в `frontend/src`:

```bash
cd frontend
npm run build
cd ..
git add dist
git commit -m "..."
```

CI (`.github/workflows/build-check.yml`) проверяет, что сборка вообще проходит на каждый
пуш — но собранный `dist/` в репозиторий не коммитит автоматически, это остаётся ручным
шагом перед пушем (или отдельная задача на будущее, если понадобится полноценный
auto-publish).

## Локальная разработка

См. `config.example.php` для структуры конфига. Локально нужны PHP (с `pdo_mysql`, `curl`,
`openssl`) и MySQL/MariaDB. Быстрый старт:

```bash
php run_migrations.php
php -S 127.0.0.1:8000          # backend
cd frontend && npm install && npm run dev   # frontend (проксирует /api и /fetch.php на :8000)
```

`frontend/vite.config.js` содержит dev-прокси на `http://127.0.0.1:8000` — поменять порт
там же, если backend поднят на другом.

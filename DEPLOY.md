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
   Заполнить: `db` (креды MySQL хостинга), `vk.access_token` + `vk.group_domain`,
   `auth.password_hash` (сгенерировать: `php -r "echo password_hash('пароль', PASSWORD_DEFAULT), PHP_EOL;"`).

4. **Применить миграции**:
   ```bash
   php run_migrations.php
   ```

5. **Проверить `.htaccess`** — он уже в репозитории и обеспечивает:
   - раздачу `dist/index.html` и `dist/assets/*` как будто они лежат в корне домена
     (см. `frontend/vite.config.js` — билд собирается в `../dist`, т.е. в корень репозитория);
   - блокировку прямого веб-доступа к `run_migrations.php`, `db.php`, `vk_api.php`,
     `session_init.php`, `migrations/`, `.git/`.
   - Требует `mod_rewrite` включённый на хостинге (стандартно для Apache/ISPmanager).

6. **Первичная загрузка постов** (Сценарий 1 из ТЗ) — вручную по SSH:
   ```bash
   php fetch.php
   ```

7. Открыть домен в браузере, залогиниться (`auth.username` / пароль, который был захеширован в шаге 3).

## Обновление кода (Сценарий 6 из ТЗ)

```bash
git pull
# если менялась схема БД:
php run_migrations.php
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
cd frontend && npm install && npm run dev   # frontend (проксирует /api, /login.php и т.д. на :8000)
```

`frontend/vite.config.js` содержит dev-прокси на `http://127.0.0.1:8000` — поменять порт
там же, если backend поднят на другом.

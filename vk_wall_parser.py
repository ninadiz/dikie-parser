"""
Парсер стены группы VK через официальный VK API (метод wall.get).

Установка зависимостей:
    pip install requests

Перед запуском нужно получить токен доступа (access_token):
    1. Зайти на https://vkhost.github.io/ (простой способ получить токен)
       или создать Standalone-приложение на https://dev.vk.com/apps
    2. Выбрать права доступа (scope): достаточно "wall"
    3. Скопировать access_token из адресной строки после авторизации

Запуск:
    python vk_wall_parser.py

Результат сохраняется в файл posts.json и выводится в консоль.
"""

import requests
import json
import time

# ==== НАСТРОЙКИ ====
ACCESS_TOKEN = "ВАШ_ТОКЕН_ЗДЕСЬ"       # токен доступа VK
GROUP_DOMAIN = "имя_группы_или_id"     # короткое имя группы (из ссылки vk.com/имя_группы)
COUNT_PER_REQUEST = 100                 # максимум постов за один запрос (лимит VK — 100)
TOTAL_POSTS = 500                       # сколько всего постов нужно собрать
API_VERSION = "5.199"


def get_wall_posts(domain, access_token, total_posts=500, count_per_request=100):
    all_posts = []
    offset = 0

    while len(all_posts) < total_posts:
        params = {
            "domain": domain,
            "count": min(count_per_request, total_posts - len(all_posts)),
            "offset": offset,
            "access_token": access_token,
            "v": API_VERSION,
        }

        response = requests.get("https://api.vk.com/method/wall.get", params=params)
        data = response.json()

        if "error" in data:
            print("Ошибка VK API:", data["error"].get("error_msg"))
            break

        items = data.get("response", {}).get("items", [])
        if not items:
            break  # посты закончились

        for post in items:
            all_posts.append({
                "id": post.get("id"),
                "date": post.get("date"),
                "text": post.get("text"),
                "likes": post.get("likes", {}).get("count"),
                "reposts": post.get("reposts", {}).get("count"),
                "views": post.get("views", {}).get("count"),
                "comments": post.get("comments", {}).get("count"),
                "attachments_count": len(post.get("attachments", [])),
            })

        offset += count_per_request
        time.sleep(0.34)  # VK ограничивает запросы: не больше ~3 в секунду

    return all_posts


if __name__ == "__main__":
    posts = get_wall_posts(GROUP_DOMAIN, ACCESS_TOKEN, TOTAL_POSTS, COUNT_PER_REQUEST)

    with open("posts.json", "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    print(f"Собрано постов: {len(posts)}")
    print("Результат сохранён в posts.json")

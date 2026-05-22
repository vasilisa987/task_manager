# Task Manager

Система управления задачами с интеграцией AI (Ollama + FastAPI + React)

## Требования

- Node.js (LTS версия)
- Python 3.10 или новее
- Ollama (с моделью llama3.2)
- Git

## Полная установка и запуск (пошагово)

### Шаг 1. Установка Node.js

1. Перейти на сайт: https://nodejs.org
2. Скачать LTS версию
3. Установить, снять галочку "Automatically install the necessary tools"
4. Перезагрузить компьютер
5. Проверить установку:

node -v
npm -v

### Шаг 2. Установка Python

1. Перейти на сайт: https://python.org
2. Скачать версию 3.10 или новее
3. Установить, отметить галочку "Add Python to PATH"
4. Перезагрузить компьютер
5. Проверить установку:

python --version

### Шаг 3. Установка Ollama

1. Перейти на сайт: https://ollama.com
2. Скачать версию для Windows
3. Установить с настройками по умолчанию
4. После установки запустить Ollama (значок в трее)
5. Скачать модель (в командной строке):

ollama pull llama3.2

Модель весит ~4 ГБ, ждать 5-10 минут.

### Шаг 4. Клонирование проекта

git clone https://github.com/vasilisa987/task_manager.git
cd task_manager

### Шаг 5. Запуск бэкенда (Python + FastAPI)

cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
pip install PyJWT werkzeug
uvicorn main:app --reload --port 8000

ВАЖНО: Это окно командной строки НЕ ЗАКРЫВАТЬ!

### Шаг 6. Запуск фронтенда (React)

Открыть НОВОЕ окно командной строки.

cd task_manager
cd frontend
npm install
npm start

Браузер откроется автоматически на http://localhost:3000

## Данные для входа в систему

### Администратор (полный доступ)

Логин: admin
Пароль: admin123
Роль: Администратор

### Руководитель (полный доступ)

Логин: manager
Пароль: manager123
Роль: Руководитель

### Сотрудники (только свои задачи)

| Логин | Пароль | Сотрудник |
|-------|--------|-----------|
| ivan | ivan123 | Иван |
| maria | maria123 | Мария |
| alexey | alexey123 | Алексей |
| olga | olga123 | Ольга |
| anna | anna123 | Анна |
| dmitry | dmitry123 | Дмитрий |
| elena | elena123 | Елена |

## Что видит каждый пользователь

### Администратор (admin)
- Видит задачи: Все
- Создаёт задачи: Да
- Дашборды: Да
- AI: Да

### Руководитель (manager)
- Видит задачи: Все
- Создаёт задачи: Да
- Дашборды: Да
- AI: Да

### Сотрудник (employee)
- Видит задачи: Только свои
- Создаёт задачи: Нет
- Дашборды: Нет
- AI: Нет

## Проверка работы

Открыть в браузере:

- Фронтенд (сайт): http://localhost:3000
- Бэкенд (документация API): http://localhost:8000/docs
- Проверка Ollama: ollama list

## Частые ошибки и решения

### Ошибка: ModuleNotFoundError: No module named 'jwt'

Решение:
cd backend
venv\Scripts\activate
pip install PyJWT
uvicorn main:app --reload --port 8000

### Ошибка: ModuleNotFoundError: No module named 'werkzeug'

Решение:
cd backend
venv\Scripts\activate
pip install werkzeug
uvicorn main:app --reload --port 8000

### Ошибка: ERR_CONNECTION_REFUSED (фронтенд не видит бэкенд)

Решение:
1. Проверить, запущен ли бэкенд (окно с uvicorn открыто)
2. Открыть http://localhost:8000/docs
3. Если не работает, перезапустить бэкенд (Ctrl+C, затем снова uvicorn...)
4. Обновить страницу фронтенда

### Ошибка: ollama not found

Решение:
1. Переустановить Ollama
2. Перезагрузить компьютер
3. Проверить, запущена ли программа (значок в трее)

### Ошибка: npm not found

Решение:
1. Переустановить Node.js
2. Перезагрузить компьютер
3. Проверить: node -v и npm -v

### Ошибка: python not found

Решение:
1. Переустановить Python
2. Обязательно отметить "Add Python to PATH"
3. Перезагрузить компьютер

### Ошибка: Модель AI не отвечает

Решение:
1. Проверить, запущена ли Ollama (значок в трее)
2. Проверить наличие модели: ollama list
3. Если нет модели: ollama pull llama3.2
4. Перезапустить бэкенд

### Ошибка: Не удаётся войти с указанными логином/паролем

Решение:
1. Убедиться, что бэкенд запущен
2. Открыть http://localhost:8000/docs
3. Найти эндпоинт /api/login или /auth/login
4. Проверить через Swagger, работают ли учётные данные

## Команды для быстрой проверки

| Что проверить | Команда |
|---------------|---------|
| Версия Node.js | node -v |
| Версия npm | npm -v |
| Версия Python | python --version |
| Список моделей Ollama | ollama list |
| Запуск бэкенда | cd backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000 |
| Запуск фронтенда | cd frontend && npm start |

## Структура проекта

task_manager/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── venv/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── node_modules/
└── README.md

## Технологии

- Backend: FastAPI, SQLAlchemy, JWT, Uvicorn
- Frontend: React
- AI: Ollama (модель llama3.2)
- База данных: SQLite

## Автор

Василиса

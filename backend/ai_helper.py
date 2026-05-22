import requests
from sqlalchemy.orm import Session
from datetime import date, timedelta
from collections import Counter
import re
import json

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2"

STATUS_RU = {
    'new': 'Новая',
    'in_progress': 'В работе',
    'on_review': 'На согласовании',
    'done': 'Выполнена',
    'overdue': 'Просрочена'
}

def get_status_ru(status) -> str:
    status_value = status.value if hasattr(status, 'value') else status
    return STATUS_RU.get(status_value, str(status_value))

def ask_ollama(prompt: str) -> str | None:
    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL,
            "system": (
                "Ты помощник руководителя в системе управления задачами. "
                "Отвечай кратко — 2-3 предложения. "
                "Пиши только на русском языке, без английских слов и транслитерации. "
                "Не придумывай данные — опирайся только на предоставленный контекст."
            ),
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "num_predict": 200,
                "top_k": 40,
                "top_p": 0.9,
                "repeat_penalty": 1.2,
                "num_ctx": 2048,
            }
        }, timeout=60)
        return response.json().get("response", None)
    except Exception:
        return None

# ─── Утилиты ────────────────────────────────────────────────────────────────

def _safe_title(title: str) -> str:
    return title[:100].replace("\n", " ").strip()

def _task_line(t) -> str:
    return f"- {_safe_title(t.title)} | статус: {get_status_ru(t.status)} | ответственный: {t.responsible} | дедлайн: {t.deadline}"

def _days_left(deadline) -> int:
    return (deadline - date.today()).days

def _format_task(t) -> str:
    return (
        f"Задача «{t.title}»\n"
        f"  Статус: {get_status_ru(t.status)}\n"
        f"  Ответственный: {t.responsible}\n"
        f"  Отдел: {t.department or '—'}\n"
        f"  Дедлайн: {t.deadline}\n"
        f"  Приоритет: {t.priority or '—'}"
    )

# ─── AI-функции ──────────────────────────────────────────────────────────────

def get_ai_summary(db: Session) -> str:
    from database import TaskDB, TaskStatus
    tasks = db.query(TaskDB).all()
    if not tasks:
        return "Пока нет задач."
    total = len(tasks)
    done = sum(1 for t in tasks if t.status == TaskStatus.done)
    in_progress = sum(1 for t in tasks if t.status == TaskStatus.in_progress)
    overdue = sum(1 for t in tasks if t.status == TaskStatus.overdue)
    responsible_count = Counter(t.responsible for t in tasks if t.status != TaskStatus.done)
    overloaded = [f"{n} ({c} задач)" for n, c in responsible_count.items() if c > 3]
    risky = [
        f"{_safe_title(t.title)} (осталось {_days_left(t.deadline)} дн.)"
        for t in tasks
        if t.status not in [TaskStatus.done, TaskStatus.overdue] and t.deadline and 0 <= _days_left(t.deadline) <= 3
    ]
    data = (
        f"Всего задач: {total}\nВыполнено: {done}\nВ работе: {in_progress}\nПросрочено: {overdue}\n"
        f"Риск просрочки: {', '.join(risky) if risky else 'нет'}\n"
        f"Перегружены: {', '.join(overloaded) if overloaded else 'нет'}"
    )
    result = ask_ollama(f"Данные по задачам:\n{data}\n\nДай краткую сводку для руководителя (2-3 предложения). Укажи главные риски.")
    return result or f"Всего задач: {total}. Выполнено: {done}. В работе: {in_progress}. Просрочено: {overdue}."

def get_risk_analysis(db: Session) -> str:
    from database import TaskDB, TaskStatus
    tasks = db.query(TaskDB).filter(TaskDB.status.notin_([TaskStatus.done, TaskStatus.overdue])).all()
    risky = [
        f"- {_safe_title(t.title)} | ответственный: {t.responsible} | дедлайн: {t.deadline}"
        for t in tasks if t.deadline and _days_left(t.deadline) <= 5
    ]
    if not risky:
        return "Задач с риском просрочки нет."
    result = ask_ollama(f"Задачи с близким дедлайном:\n{chr(10).join(risky)}\n\nПеречисли кратко и дай рекомендации (2 предложения).")
    return result or "Задачи с риском просрочки:\n" + "\n".join(risky)

def get_overload_analysis(db: Session) -> str:
    from database import TaskDB, TaskStatus
    tasks = db.query(TaskDB).filter(TaskDB.status.notin_([TaskStatus.done])).all()
    counter = Counter(t.responsible for t in tasks if t.responsible)
    if not counter:
        return "Нет активных задач."
    max_count = max(counter.values())
    if max_count <= 2:
        return "Перегрузки нет. У всех сотрудников 2 или меньше задач."
    overloaded = [n for n, c in counter.items() if c == max_count]
    data = "\n".join(f"- {n}: {c} задач" for n, c in counter.most_common())
    result = ask_ollama(
        f"Загрузка сотрудников:\n{data}\n\n"
        f"Перегружены: {', '.join(overloaded)} ({max_count} задач).\n"
        f"Ответь: 'Перегружен: Имя. У него X задач.' Только по-русски."
    )
    if result:
        return result
    if len(overloaded) == 1:
        return f"Перегружен: {overloaded[0]}. У него {max_count} активных задач."
    return f"Перегружены: {', '.join(overloaded)}. У них {max_count} активных задач."

def get_weekly_report(db: Session) -> str:
    from database import TaskDB, TaskStatus
    week_ago = date.today() - timedelta(days=7)
    tasks = db.query(TaskDB).all()
    completed = [t for t in tasks if t.status == TaskStatus.done and t.deadline and t.deadline >= week_ago]
    overdue = [t for t in tasks if t.status == TaskStatus.overdue]
    in_progress = [t for t in tasks if t.status == TaskStatus.in_progress]
    result = ask_ollama(
        f"Выполнено за неделю: {len(completed)}\nВ работе: {len(in_progress)}\nПросрочено: {len(overdue)}\n\n"
        f"Напиши краткий отчёт для руководителя (2-3 предложения)."
    )
    return result or f"За неделю выполнено {len(completed)} задач, в работе {len(in_progress)}, просрочено {len(overdue)}."

def create_task_from_text(text: str, db: Session) -> str:
    from database import TaskDB, TaskStatus
    safe_text = text[:500].replace("\n", " ")
    prompt = (
        f"Извлеки поля задачи из текста и верни только JSON без пояснений и markdown:\n"
        f'{{"title":"...","responsible":"...","deadline":"YYYY-MM-DD или null","priority":"высокий или средний или низкий","department":"...","description":"..."}}\n\n'
        f"Текст: {safe_text}"
    )
    result = ask_ollama(prompt)
    if result is None:
        return "AI недоступен. Создайте задачу вручную."
    try:
        clean = result.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean)
        deadline = None
        if data.get("deadline") and data["deadline"] != "null":
            from datetime import datetime
            deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date()
        task = TaskDB(
            title=data.get("title", "Без названия"),
            description=data.get("description", ""),
            responsible=data.get("responsible", ""),
            department=data.get("department", ""),
            priority=data.get("priority", "средний"),
            deadline=deadline,
            status=TaskStatus.new,
        )
        db.add(task)
        db.commit()
        return f"Задача «{task.title}» создана. Ответственный: {task.responsible}, дедлайн: {task.deadline}."
    except Exception:
        return "Не удалось разобрать ответ AI. Создайте задачу вручную."

# ─── Главная функция ─────────────────────────────────────────────────────────

def answer_question(question: str, db: Session) -> str:
    from database import TaskDB, TaskStatus
    tasks = db.query(TaskDB).all()
    q = question.lower().strip()

    # ── ПОРЯДОК ВАЖЕН: сначала точные совпадения, потом регулярки ──

    # 1. Мета-вопросы о боте
    if any(p in q for p in ["ты кто", "ты реальный", "ты подделка", "откуда у тебя данные", "как ты работаешь", "что ты умеешь"]):
        return (
            "Я AI-помощник руководителя в системе управления задачами. "
            "Анализирую задачи из базы данных: статусы, дедлайны, загрузку сотрудников. "
            "Могу отвечать на вопросы по задачам, строить сводки и давать управленческие подсказки."
        )

    # 2. Не по теме
    off_topic = ["курс доллара", "анекдот", "погода", "погоду", "футбол", "кино", "фильм", "прогноз", "2+2", "сколько будет"]
    if any(w in q for w in off_topic):
        return "Я отвечаю только на вопросы по задачам, сотрудникам и дедлайнам."

    # 3. Просрочки
    if any(p in q for p in ["просрочен", "просрочк", "что просрочено", "покажи просрочку"]):
        overdue = [t for t in tasks if t.status == TaskStatus.overdue]
        if not overdue:
            return "Просроченных задач нет."
        result = f"Просрочено задач: {len(overdue)}\n\n"
        for i, t in enumerate(overdue, 1):
            result += f"{i}. {t.title}\n   Ответственный: {t.responsible} | Дедлайн: {t.deadline}\n\n"
        return result.strip()

    # 4. Перегрузка
    if any(p in q for p in ["кто перегружен", "кто больше всех", "на кого больше всего", "у кого самая большая нагрузка", "кто больше всего работает"]):
        counter = Counter(t.responsible for t in tasks if t.status != TaskStatus.done and t.responsible)
        if not counter:
            return "Нет активных задач."
        max_count = max(counter.values())
        overloaded = [n for n, c in counter.items() if c == max_count]
        if max_count <= 2:
            return "Никто не перегружен. У всех 2 или меньше задач."
        if len(overloaded) == 1:
            return f"Перегружен: {overloaded[0]}. У него {max_count} активных задач."
        return f"Перегружены: {', '.join(overloaded)}. У них {max_count} активных задач."

    # 5. Наименее загруженный
    if "меньше всего задач" in q or "у кого меньше" in q:
        counter = Counter(t.responsible for t in tasks if t.status != TaskStatus.done and t.responsible)
        if not counter:
            return "Нет активных задач."
        min_count = min(counter.values())
        least = [n for n, c in counter.items() if c == min_count]
        return f"Меньше всего задач у: {', '.join(least)} — по {min_count} задач."

    # 6. Статистика
    if any(p in q for p in ["сколько всего", "общая статистика", "сколько сделано", "сколько в работе", "сколько задач"]):
        total = len(tasks)
        done = sum(1 for t in tasks if t.status == TaskStatus.done)
        overdue = sum(1 for t in tasks if t.status == TaskStatus.overdue)
        in_progress = sum(1 for t in tasks if t.status == TaskStatus.in_progress)
        on_review = sum(1 for t in tasks if t.status == TaskStatus.on_review)
        new = sum(1 for t in tasks if t.status == TaskStatus.new)
        return (
            f"Статистика по задачам:\n"
            f"  Всего: {total}\n"
            f"  Новых: {new}\n"
            f"  В работе: {in_progress}\n"
            f"  На согласовании: {on_review}\n"
            f"  Выполнено: {done}\n"
            f"  Просрочено: {overdue}"
        )

    # 7. Высокий приоритет
    if any(p in q for p in ["высокий приоритет", "важные задачи", "самые важные", "что с высоким приоритетом"]):
        high = [t for t in tasks if t.priority == "высокий" and t.status != TaskStatus.done]
        if not high:
            return "Активных задач с высоким приоритетом нет."
        result = f"Задачи с высоким приоритетом: {len(high)}\n\n"
        for i, t in enumerate(high, 1):
            result += f"{i}. {t.title}\n   Статус: {get_status_ru(t.status)} | Ответственный: {t.responsible} | Дедлайн: {t.deadline}\n\n"
        return result.strip()

    # 8. Близкие дедлайны — ДО регулярок задач и отделов
    if any(p in q for p in ["горят", "скоро сдавать", "близкий дедлайн", "на этой неделе", "до конца недели", "что нужно сделать"]):
        today = date.today()
        end_of_week = today + timedelta(days=(6 - today.weekday()))
        soon = max(today + timedelta(days=5), end_of_week)
        upcoming = sorted(
            [t for t in tasks if t.deadline and today <= t.deadline <= soon and t.status != TaskStatus.done],
            key=lambda x: x.deadline
        )
        if not upcoming:
            return "Задач с близким дедлайном нет."
        result = "Задачи с близким дедлайном:\n\n"
        for i, t in enumerate(upcoming, 1):
            days = _days_left(t.deadline)
            label = "сегодня" if days == 0 else f"осталось {days} дн."
            result += f"{i}. {t.title}\n   Ответственный: {t.responsible} | Дедлайн: {t.deadline} ({label})\n\n"
        return result.strip()

    # 9. Советы — ДО регулярок
    if any(p in q for p in ["дай совет", "что делать с просрочк", "на что обратить", "что мне делать как руководитель", "рекомендации"]):
        today = date.today()
        soon = today + timedelta(days=5)
        urgent = [t for t in tasks if t.deadline and today <= t.deadline <= soon and t.status != TaskStatus.done]
        high = [t for t in tasks if t.priority == "высокий" and t.status != TaskStatus.done]
        overdue = [t for t in tasks if t.status == TaskStatus.overdue]
        counter = Counter(t.responsible for t in tasks if t.status != TaskStatus.done and t.responsible)
        overloaded = [n for n, c in counter.items() if c > 3]
        if not overdue and not urgent and not high:
            return "Все задачи в порядке. Продолжайте в том же духе."
        result = "Рекомендации руководителю:\n\n"
        if overdue:
            names = list({t.responsible for t in overdue})
            result += f"1. Разобрать {len(overdue)} просроченных задач (ответственные: {', '.join(names)})\n"
        if urgent:
            result += f"2. Проконтролировать {len(urgent)} задач с дедлайном в ближайшие 5 дней\n"
        if high:
            result += f"3. Проверить статус {len(high)} задач с высоким приоритетом\n"
        if overloaded:
            result += f"4. Перераспределить задачи — перегружены: {', '.join(overloaded)}\n"
        return result.strip()

    # 10. Риски и аналитика — ДО регулярок
    if any(p in q for p in ["риски", "требуют внимания", "что делать как руководитель"]):
        overdue = [t for t in tasks if t.status == TaskStatus.overdue]
        risky = [t for t in tasks if t.deadline and 0 <= _days_left(t.deadline) <= 5 and t.status != TaskStatus.done]
        counter = Counter(t.responsible for t in tasks if t.status != TaskStatus.done and t.responsible)
        overloaded = [(n, c) for n, c in counter.items() if c > 3]
        lines = []
        if overdue:
            lines.append(f"— Просрочено: {len(overdue)} задач ({', '.join(t.responsible for t in overdue)})")
        if risky:
            lines.append(f"— Риск просрочки (≤5 дней): {len(risky)} задач")
        if overloaded:
            lines.append(f"— Перегружены: {', '.join(f'{n} ({c} задач)' for n, c in overloaded)}")
        return ("Текущие риски:\n" + "\n".join(lines)) if lines else "Явных рисков не выявлено."

    # 11. Сравнение сотрудников
    if "кто работает лучше" in q or "сравни сотрудников" in q:
        counter_done = Counter(t.responsible for t in tasks if t.status == TaskStatus.done and t.responsible)
        counter_over = Counter(t.responsible for t in tasks if t.status == TaskStatus.overdue and t.responsible)
        all_names = set(counter_done) | set(counter_over)
        if not all_names:
            return "Недостаточно данных для сравнения."
        lines = [f"- {n}: выполнено {counter_done.get(n,0)}, просрочено {counter_over.get(n,0)}" for n in sorted(all_names)]
        return "Сравнение сотрудников:\n" + "\n".join(lines)

    # 12. Продуктивный отдел
    if "самый продуктивный" in q or "какой отдел лучше" in q:
        counter_done = Counter(t.department for t in tasks if t.status == TaskStatus.done and t.department)
        if not counter_done:
            return "Нет данных о выполненных задачах по отделам."
        best = counter_done.most_common(1)[0]
        return f"Больше всего выполненных задач у отдела «{best[0]}» — {best[1]} задач."

    # 13. Создать задачу
    if any(p in q for p in ["создай задачу", "добавь задачу", "новая задача"]):
        return create_task_from_text(question, db)

    # 14. Нестандартные вопросы — через AI
    if any(p in q for p in ["что будет если", "почему иван", "как разобраться"]):
        active = [t for t in tasks if t.status != TaskStatus.done][:10]
        context = "\n".join(_task_line(t) for t in active)
        result = ask_ollama(
            f"Активные задачи:\n{context}\n\n"
            f"Вопрос: {question}\n\nОтветь кратко (2-3 предложения), только на русском."
        )
        return result or "Не удалось получить ответ от AI."

    # ── РЕГУЛЯРКИ — только после всех точных проверок ──────────────────────

    # 15. Разгрузить сотрудника
    match_razgruzit = re.search(r'разгрузить\s+([А-ЯЁа-яё]+)', q)
    if match_razgruzit:
        name = match_razgruzit.group(1).capitalize()
        counter = Counter(t.responsible for t in tasks if t.status != TaskStatus.done and t.responsible)
        # ищем без учёта регистра
        actual_name = next((n for n in counter if n.lower() == name.lower()), None)
        if not actual_name:
            return f"Сотрудник «{name}» не найден или у него нет активных задач."
        count = counter[actual_name]
        others = {n: c for n, c in counter.items() if n != actual_name}
        if not others:
            return f"У {actual_name} {count} активных задач, но других сотрудников нет."
        least = min(others, key=others.get)
        return (
            f"У {actual_name} сейчас {count} активных задач. "
            f"Для разгрузки можно перенести часть на {least} (у него {others[least]} задач)."
        )

    # 16. Задачи конкретного сотрудника
    person_match = re.search(
        r'(?:что делает|чем занят[аы]?|задачи у|какие задачи у|что на повестке у|у)\s+([А-ЯЁа-яё][а-яё]+)',
        q
    )
    if person_match:
        name_raw = person_match.group(1).strip()
        # Нормализация: убираем падежные окончания для поиска
        name_variants = [name_raw, name_raw.rstrip('аяе')]
        person_tasks = []
        matched_name = name_raw
        for t in tasks:
            if t.responsible:
                for variant in name_variants:
                    if variant.lower() in t.responsible.lower():
                        person_tasks.append(t)
                        matched_name = t.responsible
                        break
        # убираем дубли
        seen = set()
        person_tasks = [t for t in person_tasks if not (t.id in seen or seen.add(t.id))]
        if person_tasks:
            active = [t for t in person_tasks if t.status != TaskStatus.done]
            show = active if active else person_tasks
            result = f"Задачи сотрудника {matched_name}:\n\n"
            for i, t in enumerate(show, 1):
                result += f"{i}. {t.title}\n   Статус: {get_status_ru(t.status)} | Дедлайн: {t.deadline}\n\n"
            return result.strip()
        return f"Сотрудник «{name_raw}» не найден или у него нет задач."

    # 17. Задачи по отделу
    dept_match = re.search(
        r'(?:что делают в отделе|задачи отдела|что делает отдел|чем занимается отдел)\s+(.+?)(?:\?|$)',
        q
    )
    if dept_match:
        dept_raw = dept_match.group(1).strip().rstrip('?').strip()
        dept_tasks = [
            t for t in tasks
            if t.department and dept_raw.lower() in t.department.lower()
        ]
        # если не нашли — пробуем по первому слову (для "финансов" → "финанс")
        if not dept_tasks:
            dept_stem = dept_raw[:6]
            dept_tasks = [
                t for t in tasks
                if t.department and dept_stem.lower() in t.department.lower()
            ]
        if dept_tasks:
            dept_display = dept_tasks[0].department
            result = f"Задачи отдела «{dept_display}»:\n\n"
            for i, t in enumerate(dept_tasks, 1):
                result += f"{i}. {t.title}\n   Статус: {get_status_ru(t.status)} | Ответственный: {t.responsible} | Дедлайн: {t.deadline}\n\n"
            return result.strip()
        return f"Задач для отдела «{dept_raw}» не найдено."

    # 18. Конкретная задача (с нечётким поиском)
    task_match = re.search(
        r'(?:что там с задачей|расскажи про задачу|как там задача|что по задаче|статус задачи)\s+(.+?)(?:\?|$)',
        q
    )
    if task_match:
        task_name = task_match.group(1).strip().rstrip('?').strip()
        # точное вхождение
        found = next((t for t in tasks if task_name.lower() in t.title.lower()), None)
        # нечёткий: по словам длиннее 3 символов
        if not found:
            words = [w for w in task_name.split() if len(w) > 3]
            found = next((t for t in tasks if any(w in t.title.lower() for w in words)), None)
        if found:
            return _format_task(found)
        return f"Задача «{task_name}» не найдена. Уточните название."

    # 19. Универсальный AI-ответ
    active = [t for t in tasks if t.status != TaskStatus.done][:15]
    context = "\n".join(_task_line(t) for t in active)
    result = ask_ollama(
        f"Активные задачи:\n{context}\n\n"
        f"Вопрос руководителя: {question}\n\n"
        f"Ответь кратко (2-3 предложения), только на русском, только на основе данных выше."
    )
    return result or "AI-помощник временно недоступен. Попробуйте переформулировать вопрос."
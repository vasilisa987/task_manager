from database import SessionLocal, TaskDB, TaskStatus
from datetime import date

db = SessionLocal()

test_tasks = [
    {
        "title": "Развить партнёрство с 5 вузами",
        "responsible": "Иван",
        "department": "Молодые таланты",
        "period": "год",
        "deadline": date(2026, 12, 31),
        "priority": "высокий",
        "status": TaskStatus.in_progress,
    },
    {
        "title": "Заключить соглашение с МИРЭА",
        "responsible": "Иван",
        "department": "Молодые таланты",
        "period": "квартал",
        "deadline": date(2026, 6, 30),
        "priority": "высокий",
        "status": TaskStatus.on_review,
    },
    {
        "title": "Подготовить участие в хакатоне",
        "responsible": "Иван",
        "department": "Молодые таланты",
        "period": "месяц",
        "deadline": date(2026, 6, 10),
        "priority": "высокий",
        "status": TaskStatus.in_progress,
    },
    {
        "title": "Согласовать постановку кейса",
        "responsible": "Иван",
        "department": "Молодые таланты",
        "period": "неделя",
        "deadline": date(2026, 5, 25),
        "priority": "высокий",
        "status": TaskStatus.new,
    },
    {
        "title": "Подготовить рабочие места для стажёров",
        "responsible": "Мария",
        "department": "АХО",
        "period": "месяц",
        "deadline": date(2026, 6, 20),
        "priority": "средний",
        "status": TaskStatus.new,
    },
    {
        "title": "Проверить переговорные перед мероприятием",
        "responsible": "Алексей",
        "department": "АХО",
        "period": "неделя",
        "deadline": date(2026, 5, 22),
        "priority": "средний",
        "status": TaskStatus.in_progress,
    },
    {
        "title": "Обновить программу адаптации новичков",
        "responsible": "Ольга",
        "department": "HR",
        "period": "квартал",
        "deadline": date(2026, 8, 1),
        "priority": "средний",
        "status": TaskStatus.new,
    },
    {
        "title": "Подготовить отчёт по найму молодых специалистов",
        "responsible": "Анна",
        "department": "HR",
        "period": "месяц",
        "deadline": date(2026, 6, 5),
        "priority": "средний",
        "status": TaskStatus.in_progress,
    },
    {
        "title": "Проверить доступы новых сотрудников",
        "responsible": "Дмитрий",
        "department": "ИТ",
        "period": "неделя",
        "deadline": date(2026, 5, 23),
        "priority": "средний",
        "status": TaskStatus.in_progress,
    },
    {
        "title": "Подготовить отчёт по затратам подразделения",
        "responsible": "Елена",
        "department": "Финансы",
        "period": "месяц",
        "deadline": date(2026, 5, 15),
        "priority": "высокий",
        "status": TaskStatus.overdue,
    },
]

for t in test_tasks:
    task = TaskDB(**t)
    db.add(task)
db.commit()
db.close()
print("Тестовые задачи добавлены")

from database import SessionLocal, UserDB
from werkzeug.security import generate_password_hash

db = SessionLocal()

employees = [
    ("ivan", "ivan123", "employee", "Иван"),
    ("maria", "maria123", "employee", "Мария"),
    ("alexey", "alexey123", "employee", "Алексей"),
    ("olga", "olga123", "employee", "Ольга"),
    ("anna", "anna123", "employee", "Анна"),
    ("dmitry", "dmitry123", "employee", "Дмитрий"),
    ("elena", "elena123", "employee", "Елена"),
]

for username, password, role, full_name in employees:
    existing = db.query(UserDB).filter(UserDB.username == username).first()
    if existing:
        print(f"Пользователь {username} уже существует")
    else:
        new_user = UserDB(
            username=username,
            password_hash=generate_password_hash(password),
            role=role,
            full_name=full_name
        )
        db.add(new_user)
        print(f"Создан: {username} / {password} (роль: {role})")

db.commit()
db.close()
print("\nГотово!")
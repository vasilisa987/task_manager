from database import SessionLocal, UserDB
from werkzeug.security import generate_password_hash

db = SessionLocal()

# Удаляем всех пользователей
db.query(UserDB).delete()
db.commit()

# Создаём заново
users = [
    ("admin", "admin123", "admin", "Администратор"),
    ("manager", "manager123", "manager", "Руководитель"),
    ("employee", "employee123", "employee", "Сотрудник")
]

for username, password, role, full_name in users:
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
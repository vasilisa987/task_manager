from database import SessionLocal, UserDB
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = SessionLocal()

# Список пользователей
users = [
    {
        "username": "admin",
        "password": "admin123",
        "role": "admin",
        "full_name": "Администратор системы"
    },
    {
        "username": "manager",
        "password": "manager123",
        "role": "manager",
        "full_name": "Руководитель отдела"
    },
    {
        "username": "employee",
        "password": "employee123",
        "role": "employee",
        "full_name": "Сотрудник"
    }
]

for user_data in users:
    existing = db.query(UserDB).filter(UserDB.username == user_data["username"]).first()
    if existing:
        print(f"Пользователь {user_data['username']} уже существует")
    else:
        new_user = UserDB(
            username=user_data["username"],
            password_hash=pwd_context.hash(user_data["password"]),
            role=user_data["role"],
            full_name=user_data["full_name"]
        )
        db.add(new_user)
        print(f"Создан пользователь: {user_data['username']} / {user_data['password']} (роль: {user_data['role']})")

db.commit()
db.close()
print("\nГотово!")
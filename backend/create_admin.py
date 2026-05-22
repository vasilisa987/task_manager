from database import SessionLocal, UserDB
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = SessionLocal()

# Проверяем, есть ли уже админ
existing = db.query(UserDB).filter(UserDB.username == "admin").first()
if existing:
    print("Администратор уже существует")
else:
    admin = UserDB(
        username="admin",
        password_hash=pwd_context.hash("admin123"),
        role="admin",
        full_name="Администратор системы"
    )
    db.add(admin)
    db.commit()
    print("Администратор создан!")
    print("Логин: admin")
    print("Пароль: admin123")

db.close()
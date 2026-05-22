from database import SessionLocal, UserDB

db = SessionLocal()
users = db.query(UserDB).all()

if users:
    for u in users:
        print(f"id: {u.id}, username: {u.username}, role: {u.role}")
else:
    print("Пользователей нет")

db.close()
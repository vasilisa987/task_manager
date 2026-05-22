from pydantic import BaseModel
from datetime import date
from typing import Optional


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = ""
    responsible: str
    department: str
    period: str  # год, квартал, месяц, неделя
    deadline: date
    priority: str  # высокий, средний, низкий
    status: str
    parent_task_id: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    responsible: Optional[str] = None
    department: Optional[str] = None
    period: Optional[str] = None
    deadline: Optional[date] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    parent_task_id: Optional[int] = None


class Task(TaskBase):
    id: int

    class Config:
        from_attributes = True

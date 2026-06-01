from sqlalchemy.orm import Session
from app.db.models.point import Point


class PointRepository:

    def create(self, db: Session, point: Point) -> Point:
        db.add(point)
        db.flush()
        return point
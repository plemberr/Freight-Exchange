from sqlalchemy.orm import Session

from app.db.models.route import Route
from app.db.models.route_waypoint import RouteWaypoint


class RouteRepository:

    def create_route(self, db: Session, route: Route) -> Route:
        db.add(route)
        db.flush()
        return route

    def create_waypoint(self, db: Session, waypoint: RouteWaypoint) -> RouteWaypoint:
        db.add(waypoint)
        db.flush()
        return waypoint
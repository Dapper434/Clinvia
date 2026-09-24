from flask import Blueprint, jsonify

from ..models import Facility

bp = Blueprint("facilities", __name__, url_prefix="/api/facilities")


@bp.get("")
def get_facilities():
    """Public list of active hospitals (names and locations only), used by the sign-up pages."""
    facilities = Facility.query.filter_by(active=True).order_by(Facility.name.asc()).all()
    return jsonify([
        {"name": f.name, "slug": f.slug, "level": f.level, "county": f.county, "lat": f.lat, "lng": f.lng}
        for f in facilities
    ])

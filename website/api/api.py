from flask import Blueprint, jsonify, request
from ..utils.utils import calculate_distance, calculate_azimuth, elevation_eagle, get_coordinates, communication_availability

api = Blueprint("api", __name__)

@api.route("/ade")
def index():
    lat1 = float(request.args.get('lat1'))
    lon1 = float(request.args.get('lon1'))
    alt1 = float(request.args.get('alt1'))
    lat2 = float(request.args.get('lat2'))
    lon2 = float(request.args.get('lon2'))
    alt2 = float(request.args.get('alt2'))

    azimuth = calculate_azimuth(lat1, lon1, lat2, lon2)
    distance = calculate_distance(lat1, lon1, lat2, lon2)
    elevation = elevation_eagle(lat1, lon1, alt1, lat2, lon2, alt2)

    return jsonify({
        "azimuth": azimuth,
        "distance": distance,
        "elevation": elevation
    })


@api.route("/get_coordinates")
def index3():
    first_TLE_line = str((request.args.get('first_TLE_line')))
    second_TLE_line = str((request.args.get('second_TLE_line')))
    name = str((request.args.get('name')))
    print(first_TLE_line)
    print(second_TLE_line)
    print(name)

    response = get_coordinates(first_TLE_line, second_TLE_line, name)
    print(str(response.json()))

    return jsonify({
        "response": str(response.json())

    })

@api.route("/communication_availability")
def index4():
    acceptable_session_time_in_sec = str((request.args.get('acceptable_session_time_in_sec')))
    dates_delta_in_sec = str((request.args.get('dates_delta_in_sec')))
    interval_in_sec = str((request.args.get('interval_in_sec')))
    min_session_time_in_sec = str((request.args.get('min_session_time_in_sec')))
    start_datetime = str((request.args.get('start_datetime')))
    lat = str((request.args.get('lat')))
    lon = str((request.args.get('lon')))
    name = str((request.args.get('name')))

    response = communication_availability(acceptable_session_time_in_sec, dates_delta_in_sec, interval_in_sec, min_session_time_in_sec, start_datetime, lat, lon, name)
    import pprint
    pprint.pprint(response.json())
    return jsonify({
        "response": str(response.json())
    })


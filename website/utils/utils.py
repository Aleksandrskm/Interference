import math
import requests
from datetime import datetime

def calculate_azimuth(lat1, lon1, lat2, lon2):
    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    azimuth = math.degrees(math.atan2(y, x))

    if azimuth < 0:
        azimuth += 360

    return azimuth

def elevation_eagle(lat1, lon1, alt1, lat2, lon2, alt2):
    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    alt1 = float(alt1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)
    alt2 = float(alt2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat / 2) * math.sin(dlat / 2) + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) * math.sin(dlon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = 6371 * c  # расчет расстояния между точками
    dalt = alt2 - alt1
    h = math.atan2(dalt, distance)  # расчет угла места
    elevation_angle = math.degrees(h)

    return elevation_angle

def calculate_distance(lat1, lon1, lat2, lon2):
    radius = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance = radius * c
    return distance


def get_coordinates(first_TLE_line: str, second_TLE_line: str, name: str):
    import pprint
    lat1 = first_TLE_line
    lon1 = second_TLE_line
    name = name

    current_datetime = datetime.utcnow().isoformat()

    data = {
        'satellite_model': {
            'first_tle_line': lat1,
            'name': name,
            'second_tle_line': lon1
        },
        'datetime_utc': current_datetime
    }

    pprint.pprint(data)
    url = ('http://185.192.247.60:7128/Geography/PositionTLE')
    response = requests.post(url, json=data)

    return response

def communication_availability(acceptable_session_time_in_sec: str, dates_delta_in_sec: str, interval_in_sec: str, min_session_time_in_sec: str, start_datetime: str, lat: str, lon: str, name: str):
    accept = acceptable_session_time_in_sec
    dat = dates_delta_in_sec
    inter = interval_in_sec
    min_ses = min_session_time_in_sec
    start = start_datetime
    lat2 = lat
    lon2 = lon
    name2 = name

    data = {
        "params": {
            "acceptable_session_time_in_sec": accept,
            "dates_delta_in_sec": dat,
            "interval_in_sec": inter,
            "min_session_time_in_sec": min_ses,
            "start_datetime": start
        },
        "callers": [
            {
            "lat": lat2,
            "lon": lon2,
            "name": name2
            }
        ]
    }

    url = 'http://185.192.247.60:7128/CommunicationAvailability/CalculateCommunicationAvailability'
    response = requests.post(url, json=data)

    return response
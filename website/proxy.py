# website/proxy.py
import requests
from flask import Blueprint, request, Response, jsonify
import logging
import time

proxy_bp = Blueprint('proxy', __name__)

# Конфигурация целевых серверов
CUS_SERVER_URL = 'http://cus_server.cibd.ru'
RADIO_SERVER_URL = 'http://radio_server.cibd.ru'

def handle_cors(response):
    """Добавляет CORS заголовки"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    response.headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Range'
    return response


# Маршрут для CUS сервера (JSON API) - /v1/*
@proxy_bp.route('/v1/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
def proxy_cus_api(path):
    """Прокси для CUS сервера (JSON API)"""

    if request.method == 'OPTIONS':
        response = Response()
        return handle_cors(response)

    try:
        target_url = f"{CUS_SERVER_URL}/api/v1/{path}"

        if request.query_string:
            target_url = f"{target_url}?{request.query_string.decode('utf-8')}"

        headers = {}
        for key, value in request.headers.items():
            key_lower = key.lower()
            if key_lower not in ['host', 'content-length', 'connection', 'accept-encoding', 'transfer-encoding']:
                headers[key] = value

        logging.info(f"Proxying to CUS: {request.method} {target_url}")

        request_data = request.get_data()
        start_time = time.time()

        response = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request_data,
            timeout=60,
            allow_redirects=True,
            verify=False
        )

        elapsed_time = time.time() - start_time
        logging.info(f"CUS response: {response.status_code} in {elapsed_time:.2f}s, size: {len(response.content)} bytes")

        proxy_response = Response(
            response.content,
            status=response.status_code,
            headers=dict(response.headers)
        )

        proxy_response.headers['Content-Length'] = len(response.content)
        proxy_response.headers.pop('Transfer-Encoding', None)
        proxy_response.headers.pop('Content-Encoding', None)

        response.close()

        return handle_cors(proxy_response)

    except Exception as e:
        logging.error(f"CUS proxy error: {e}")
        return handle_cors(jsonify({'error': str(e)})), 500


# Маршрут для спектрограммы - /api/v1/spectrum
@proxy_bp.route('/api/v1/spectrum', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
def proxy_spectrum():
    """Прокси для спектрограммы (перенаправляет на радио сервер)"""

    print("=" * 60)
    print("🎯 SPECTRUM ENDPOINT CALLED")
    print(f"Method: {request.method}")
    print(f"Data size: {len(request.get_data())} bytes")
    print("=" * 60)

    if request.method == 'OPTIONS':
        response = Response()
        return handle_cors(response)

    try:
        # Исправленный URL - добавляем /api/v1
        target_url = f"{RADIO_SERVER_URL}/api/v1/spectrum"

        print(f"🎯 Target URL: {target_url}")

        # Добавляем параметры запроса
        if request.query_string:
            target_url = f"{target_url}?{request.query_string.decode('utf-8')}"

        # Подготавливаем заголовки
        headers = {}
        for key, value in request.headers.items():
            key_lower = key.lower()
            if key_lower not in ['host', 'content-length', 'connection', 'accept-encoding', 'transfer-encoding']:
                headers[key] = value

        # Получаем данные запроса
        request_data = request.get_data()

        start_time = time.time()

        # Отправляем запрос
        response = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request_data,
            timeout=60,
            allow_redirects=True,
            verify=False
        )

        elapsed_time = time.time() - start_time
        print(f"✅ Response: {response.status_code} in {elapsed_time:.2f}s, size: {len(response.content)} bytes")

        # Создаем ответ
        proxy_response = Response(
            response.content,
            status=response.status_code,
            headers=dict(response.headers)
        )

        # Явно устанавливаем Content-Length
        proxy_response.headers['Content-Length'] = len(response.content)

        # Убираем проблемные заголовки
        proxy_response.headers.pop('Transfer-Encoding', None)
        proxy_response.headers.pop('Content-Encoding', None)

        # Закрываем соединение
        response.close()

        return handle_cors(proxy_response)

    except Exception as e:
        print(f"❌ Error: {e}")
        logging.error(f"Spectrum proxy error: {e}")
        return handle_cors(jsonify({'error': str(e)})), 500


# Универсальный маршрут для других API v1 (исключая spectrum)
@proxy_bp.route('/api/v1/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
def proxy_api_v1(path):
    """Прокси для других API v1 маршрутов"""

    if request.method == 'OPTIONS':
        response = Response()
        return handle_cors(response)

    try:
        target_url = f"{CUS_SERVER_URL}/api/v1/{path}"

        if request.query_string:
            target_url = f"{target_url}?{request.query_string.decode('utf-8')}"

        headers = {}
        for key, value in request.headers.items():
            key_lower = key.lower()
            if key_lower not in ['host', 'content-length', 'connection', 'accept-encoding', 'transfer-encoding']:
                headers[key] = value

        logging.info(f"Proxying to API v1: {request.method} {target_url}")

        request_data = request.get_data()
        start_time = time.time()

        response = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request_data,
            timeout=60,
            allow_redirects=True,
            verify=False
        )

        elapsed_time = time.time() - start_time
        logging.info(f"API v1 response: {response.status_code} in {elapsed_time:.2f}s")

        proxy_response = Response(
            response.content,
            status=response.status_code,
            headers=dict(response.headers)
        )

        proxy_response.headers['Content-Length'] = len(response.content)
        proxy_response.headers.pop('Transfer-Encoding', None)
        proxy_response.headers.pop('Content-Encoding', None)

        response.close()

        return handle_cors(proxy_response)

    except Exception as e:
        logging.error(f"API v1 proxy error: {e}")
        return handle_cors(jsonify({'error': str(e)})), 500


# Тестовый маршрут
@proxy_bp.route('/proxy-test', methods=['GET', 'OPTIONS'])
def proxy_test():
    if request.method == 'OPTIONS':
        response = Response()
        return handle_cors(response)

    return jsonify({
        'status': 'ok',
        'message': 'Proxy is working',
        'routes': [
            '/v1/<path> -> CUS server',
            '/api/v1/spectrum -> RADIO server',
            '/api/v1/<path> -> CUS server'
        ]
    })
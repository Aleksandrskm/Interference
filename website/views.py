# website/views.py - исправленная версия с SPA поддержкой

from flask import Blueprint, render_template, send_from_directory, current_app, jsonify
import os
import logging

views = Blueprint("views", __name__)

# ===== СНАЧАЛА ВСЕ МАРШРУТЫ ДЛЯ СТАТИКИ =====
@views.route('/css/<path:filename>')
def serve_css(filename):
    """Обслуживание CSS файлов"""
    return send_from_directory(os.path.join(current_app.static_folder, 'css'), filename)

@views.route('/js/<path:filename>')
def serve_js(filename):
    """Обслуживание JavaScript файлов"""
    return send_from_directory(os.path.join(current_app.static_folder, 'js'), filename)

@views.route('/assets/<path:filename>')
def serve_assets(filename):
    """Обслуживание статических ассетов"""
    return send_from_directory(os.path.join(current_app.static_folder, 'assets'), filename)

# ===== ОСНОВНЫЕ МАРШРУТЫ =====
@views.route('/')
def index():
    """Главная страница приложения"""
    return render_template('index.html')

# ===== ВАШИ ДОПОЛНИТЕЛЬНЫЕ МАРШРУТЫ (если есть) =====
# @views.route('/azimuth_and_elevation_angle')
# def function_az():
#     return render_template('azimuth_and_elevation_angle.html')

# ===== ВАЖНО: SPA FALLBACK ДЛЯ ВСЕХ НЕИЗВЕСТНЫХ МАРШРУТОВ =====
# Этот маршрут должен быть ПОСЛЕДНИМ!
@views.route('/<path:path>')
def spa_fallback(path):
    """
    SPA fallback - возвращает index.html для всех неизвестных маршрутов.
    Это позволяет клиентскому роутеру обрабатывать маршруты типа /spectrogram.
    """
    # Проверяем, не является ли путь статическим файлом
    static_folder = current_app.static_folder

    # Проверяем наличие файла в статической папке
    full_path = os.path.join(static_folder, path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        # Возвращаем файл из соответствующей подпапки
        directory = os.path.dirname(full_path)
        filename = os.path.basename(full_path)
        relative_dir = os.path.relpath(directory, static_folder)
        return send_from_directory(os.path.join(static_folder, relative_dir), filename)

    # Проверяем файлы в подпапках
    for subfolder in ['css', 'js', 'assets']:
        subfolder_path = os.path.join(static_folder, subfolder, path)
        if os.path.exists(subfolder_path) and os.path.isfile(subfolder_path):
            return send_from_directory(os.path.join(static_folder, subfolder), path)

    # Для всех остальных путей возвращаем index.html для SPA роутинга
    logging.info(f"SPA fallback: {path} -> serving index.html")
    return render_template('index.html')

# ===== ОТЛАДОЧНЫЙ МАРШРУТ (можно удалить в production) =====
@views.route('/debug/static-files')
def debug_static():
    """Отладка статических файлов"""
    static_folder = current_app.static_folder
    js_folder = os.path.join(static_folder, 'js')

    js_files = []
    if os.path.exists(js_folder):
        js_files = os.listdir(js_folder)

    return jsonify({
        'static_folder': static_folder,
        'static_folder_exists': os.path.exists(static_folder) if static_folder else False,
        'js_folder_exists': os.path.exists(js_folder),
        'js_files': js_files,
        'total_routes': len([rule for rule in current_app.url_map.iter_rules()])
    })
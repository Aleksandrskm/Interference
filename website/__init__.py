from flask import Flask

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'sdfafa8dh2aSD'
    from .api.api import api
    from .views import views
    from .proxy import proxy_bp

    # Регистрируем все блюпринты
    app.register_blueprint(views, url_prefix='/')
    app.register_blueprint(api, url_prefix='/local/api')  # ваши локальные API
    app.register_blueprint(proxy_bp)  # прокси без префикса

    return app
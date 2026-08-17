from flask import Flask
from src.api.budget import budget_bp

def create_app():
    app = Flask(__name__)
    
    # Register blueprints
    app.register_blueprint(budget_bp)
    
    return app
import logging
import os
import os.path
import shelve

from flask import Flask, request, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix

db_file = 'clothing_data.db'

app = Flask(__name__)

app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_host=1)

if os.path.exists(db_file):
    os.remove(db_file)

@app.route('/save_data', methods=['POST'])
def save_data():
    data = request.get_json()
    with shelve.open(db_file) as db:
        db[data['name']] = data['data']
    return 'ok'

@app.route('/load_data', methods=['POST'])
def load_data():
    data = request.get_json()
    with shelve.open(db_file) as db:
        val = []
        try:
            val = db[data['name']]
        except KeyError:
            pass
    return jsonify(val)

if __name__ == '__main__':
    app.run(debug=True)

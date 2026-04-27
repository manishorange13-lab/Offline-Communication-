import sqlite3
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
app.config['SECRET_KEY'] = 'offline_connect_secret!'
# Enable CORS for all routes and origins
CORS(app)
# Initialize SocketIO with cors_allowed_origins
socketio = SocketIO(app, cors_allowed_origins="*")

DB_FILE = 'offline_connect.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS nodes (
            device_id TEXT PRIMARY KEY,
            passkey TEXT NOT NULL
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL,
            text TEXT NOT NULL,
            network_type TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Run init_db on startup
init_db()

@app.route('/')
def index():
    # Serve index.html by default
    return app.send_static_file('index.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    device_id = data.get('deviceId')
    passkey = data.get('passkey')

    if not device_id or not passkey:
        return jsonify({'error': 'Device ID and Passkey are required'}), 400

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    try:
        c.execute("INSERT INTO nodes (device_id, passkey) VALUES (?, ?)", (device_id, passkey))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    finally:
        conn.close()

    if success:
        return jsonify({'message': 'Node registered successfully'})
    else:
        return jsonify({'error': 'Device ID already exists'}), 409

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    device_id = data.get('deviceId')
    passkey = data.get('passkey')

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT * FROM nodes WHERE device_id = ? AND passkey = ?", (device_id, passkey))
    user = c.fetchone()
    conn.close()

    if user:
        return jsonify({'message': 'Authenticated successfully', 'deviceId': device_id})
    else:
        return jsonify({'error': 'Invalid Device ID or Passkey'}), 401

@app.route('/history', methods=['GET'])
def history():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT sender, text, network_type, time(timestamp, 'localtime') FROM messages ORDER BY id ASC LIMIT 50")
    rows = c.fetchall()
    conn.close()
    
    messages = []
    for row in rows:
        messages.append({
            'sender': row[0],
            'text': row[1],
            'network_type': row[2],
            'time': row[3]
        })
    return jsonify(messages)

# --- WebSockets ---

@socketio.on('connect')
def handle_connect():
    print('Client connected:', request.sid)

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected:', request.sid)

@socketio.on('chat_message')
def handle_chat_message(data):
    # data: { sender: 'Device A', text: 'Hello', network_type: 'mesh' }
    sender = data.get('sender', 'Unknown')
    text = data.get('text', '')
    network_type = data.get('network_type', 'mesh')
    
    # Save to db
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT INTO messages (sender, text, network_type) VALUES (?, ?, ?)", (sender, text, network_type))
    conn.commit()
    conn.close()

    # Broadcast to everyone else
    emit('receive_message', data, broadcast=True, include_self=False)

@socketio.on('sos_alert')
def handle_sos(data):
    # Broadcast SOS to all clients
    emit('receive_sos', data, broadcast=True, include_self=False)

@socketio.on('location_update')
def handle_location(data):
    # Broadcast location update to all clients
    emit('receive_location', data, broadcast=True, include_self=False)

if __name__ == '__main__':
    print("Starting Offline Connect Server on http://localhost:8000")
    socketio.run(app, host='0.0.0.0', port=8000, debug=True, allow_unsafe_werkzeug=True)

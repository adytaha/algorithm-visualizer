from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)
SESSION_FILE = 'data/sessions.json'

# Ensure session storage exists
if not os.path.exists('data'):
    os.mkdir('data')

if not os.path.exists(SESSION_FILE):
    with open(SESSION_FILE, 'w') as f:
        json.dump({}, f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/save_array', methods=['POST'])
def save_array():
    data = request.json
    username = data.get('username', 'guest')
    array = data.get('array', [])
    with open(SESSION_FILE, 'r') as f:
        sessions = json.load(f)
    sessions[username] = array
    with open(SESSION_FILE, 'w') as f:
        json.dump(sessions, f)
    return jsonify({'status':'success','message':'Array saved!'})

@app.route('/load_array/<username>', methods=['GET'])
def load_array(username):
    with open(SESSION_FILE, 'r') as f:
        sessions = json.load(f)
    array = sessions.get(username, [])
    return jsonify({'array': array})

if __name__ == '__main__':
    app.run(debug=True)

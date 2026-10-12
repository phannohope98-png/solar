"""Khải Minh Ops — local pilot server. Python 3.12+, standard library only."""
import argparse
import base64
import csv
import getpass
import hashlib
import hmac
import io
import json
import math
import mimetypes
import os
from pathlib import Path
import secrets
import shutil
import sqlite3
import threading
import time
from datetime import date, timedelta
from email import policy
from email.parser import BytesParser
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
import zipfile
from contextlib import contextmanager

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get('SOLAR_DATA_DIR', str(ROOT / 'data'))).resolve()
KINDS = {'projects', 'tasks', 'materials', 'payments', 'documents'}
ROLES = {'manager': 'Quản lý', 'accountant': 'Kế toán', 'field': 'Thi công'}
PHASES = ['Khảo sát', 'Thiết kế', 'Mua vật tư', 'Thi công', 'Nghiệm thu', 'Bảo hành']
LOCK = threading.Lock()
FAILURES = {}


class Invalid(Exception):
    pass


class Forbidden(Exception):
    pass


class Conflict(Exception):
    pass


@contextmanager
def db():
    con = sqlite3.connect(DATA / 'solar.sqlite3', timeout=15)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    try:
        with con:
            yield con
    finally:
        con.close()


def initialize():
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / 'files').mkdir(exist_ok=True)
    with db() as con:
        con.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL, role TEXT NOT NULL, password TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
          csrf TEXT NOT NULL, expires REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS entities(id TEXT PRIMARY KEY, kind TEXT NOT NULL,
          project_id TEXT, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
          updated TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
        CREATE INDEX IF NOT EXISTS entities_project ON entities(kind,project_id,deleted);
        CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL,
          actor TEXT NOT NULL, action TEXT NOT NULL, entity_id TEXT NOT NULL, kind TEXT NOT NULL);
        ''')


def password_hash(value):
    salt = secrets.token_bytes(16)
    hashed = hashlib.pbkdf2_hmac('sha256', value.encode(), salt, 310000)
    return base64.b64encode(salt + hashed).decode()


def password_matches(value, encoded):
    raw = base64.b64decode(encoded)
    return hmac.compare_digest(raw[16:], hashlib.pbkdf2_hmac('sha256', value.encode(), raw[:16], 310000))


def add_user(username, name, role, password):
    if len(password) < 12:
        raise Invalid('Mật khẩu cần ít nhất 12 ký tự.')
    uid = secrets.token_hex(8)
    with db() as con:
        con.execute('INSERT INTO users(id,username,name,role,password) VALUES(?,?,?,?,?)',
                    (uid, username.strip().lower(), name, role, password_hash(password)))
    return uid


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%S%z')


def row_data(row):
    result = json.loads(row['data'])
    result.update(id=row['id'], version=row['version'], updated=row['updated'], project_id=row['project_id'])
    return result


def text(data, key, required=False, maximum=2000):
    value = data.get(key, '')
    if not isinstance(value, str) or len(value) > maximum or (required and not value.strip()):
        raise Invalid('Thông tin không hợp lệ: ' + key)
    return value.strip()


def number(data, key, integer=False):
    value = data.get(key, 0)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0 or value > 10**12:
        raise Invalid('Số không hợp lệ: ' + key)
    if integer and value != int(value):
        raise Invalid('Số tiền phải là số nguyên VND.')
    return int(value) if integer else value


def day(data, key, required=False):
    value = text(data, key, required)
    if value:
        try:
            date.fromisoformat(value)
        except ValueError:
            raise Invalid('Ngày không hợp lệ: ' + key)
    return value


def choice(data, key, values):
    value = text(data, key, True)
    if value not in values:
        raise Invalid('Lựa chọn không hợp lệ: ' + key)
    return value


def project_access(con, user, project_id):
    row = con.execute("SELECT * FROM entities WHERE id=? AND kind='projects' AND deleted=0", (project_id,)).fetchone()
    if not row:
        raise Invalid('Công trình không tồn tại.')
    project = row_data(row)
    if user['role'] == 'field' and user['id'] not in project.get('members', []):
        raise Forbidden('Bạn chỉ được xem công trình được phân công.')
    return project


def validate(kind, data, con):
    if kind == 'projects':
        members = data.get('members', [])
        valid_ids = {r['id'] for r in con.execute('SELECT id FROM users WHERE active=1')}
        if not isinstance(members, list) or any(not isinstance(x, str) or x not in valid_ids for x in members):
            raise Invalid('Nhân sự không hợp lệ.')
        return dict(name=text(data, 'name', True, 180), customer=text(data, 'customer', True, 180),
                    phone=text(data, 'phone', maximum=40), address=text(data, 'address', True, 500),
                    capacity=number(data, 'capacity'), contract_value=number(data, 'contract_value', True),
                    start_date=day(data, 'start_date'), due_date=day(data, 'due_date', True),
                    status=choice(data, 'status', ['Chuẩn bị', 'Đang thực hiện', 'Tạm dừng', 'Hoàn thành']),
                    members=list(dict.fromkeys(members)), note=text(data, 'note'))
    if kind == 'tasks':
        assignee = text(data, 'assignee')
        project = project_access(con, {'role': 'manager'}, data['project_id'])
        if assignee and assignee not in project['members']:
            raise Invalid('Người phụ trách phải thuộc đội công trình.')
        return dict(title=text(data, 'title', True, 300), assignee=assignee,
                    phase=choice(data, 'phase', PHASES), due_date=day(data, 'due_date', True),
                    status=choice(data, 'status', ['Chưa làm', 'Đang làm', 'Bị vướng', 'Hoàn thành']), note=text(data, 'note'))
    if kind == 'materials':
        result = dict(name=text(data, 'name', True, 200), unit=text(data, 'unit', True, 30),
                      required=number(data, 'required'), received=number(data, 'received'), used=number(data, 'used'),
                      supplier=text(data, 'supplier', maximum=200), expected_date=day(data, 'expected_date'), note=text(data, 'note'))
        if result['used'] > result['received']:
            raise Invalid('Số lượng đã dùng không được vượt số đã nhận.')
        return result
    if kind == 'payments':
        result = dict(description=text(data, 'description', True, 300),
                      direction=choice(data, 'direction', ['Thu', 'Chi']), category=text(data, 'category', True, 100),
                      amount=number(data, 'amount', True), due_date=day(data, 'due_date', True),
                      status=choice(data, 'status', ['Chưa thanh toán', 'Đã thanh toán']), paid_date=day(data, 'paid_date'),
                      method=text(data, 'method', maximum=100), note=text(data, 'note'))
        if result['amount'] <= 0:
            raise Invalid('Số tiền phải lớn hơn 0.')
        if result['status'] == 'Đã thanh toán' and not result['paid_date']:
            raise Invalid('Cần nhập ngày thanh toán thực tế.')
        if result['status'] == 'Chưa thanh toán':
            result['paid_date'] = ''
        return result
    raise Invalid('Loại dữ liệu không hợp lệ.')


def seed_demo():
    with db() as con:
        if con.execute('SELECT count(*) FROM users').fetchone()[0]:
            return
    admin = add_user('admin', 'Vũ · Quản lý', 'manager', 'SolarDemo2026!')
    accountant = add_user('ketoan', 'Linh · Kế toán', 'accountant', 'SolarDemo2026!')
    tech = add_user('thicong', 'Minh · Đội thi công', 'field', 'SolarDemo2026!')
    today = date.today()
    def d(delta): return (today + timedelta(days=delta)).isoformat()
    projects = [
      dict(name='Nhà xưởng An Phát · 120 kWp', customer='Công ty An Phát (mẫu)', phone='0900000000', address='Bến Lức, Long An', capacity=120, contract_value=980000000, start_date=d(-12), due_date=d(5), status='Đang thực hiện', members=[admin, tech, accountant], note='Dữ liệu minh họa — không phải công trình thật.'),
      dict(name='Nhà phố Tân Bình · 8 kWp', customer='Anh Hoàng (mẫu)', phone='0900000001', address='Tân Bình, Thành phố Hồ Chí Minh', capacity=8, contract_value=126000000, start_date=d(-5), due_date=d(2), status='Đang thực hiện', members=[admin, tech], note='Hybrid, lưu trữ 10 kWh. Dữ liệu mẫu.'),
      dict(name='Khách sạn Đà Lạt · 30 kWp', customer='Khách sạn Minh An (mẫu)', phone='0900000002', address='Đà Lạt, Lâm Đồng', capacity=30, contract_value=350000000, start_date=d(3), due_date=d(20), status='Chuẩn bị', members=[admin, accountant], note='Chờ xác nhận phương án mái. Dữ liệu mẫu.')]
    with db() as con:
        ids = []
        def put(kind, pid, data):
            uid = secrets.token_hex(8)
            con.execute('INSERT INTO entities(id,kind,project_id,data,updated) VALUES(?,?,?,?,?)', (uid, kind, pid, json.dumps(data, ensure_ascii=False), now()))
            return uid
        for item in projects: ids.append(put('projects', None, item))
        for i, pid in enumerate(ids):
            for j, (phase, title, state) in enumerate([
                ('Khảo sát', 'Khảo sát mái & xác nhận nhu cầu', 'Hoàn thành' if i < 2 else 'Chưa làm'),
                ('Thiết kế', 'Chốt bản vẽ và cấu hình thiết bị', 'Hoàn thành' if i == 0 else 'Đang làm'),
                ('Mua vật tư', 'Kiểm đủ thiết bị trước khi ra công trình', 'Bị vướng' if i == 0 else 'Chưa làm'),
                ('Thi công', 'Lắp khung, tấm pin và đấu nối', 'Đang làm' if i == 0 else 'Chưa làm'),
                ('Nghiệm thu', 'Đo kiểm và bàn giao cho khách', 'Chưa làm')]):
                put('tasks', pid, dict(title=title, phase=phase, status=state, assignee=tech if i < 2 else admin, due_date=d(j - 2 if i == 0 else j + 2), note='Chờ giao thêm MC4.' if state == 'Bị vướng' else ''))
        for name, unit, req, received, used in [('Tấm pin 580W', 'tấm', 208, 208, 120), ('Đầu nối MC4', 'cặp', 60, 42, 30), ('Cáp DC 6 mm²', 'm', 800, 600, 400)]:
            put('materials', ids[0], dict(name=name, unit=unit, required=req, received=received, used=used, supplier='Nhà cung cấp mẫu', expected_date=d(1), note=''))
        put('materials', ids[1], dict(name='Pin lưu trữ 10 kWh', unit='bộ', required=1, received=0, used=0, supplier='Kho mẫu', expected_date=d(2), note='Cần chốt ngày giao.'))
        for pid, desc, direction, amount, state, due in [
            (ids[0], 'Đặt cọc hợp đồng 30%', 'Thu', 294000000, 'Đã thanh toán', -12),
            (ids[0], 'Thanh toán đợt 2', 'Thu', 392000000, 'Chưa thanh toán', -1),
            (ids[0], 'Vật tư đợt 1', 'Chi', 220000000, 'Đã thanh toán', -5),
            (ids[0], 'Cáp DC và đầu nối', 'Chi', 32000000, 'Chưa thanh toán', 1),
            (ids[1], 'Đặt cọc', 'Thu', 38000000, 'Đã thanh toán', -3),
            (ids[2], 'Đặt cọc sau khi ký hợp đồng', 'Thu', 105000000, 'Chưa thanh toán', 3)]:
            put('payments', pid, dict(description=desc, direction=direction, amount=amount, status=state, due_date=d(due), paid_date=d(due) if state == 'Đã thanh toán' else '', method='Chuyển khoản', category='Hợp đồng' if direction == 'Thu' else 'Vật tư', note='Dữ liệu mẫu.'))


class Handler(BaseHTTPRequestHandler):
    server_version = 'SolarOps/1.0'

    def log_message(self, fmt, *args):
        # Avoid logging request paths, documents, customer names or credentials.
        pass

    def send(self, status, content, content_type='application/json; charset=utf-8', headers=None):
        if isinstance(content, (dict, list)):
            content = json.dumps(content, ensure_ascii=False).encode()
        elif isinstance(content, str):
            content = content.encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'same-origin')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
        for key, value in (headers or {}).items(): self.send_header(key, value)
        self.end_headers()
        self.wfile.write(content)

    def body(self, max_size=1024*1024):
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError: raise Invalid('Dung lượng không hợp lệ.')
        if length <= 0 or length > max_size: raise Invalid('Dữ liệu quá lớn hoặc rỗng.')
        return self.rfile.read(length)

    def json_body(self):
        try:
            value = json.loads(self.body())
        except (ValueError, UnicodeError): raise Invalid('JSON không hợp lệ.')
        if not isinstance(value, dict): raise Invalid('Dữ liệu không hợp lệ.')
        return value

    def auth(self, write=False):
        cookie = SimpleCookie()
        try: cookie.load(self.headers.get('Cookie', ''))
        except Exception: pass
        token = cookie.get('solar_session')
        token = token.value if token else ''
        with db() as con:
            row = con.execute('SELECT u.*,s.csrf FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1', (hashlib.sha256(token.encode()).hexdigest(), time.time())).fetchone()
        if not row:
            self.send(401, {'error': 'Vui lòng đăng nhập.'})
            return None
        if write and not hmac.compare_digest(self.headers.get('X-CSRF-Token', ''), row['csrf']):
            raise Forbidden('Phiên thao tác không hợp lệ. Tải lại trang và thử lại.')
        return dict(row)

    def do_GET(self): self.handle_request('GET')
    def do_POST(self): self.handle_request('POST')
    def do_PUT(self): self.handle_request('PUT')
    def do_DELETE(self): self.handle_request('DELETE')

    def handle_request(self, method):
        try:
            self.route(method)
        except Invalid as exc: self.send(400, {'error': str(exc)})
        except Forbidden as exc: self.send(403, {'error': str(exc)})
        except Conflict as exc: self.send(409, {'error': str(exc)})
        except sqlite3.IntegrityError: self.send(400, {'error': 'Dữ liệu đã tồn tại hoặc không hợp lệ.'})
        except Exception:
            self.send(500, {'error': 'Không thể xử lý. Kiểm tra dữ liệu và thử lại.'})

    def route(self, method):
        path = urlsplit(self.path).path
        if method != 'GET':
            # Protect login too: browser Origin must match host, no CORS support.
            origin = self.headers.get('Origin')
            if origin and urlsplit(origin).netloc != self.headers.get('Host'):
                raise Forbidden('Nguồn yêu cầu không hợp lệ.')
        if method == 'GET' and path in {'/', '/index.html', '/app.js', '/browser-store.js', '/styles.css', '/logo.svg'}:
            file = ROOT / ('index.html' if path == '/' else path[1:])
            self.send(200, file.read_bytes(), mimetypes.guess_type(str(file))[0] or 'text/plain')
            return
        if method == 'GET' and path == '/api/health':
            self.send(200, {'ok': True, 'demo': self.server.demo})
            return
        if path == '/api/login' and method == 'POST':
            payload = self.json_body()
            username = text(payload, 'username', True, 100).lower()
            password = text(payload, 'password', True, 200)
            ip = self.client_address[0]
            with LOCK:
                attempts = [t for t in FAILURES.get(ip, []) if t > time.time() - 900]
                FAILURES[ip] = attempts
            if len(attempts) >= 10:
                self.send(429, {'error': 'Thử đăng nhập quá nhiều. Vui lòng thử sau 15 phút.'})
                return
            with db() as con:
                row = con.execute('SELECT * FROM users WHERE username=? AND active=1', (username,)).fetchone()
                ok = password_matches(password, row['password']) if row else password_matches(password, password_hash(secrets.token_hex(16)))
                if not ok:
                    with LOCK: FAILURES[ip].append(time.time())
                    self.send(401, {'error': 'Tên đăng nhập hoặc mật khẩu không đúng.'})
                    return
                token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
                con.execute('DELETE FROM sessions WHERE expires<?', (time.time(),))
                con.execute('INSERT INTO sessions VALUES(?,?,?,?)', (hashlib.sha256(token.encode()).hexdigest(), row['id'], csrf, time.time()+28800))
            secure = '; Secure' if os.environ.get('SOLAR_SECURE_COOKIE') == '1' else ''
            self.send(200, {'ok': True}, headers={'Set-Cookie': 'solar_session='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800'+secure})
            return
        user = self.auth(method != 'GET')
        if user is None: return
        if path == '/api/logout' and method == 'POST':
            cookie = SimpleCookie(self.headers.get('Cookie', ''))
            with db() as con: con.execute('DELETE FROM sessions WHERE token=?', (hashlib.sha256(cookie['solar_session'].value.encode()).hexdigest(),))
            self.send(200, {'ok': True}, headers={'Set-Cookie': 'solar_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'})
            return
        if path == '/api/state' and method == 'GET':
            self.send(200, self.state(user))
            return
        if path == '/api/users' and method == 'POST':
            if user['role'] != 'manager': raise Forbidden('Chỉ quản lý được thêm nhân sự.')
            payload = self.json_body()
            role = choice(payload, 'role', list(ROLES))
            username = text(payload, 'username', True, 80).lower()
            if not username.isascii() or not all(c.isalnum() or c in '._-' for c in username): raise Invalid('Tên đăng nhập dùng chữ không dấu, số, dấu chấm hoặc gạch.')
            uid = add_user(username, text(payload, 'name', True, 100), role, text(payload, 'password', True, 200))
            with db() as con: self.audit(con, user, 'Thêm tài khoản', uid, 'users')
            self.send(201, {'id': uid})
            return
        if path == '/api/documents' and method == 'POST':
            self.upload(user)
            return
        if path.startswith('/api/documents/') and method == 'GET':
            uid = path.split('/')[-1]
            with db() as con:
                row = con.execute("SELECT * FROM entities WHERE id=? AND kind='documents' AND deleted=0", (uid,)).fetchone()
                if not row: raise Invalid('Chứng từ không tồn tại.')
                item = row_data(row)
                project_access(con, user, item['project_id'])
                if user['role'] == 'field' and item['category'] in ['Hợp đồng', 'Hóa đơn', 'Thanh toán']: raise Forbidden('Bạn không có quyền xem chứng từ tài chính.')
            self.send(200, (DATA / 'files' / item['storage']).read_bytes(), 'application/octet-stream', {'Content-Disposition': 'attachment; filename="'+item['storage']+'"'})
            return
        if path == '/api/export' and method == 'GET':
            if user['role'] == 'field': raise Forbidden('Bạn không có quyền xuất số liệu tài chính.')
            state = self.state(user)
            output = io.StringIO(newline='')
            writer = csv.writer(output)
            writer.writerow(['Công trình', 'Khách hàng', 'Giá trị hợp đồng (VND)', 'Đã thu (VND)', 'Còn phải thu (VND)', 'Đã chi (VND)', 'Hạn bàn giao', 'Trạng thái'])
            for project in state['projects']:
                payments = [p for p in state['payments'] if p['project_id'] == project['id'] and p['status'] == 'Đã thanh toán']
                income = sum(p['amount'] for p in payments if p['direction'] == 'Thu')
                expenses = sum(p['amount'] for p in payments if p['direction'] == 'Chi')
                cells = [project['name'], project['customer'], project['contract_value'], income, max(0, project['contract_value']-income), expenses, project['due_date'], project['status']]
                writer.writerow(["'"+c if isinstance(c,str) and c[:1] in ('=', '+', '-', '@', '\t', '\r') else c for c in cells])
            self.send(200, ('\ufeff'+output.getvalue()).encode(), 'text/csv; charset=utf-8', {'Content-Disposition': 'attachment; filename="solar-report.csv"'})
            return
        parts = path.strip('/').split('/')
        if len(parts) in (2, 3) and parts[0] == 'api' and parts[1] in KINDS and method in ('POST', 'PUT', 'DELETE'):
            self.mutate(user, method, parts[1], parts[2] if len(parts) == 3 else None)
            return
        self.send(404, {'error': 'Không tìm thấy.'})

    def audit(self, con, user, action, uid, kind):
        con.execute('INSERT INTO audit(at,actor,action,entity_id,kind) VALUES(?,?,?,?,?)', (now(), user['name'], action, uid, kind))

    def state(self, user):
        state = {kind: [] for kind in KINDS}
        with db() as con:
            rows = con.execute('SELECT * FROM entities WHERE deleted=0 ORDER BY updated DESC').fetchall()
            projects = [r for r in rows if r['kind'] == 'projects']
            allowed = {r['id'] for r in projects if user['role'] != 'field' or user['id'] in json.loads(r['data'])['members']}
            for row in rows:
                if (row['kind'] == 'projects' and row['id'] not in allowed) or (row['kind'] != 'projects' and row['project_id'] not in allowed): continue
                item = row_data(row)
                if user['role'] == 'field':
                    if row['kind'] == 'payments': continue
                    if row['kind'] == 'documents' and item['category'] in ['Hợp đồng', 'Hóa đơn', 'Thanh toán']: continue
                    if row['kind'] == 'projects': item.pop('contract_value', None)
                item.pop('storage', None)
                state[row['kind']].append(item)
            state['users'] = [dict(r) for r in con.execute('SELECT id,username,name,role FROM users WHERE active=1 ORDER BY name')]
            state['audit'] = [dict(r) for r in con.execute('SELECT * FROM audit ORDER BY id DESC LIMIT 40')] if user['role'] == 'manager' else []
        state['me'] = {k: user[k] for k in ('id', 'name', 'username', 'role', 'csrf')}
        state['demo'] = self.server.demo
        state['phases'] = PHASES
        return state

    def mutate(self, user, method, kind, uid):
        if kind == 'documents' and method != 'DELETE': raise Invalid('Dùng chức năng tải chứng từ.')
        payload = self.json_body()
        if method != 'POST' and not uid: raise Invalid('Thiếu mã dữ liệu.')
        if method == 'POST' and uid: raise Invalid('Không hỗ trợ đường dẫn này.')
        if kind == 'projects' and user['role'] != 'manager': raise Forbidden('Chỉ quản lý được sửa công trình.')
        if kind == 'payments' and user['role'] not in ['manager', 'accountant']: raise Forbidden('Bạn không có quyền sửa tài chính.')
        if kind in ['tasks', 'materials'] and user['role'] == 'accountant': raise Forbidden('Kế toán không có quyền sửa tiến độ hoặc vật tư.')
        if method == 'DELETE' and user['role'] != 'manager': raise Forbidden('Chỉ quản lý được lưu trữ dữ liệu.')
        with db() as con:
            con.execute('BEGIN IMMEDIATE')
            old = None
            if uid:
                row = con.execute('SELECT * FROM entities WHERE id=? AND kind=? AND deleted=0', (uid, kind)).fetchone()
                if not row: raise Invalid('Dữ liệu không tồn tại.')
                old = row_data(row)
                if payload.get('version') != row['version']: raise Conflict('Dữ liệu vừa được người khác sửa. Tải lại trước khi cập nhật.')
            pid = None if kind == 'projects' else (old['project_id'] if old else text(payload, 'project_id', True))
            if kind != 'projects': project_access(con, user, pid)
            if user['role'] == 'field' and kind == 'tasks':
                if not old or old['assignee'] != user['id']: raise Forbidden('Bạn chỉ được cập nhật công việc được giao cho mình.')
                payload = {**old, 'status': payload.get('status'), 'note': payload.get('note')}
            if method == 'DELETE':
                con.execute('UPDATE entities SET deleted=1,version=version+1,updated=? WHERE id=?', (now(), uid))
                if kind == 'projects': con.execute('UPDATE entities SET deleted=1,version=version+1,updated=? WHERE project_id=?', (now(), uid))
                self.audit(con, user, 'Lưu trữ', uid, kind)
            else:
                payload['project_id'] = pid
                clean = validate(kind, payload, con)
                if kind == 'projects' and old:
                    assigned = {json.loads(r['data']).get('assignee') for r in con.execute("SELECT data FROM entities WHERE project_id=? AND kind='tasks' AND deleted=0", (uid,))}
                    if any(a and a not in clean['members'] for a in assigned): raise Invalid('Nhân sự đang có việc được giao. Chuyển việc cho người khác trước khi bỏ khỏi đội.')
                if old:
                    con.execute('UPDATE entities SET data=?,version=version+1,updated=? WHERE id=?', (json.dumps(clean, ensure_ascii=False), now(), uid))
                else:
                    uid = secrets.token_hex(8)
                    con.execute('INSERT INTO entities(id,kind,project_id,data,updated) VALUES(?,?,?,?,?)', (uid, kind, pid, json.dumps(clean, ensure_ascii=False), now()))
                self.audit(con, user, 'Cập nhật' if old else 'Thêm', uid, kind)
        self.send(201 if method == 'POST' else 200, {'id': uid})

    def upload(self, user):
        content_type = self.headers.get('Content-Type', '')
        if not content_type.startswith('multipart/form-data;'): raise Invalid('Định dạng tải lên không hợp lệ.')
        message = BytesParser(policy=policy.default).parsebytes(('Content-Type: '+content_type+'\r\nMIME-Version: 1.0\r\n\r\n').encode()+self.body(11*1024*1024))
        fields, raw_file, filename = {}, None, ''
        if not message.is_multipart(): raise Invalid('Thiếu tệp.')
        for part in message.iter_parts():
            name = part.get_param('name', header='content-disposition')
            if name == 'file':
                raw_file, filename = part.get_payload(decode=True), part.get_filename() or ''
            elif name in ('project_id', 'title', 'category', 'reference'):
                try:
                    fields[name] = part.get_payload(decode=True).decode('utf-8').strip()
                except UnicodeError:
                    raise Invalid('Thông tin tệp phải dùng UTF-8.')
        pid = text(fields, 'project_id', True)
        title = text(fields, 'title', True, 200)
        category = choice(fields, 'category', ['Hợp đồng', 'Hóa đơn', 'Thanh toán', 'Bản vẽ', 'Nghiệm thu', 'Ảnh công trình', 'Khác'])
        reference = text(fields, 'reference', maximum=100)
        if user['role'] == 'field' and category in ['Hợp đồng', 'Hóa đơn', 'Thanh toán']: raise Forbidden('Bạn không có quyền tải chứng từ tài chính.')
        ext = Path(filename).suffix.lower()
        if raw_file is None or not raw_file or len(raw_file)>10*1024*1024: raise Invalid('Tệp phải từ 1 byte đến 10 MB.')
        signatures = {'.pdf': b'%PDF-', '.png': b'\x89PNG\r\n\x1a\n', '.jpg': b'\xff\xd8\xff', '.jpeg': b'\xff\xd8\xff', '.xlsx': b'PK\x03\x04'}
        if ext not in signatures or not raw_file.startswith(signatures[ext]): raise Invalid('Chỉ nhận PDF, PNG, JPG và XLSX đúng định dạng.')
        uid = secrets.token_hex(8)
        storage = uid + ext
        with db() as con:
            project_access(con, user, pid)
            item = dict(title=title, category=category, reference=reference, filename=Path(filename).name[:200], size=len(raw_file), storage=storage)
            (DATA/'files'/storage).write_bytes(raw_file)
            try:
                con.execute('INSERT INTO entities(id,kind,project_id,data,updated) VALUES(?,?,?,?,?)', (uid, 'documents', pid, json.dumps(item, ensure_ascii=False), now()))
                self.audit(con, user, 'Tải chứng từ', uid, 'documents')
            except Exception:
                (DATA/'files'/storage).unlink(missing_ok=True)
                raise
        self.send(201, {'id': uid})


def backup(destination):
    target = Path(destination).resolve()
    if DATA == target or DATA in target.parents: raise Invalid('Lưu bản sao lưu ngoài thư mục data.')
    if target.exists(): raise Invalid('Bản sao lưu đã tồn tại. Chọn tên mới để giữ bản cũ.')
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_suffix('.sqlite3')
    copy = sqlite3.connect(temp)
    try:
        with db() as source:
            source.backup(copy)
            copy.execute('DELETE FROM sessions')
            copy.commit()
    finally:
        copy.close()
    try:
        with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.write(temp, 'solar.sqlite3')
            for file in (DATA/'files').iterdir(): archive.write(file, 'files/'+file.name)
    finally: temp.unlink(missing_ok=True)
    print('Backup saved:', target)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--demo', action='store_true')
    parser.add_argument('--init', action='store_true')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8878)
    parser.add_argument('--backup')
    args = parser.parse_args()
    if args.demo:
        if args.host not in ('127.0.0.1', 'localhost'): parser.error('Demo chỉ chạy trên máy này.')
        os.environ['SOLAR_DATA_DIR'] = str(ROOT / 'data-demo')
        global DATA
        DATA = (ROOT / 'data-demo').resolve()
    initialize()
    if args.backup:
        backup(args.backup)
        return
    if args.init:
        username = input('Tên đăng nhập quản lý: ').strip().lower()
        name = input('Họ tên: ').strip()
        password = getpass.getpass('Mật khẩu (ít nhất 12 ký tự): ')
        if password != getpass.getpass('Nhập lại mật khẩu: '): raise Invalid('Mật khẩu không khớp.')
        if not username or not username.isascii() or not all(c.isalnum() or c in '._-' for c in username): raise Invalid('Tên đăng nhập không hợp lệ.')
        add_user(username, name or username, 'manager', password)
        print('Đã tạo tài khoản quản lý. Chạy python server.py để mở hệ thống.')
        return
    if args.demo: seed_demo()
    with db() as con:
        if not con.execute('SELECT 1 FROM users LIMIT 1').fetchone(): parser.error('Chạy python server.py --init trước, hoặc --demo để thử.')
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.demo = args.demo
    print(f'Local URL: http://{args.host}:{args.port}', flush=True)
    if args.demo: print('DEMO: admin / SolarDemo2026! (sample data only)', flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()


if __name__ == '__main__': main()

"""Integration tests use a temporary database, never the pilot's real data."""
import http.cookiejar
import json
import secrets
import shutil
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from http.server import ThreadingHTTPServer
import server


class Client:
    def __init__(self, base):
        self.base = base
        self.csrf = ''
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def request(self, path, method='GET', data=None, csrf=True, raw=None, headers=None):
        headers = dict(headers or {})
        if data is not None:
            raw = json.dumps(data).encode()
            headers['Content-Type'] = 'application/json'
        if csrf: headers['X-CSRF-Token'] = self.csrf
        req = urllib.request.Request(self.base+'/api/'+path, data=raw, method=method, headers=headers)
        try:
            response = self.opener.open(req)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        return response.status, json.loads(body) if response.headers.get('Content-Type','').startswith('application/json') else body

    def login(self, username='admin'):
        status, _ = self.request('login', 'POST', {'username':username,'password':'SolarDemo2026!'})
        assert status == 200
        status, state = self.request('state')
        self.csrf = state['me']['csrf']
        return state


class ApplicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        test_root = server.ROOT / '.test-data'
        test_root.mkdir(exist_ok=True)
        cls.temp_path = test_root / ('integration-' + secrets.token_hex(6))
        cls.temp_path.mkdir()
        cls.original_data = server.DATA
        server.DATA = cls.temp_path
        server.initialize()
        server.seed_demo()
        cls.http = ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        cls.http.demo = True
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = 'http://127.0.0.1:'+str(cls.http.server_port)

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        server.DATA = cls.original_data
        expected_parent = (server.ROOT / '.test-data').resolve()
        if cls.temp_path.resolve().parent != expected_parent:
            raise RuntimeError('Unexpected cleanup path')
        shutil.rmtree(cls.temp_path)

    def setUp(self):
        self.client = Client(self.base)
        self.state = self.client.login()
        self.project = next(p for p in self.state['projects'] if p['capacity']==120)

    def test_authentication_required_and_logout_invalidates_session(self):
        guest=Client(self.base)
        self.assertEqual(guest.request('state')[0],401)
        self.assertEqual(guest.request('login','POST',{'username':'admin','password':'wrong'})[0],401)
        self.assertEqual(self.client.request('logout','POST',{})[0],200)
        self.assertEqual(self.client.request('state')[0],401)

    def test_csrf_and_cross_origin_writes_are_rejected(self):
        self.assertEqual(self.client.request('projects','POST',{},csrf=False)[0],403)
        self.assertEqual(self.client.request('projects','POST',{},headers={'Origin':'https://evil.invalid'})[0],403)

    def test_finance_role_and_project_scope(self):
        client=Client(self.base)
        state=client.login('thicong')
        self.assertEqual(state['payments'],[])
        self.assertTrue(all('contract_value' not in p for p in state['projects']))
        self.assertTrue(all(state['me']['id'] in p['members'] for p in state['projects']))
        hidden = next(p for p in self.state['projects'] if p['capacity']==30)
        self.assertEqual(client.request('materials','POST',{'project_id':hidden['id']})[0],403)
        self.assertEqual(client.request('payments','POST',{})[0],403)
        self.assertEqual(client.request('export')[0],403)

    def test_accountant_cannot_change_construction_tasks(self):
        client=Client(self.base)
        state=client.login('ketoan')
        task=state['tasks'][0]
        self.assertEqual(client.request('tasks/'+task['id'],'PUT',task)[0],403)

    def test_field_updates_only_own_task_and_cannot_reassign(self):
        client=Client(self.base)
        state=client.login('thicong')
        task=next(t for t in state['tasks'] if t['assignee']==state['me']['id'])
        old_title=task['title']
        result=client.request('tasks/'+task['id'],'PUT',{**task,'title':'Unauthorized rewrite','assignee':'other','status':'Bị vướng','note':'Chờ duyệt bản vẽ'})
        self.assertEqual(result[0],200)
        updated=next(t for t in client.request('state')[1]['tasks'] if t['id']==task['id'])
        self.assertEqual(updated['title'],old_title)
        self.assertEqual(updated['assignee'],state['me']['id'])
        self.assertEqual(updated['note'],'Chờ duyệt bản vẽ')

    def test_payment_requires_actual_date_and_integer_amount(self):
        payload={'project_id':self.project['id'],'description':'Đợt thanh toán thử','category':'Hợp đồng','direction':'Thu','amount':1000,'due_date':'2026-10-12','status':'Đã thanh toán','paid_date':'','method':'Tiền mặt','note':''}
        self.assertEqual(self.client.request('payments','POST',payload)[0],400)
        payload['paid_date']='2026-10-12'
        self.assertEqual(self.client.request('payments','POST',payload)[0],201)
        payload['amount']=0.5
        self.assertEqual(self.client.request('payments','POST',payload)[0],400)
        payload['amount']=float('nan')
        self.assertEqual(self.client.request('payments','POST',payload)[0],400)

    def test_material_cannot_use_more_than_received(self):
        payload={'project_id':self.project['id'],'name':'MC4 thử','unit':'cặp','required':20,'received':10,'used':11,'supplier':'Kho','expected_date':'2026-10-12','note':''}
        self.assertEqual(self.client.request('materials','POST',payload)[0],400)
        payload['used']=8
        self.assertEqual(self.client.request('materials','POST',payload)[0],201)

    def test_optimistic_concurrency_prevents_lost_updates(self):
        task=self.state['tasks'][0]
        self.assertEqual(self.client.request('tasks/'+task['id'],'PUT',{**task,'note':'First update'})[0],200)
        self.assertEqual(self.client.request('tasks/'+task['id'],'PUT',{**task,'note':'Stale update'})[0],409)

    def upload(self, client, category, filename='invoice.pdf', content=b'%PDF-1.4\nExample'):
        boundary='test-solar-boundary'
        fields={'project_id':self.project['id'],'title':'Hóa đơn kiểm thử','category':category,'reference':'TEST-001'}
        raw=b''
        for key,value in fields.items():
            raw+=f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode()
        raw+=f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode()+content+f'\r\n--{boundary}--\r\n'.encode()
        return client.request('documents','POST',raw=raw,headers={'Content-Type':'multipart/form-data; boundary='+boundary})

    def test_document_upload_and_authenticated_download(self):
        status,payload=self.upload(self.client,'Hóa đơn')
        self.assertEqual(status,201,payload)
        uid=payload['id']
        self.assertEqual(self.client.request('documents/'+uid)[0],200)
        self.assertEqual(Client(self.base).request('documents/'+uid)[0],401)
        field=Client(self.base)
        field.login('thicong')
        self.assertEqual(field.request('documents/'+uid)[0],403)
        self.assertEqual(self.upload(field,'Hóa đơn')[0],403)
        self.assertEqual(self.upload(field,'Hợp đồng')[0],403)
        self.assertEqual(self.upload(self.client,'Khác','malware.pdf',b'<script>bad</script>')[0],400)

    def test_csv_export_and_formula_injection(self):
        payload={**self.project,'name':'=HYPERLINK("bad")'}
        payload.pop('id')
        self.assertEqual(self.client.request('projects','POST',payload)[0],201)
        status,content=self.client.request('export')
        self.assertEqual(status,200)
        self.assertIn(b"'=HYPERLINK",content)

    def test_archive_hides_project_and_dependents_but_preserves_database(self):
        project={**self.project,'name':'Công trình lưu trữ thử'}
        _,result=self.client.request('projects','POST',project)
        pid=result['id']
        _,result=self.client.request('tasks','POST',{'project_id':pid,'title':'Task archive','assignee':'','phase':'Khảo sát','due_date':'2026-10-12','status':'Chưa làm','note':''})
        task_id=result['id']
        self.assertEqual(self.client.request('projects/'+pid,'DELETE',{'version':1})[0],200)
        state=self.client.request('state')[1]
        self.assertFalse(any(p['id']==pid for p in state['projects']))
        self.assertFalse(any(t['id']==task_id for t in state['tasks']))
        with server.db() as con:
            self.assertEqual(con.execute('SELECT deleted FROM entities WHERE id=?',(task_id,)).fetchone()[0],1)

    def test_unknown_paths_and_database_are_not_served(self):
        req=urllib.request.Request(self.base+'/data/solar.sqlite3')
        with self.assertRaises(urllib.error.HTTPError) as result: urllib.request.urlopen(req)
        self.assertEqual(result.exception.code,401)


if __name__=='__main__': unittest.main(verbosity=2)

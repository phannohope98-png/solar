/* Browser pilot for GitHub Pages. Local IndexedDB, never shared-company authentication. */
(function(root) {
  'use strict';
  const KINDS = ['projects','tasks','materials','payments','documents'];
  const PHASES = ['Khảo sát','Thiết kế','Mua vật tư','Thi công','Nghiệm thu','Bảo hành'];
  const PRIVATE_DOCS = ['Hợp đồng','Hóa đơn','Thanh toán'];
  const uid = () => root.crypto.randomUUID();
  const stamp = () => new Date().toISOString();
  const localDay = () => {const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const fail = message => {throw new Error(message);};
  function text(data,key,required=false,max=2000) {const v=data[key]??'';if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail('Thông tin không hợp lệ: '+key);return v.trim();}
  function number(data,key,integer=false) {const v=data[key]??0;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e12||(integer&&!Number.isInteger(v)))fail('Số không hợp lệ: '+key);return v;}
  function day(data,key,required=false) {const v=text(data,key,required);if(v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T12:00:00Z'))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v))fail('Ngày không hợp lệ: '+key);return v;}
  function choice(data,key,values) {const v=text(data,key,true);if(!values.includes(v))fail('Lựa chọn không hợp lệ: '+key);return v;}
  function validate(kind,data,db) {
    if(kind==='projects') {
      if(!Array.isArray(data.members)||data.members.some(id=>!db.users.some(u=>u.id===id)))fail('Nhân sự không hợp lệ.');
      const result={name:text(data,'name',true,180),customer:text(data,'customer',true,180),phone:text(data,'phone',false,40),address:text(data,'address',true,500),capacity:number(data,'capacity'),contract_value:number(data,'contract_value',true),start_date:day(data,'start_date'),due_date:day(data,'due_date',true),status:choice(data,'status',['Chuẩn bị','Đang thực hiện','Tạm dừng','Hoàn thành']),members:[...new Set(data.members)],note:text(data,'note')};
      if(data.project_type!==undefined){if(!['Lắp đặt','Vệ sinh pin','Bảo trì / sửa chữa'].includes(data.project_type))fail('Loại công việc không hợp lệ.');result.project_type=data.project_type;}
      if(result.start_date&&result.start_date>result.due_date)fail('Hạn bàn giao phải sau hoặc cùng ngày bắt đầu.');
      return result;
    }
    if(kind==='tasks') {
      const project=db.projects.find(p=>p.id===data.project_id&&!p.deleted);
      const assignee=text(data,'assignee');
      if(!project)fail('Công trình không tồn tại.');
      if(assignee&&!project.members.includes(assignee))fail('Người phụ trách phải thuộc đội công trình.');
      return {title:text(data,'title',true,300),assignee,phase:choice(data,'phase',PHASES),due_date:day(data,'due_date',true),status:choice(data,'status',['Chưa làm','Đang làm','Bị vướng','Hoàn thành']),note:text(data,'note')};
    }
    if(kind==='materials') {
      const result={name:text(data,'name',true,200),unit:text(data,'unit',true,30),required:number(data,'required'),received:number(data,'received'),used:number(data,'used'),supplier:text(data,'supplier',false,200),expected_date:day(data,'expected_date'),note:text(data,'note')};
      if(result.used>result.received)fail('Đã sử dụng không được vượt số lượng đã nhận.');
      return result;
    }
    if(kind==='payments') {
      const result={description:text(data,'description',true,300),direction:choice(data,'direction',['Thu','Chi']),category:text(data,'category',true,100),amount:number(data,'amount',true),due_date:day(data,'due_date',true),status:choice(data,'status',['Chưa thanh toán','Đã thanh toán']),paid_date:day(data,'paid_date'),method:text(data,'method',false,100),note:text(data,'note')};
      if(!result.amount)fail('Số tiền phải lớn hơn 0.');
      if(result.status==='Đã thanh toán'&&!result.paid_date)fail('Cần nhập ngày thực thu / thực chi.');
      if(result.paid_date>localDay())fail('Ngày thanh toán thực tế không được ở tương lai.');
      if(result.status==='Chưa thanh toán')result.paid_date='';
      return result;
    }
    fail('Loại dữ liệu không hợp lệ.');
  }
  function seed() {
    const shift=n=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
    const db={schema:1,users:[{id:'demo-manager',username:'admin',name:'Vũ · Quản lý',role:'manager'},{id:'demo-accountant',username:'ketoan',name:'Linh · Kế toán',role:'accountant'},{id:'demo-field',username:'thicong',name:'Minh · Đội thi công',role:'field'}],projects:[],tasks:[],materials:[],payments:[],documents:[],audit:[],files:{}};
    function add(kind,pid,item) {const row={...item,id:uid(),project_id:pid,version:1,updated:stamp()};db[kind].push(row);return row;}
    const a=add('projects',null,{name:'Nhà xưởng An Phát · 120 kWp',customer:'Công ty An Phát (mẫu)',phone:'0900000000',address:'Bến Lức, Long An',capacity:120,contract_value:980000000,start_date:shift(-12),due_date:shift(5),status:'Đang thực hiện',members:['demo-manager','demo-accountant','demo-field'],note:'Công trình minh họa để thử quy trình.'});
    const b=add('projects',null,{name:'Nhà phố Tân Bình · 8 kWp',customer:'Anh Hoàng (mẫu)',phone:'0900000001',address:'Tân Bình, Thành phố Hồ Chí Minh',capacity:8,contract_value:126000000,start_date:shift(-5),due_date:shift(2),status:'Đang thực hiện',members:['demo-manager','demo-field'],note:'Hybrid, lưu trữ 10 kWh. Dữ liệu mẫu.'});
    const c=add('projects',null,{name:'Khách sạn Đà Lạt · 30 kWp',customer:'Khách sạn Minh An (mẫu)',phone:'0900000002',address:'Đà Lạt, Lâm Đồng',capacity:30,contract_value:350000000,start_date:shift(3),due_date:shift(20),status:'Chuẩn bị',members:['demo-manager','demo-accountant'],note:'Chờ phương án mái. Dữ liệu mẫu.'});
    [a,b,c].forEach((project,i)=>PHASES.slice(0,5).forEach((phase,j)=>add('tasks',project.id,{title:['Khảo sát mái & xác nhận nhu cầu','Chốt bản vẽ và cấu hình thiết bị','Kiểm đủ thiết bị trước khi ra công trình','Lắp khung, tấm pin và đấu nối','Đo kiểm và bàn giao cho khách'][j],phase,assignee:i<2?'demo-field':'demo-manager',due_date:shift(i===0?j-2:j+2),status:i===0?(j<2?'Hoàn thành':j===2?'Bị vướng':'Chưa làm'):i===1&&j===0?'Hoàn thành':'Chưa làm',note:i===0&&j===2?'Chờ giao thêm MC4.':''})));
    [['Tấm pin 580W','tấm',208,208,120],['Đầu nối MC4','cặp',60,42,30],['Cáp DC 6 mm²','m',800,600,400]].forEach(([name,unit,required,received,used])=>add('materials',a.id,{name,unit,required,received,used,supplier:'Nhà cung cấp mẫu',expected_date:shift(1),note:''}));
    add('materials',b.id,{name:'Pin lưu trữ 10 kWh',unit:'bộ',required:1,received:0,used:0,supplier:'Kho mẫu',expected_date:shift(2),note:'Cần chốt ngày giao.'});
    [[a,'Đặt cọc hợp đồng 30%','Thu',294000000,true,-12],[a,'Thanh toán đợt 2','Thu',392000000,false,-1],[a,'Vật tư đợt 1','Chi',220000000,true,-5],[a,'Cáp DC và đầu nối','Chi',32000000,false,1],[b,'Đặt cọc','Thu',38000000,true,-3],[c,'Đặt cọc sau khi ký','Thu',105000000,false,3]].forEach(([p,description,direction,amount,paid,n])=>add('payments',p.id,{description,direction,amount,status:paid?'Đã thanh toán':'Chưa thanh toán',due_date:shift(n),paid_date:paid?shift(n):'',method:'Chuyển khoản',category:direction==='Thu'?'Hợp đồng':'Vật tư',note:'Dữ liệu mẫu.'}));
    return db;
  }
  class IndexedWorkspace {
    constructor(name='khai-minh-ops-browser-v1') {this.name=name;}
    async open() {
      if(this.db)return this.db;
      this.db=await new Promise((resolve,reject)=>{const req=root.indexedDB.open(this.name,1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Đóng tab cũ rồi mở lại.'));});
      this.db.onversionchange=()=>{this.db.close();this.db=null;};
      return this.db;
    }
    async mutate(fn) {
      const database=await this.open();
      return new Promise((resolve,reject)=>{const tx=database.transaction('state','readwrite');const store=tx.objectStore('state');const req=store.get('workspace');let result,problem;req.onsuccess=()=>{try{const db=req.result||seed();result=fn(db);store.put(db,'workspace');}catch(error){problem=error;tx.abort();}};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(problem||new Error('Không lưu được dữ liệu. Kiểm tra dung lượng trình duyệt.'));tx.onabort=()=>reject(problem||new Error('Thao tác đã hủy; dữ liệu cũ được giữ nguyên.'));});
    }
    async read() {return this.mutate(db=>{root.SolarWorkflow?.migrate(db);return structuredClone(db);});}
    async replace(value) {const database=await this.open();return new Promise((resolve,reject)=>{const tx=database.transaction('state','readwrite');tx.objectStore('state').put(value,'workspace');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('Không khôi phục được dữ liệu.'));});}
  }
  class Engine {
    constructor(storage,session) {this.storage=storage;this.session=session;}
    user(db) {const id=this.session.get();const user=db.users.find(u=>u.id===id);if(!user)fail('Vui lòng chọn vai trò để đăng nhập bản thử.');return user;}
    project(db,user,id) {const p=db.projects.find(p=>p.id===id&&!p.deleted);if(!p)fail('Công trình không tồn tại.');if(user.role==='field'&&!p.members.includes(user.id))fail('Bạn chưa được phân công công trình này.');return p;}
    audit(db,user,action,item,kind) {db.audit.unshift({id:uid(),at:stamp(),actor:user.name,action,entity_id:item.id,kind});db.audit=db.audit.slice(0,200);}
    view(db) {
      root.SolarWorkflow?.migrate(db);
      const user=this.user(db),allowed=new Set(db.projects.filter(p=>!p.deleted&&(user.role!=='field'||p.members.includes(user.id))).map(p=>p.id));
      const state={me:{id:user.id,name:user.name,username:user.username,role:user.role,csrf:'browser-pilot'},demo:true,browser:true,phases:PHASES,users:db.users.map(({passwordHash,...u})=>u),audit:user.role==='manager'?db.audit.slice(0,40):[]};
      for(const kind of KINDS)state[kind]=db[kind].filter(item=>!item.deleted&&(kind==='projects'?allowed.has(item.id):allowed.has(item.project_id))&&!(user.role==='field'&&(kind==='payments'||kind==='documents'&&PRIVATE_DOCS.includes(item.category)))).map(item=>{const copy=structuredClone(item);if(user.role==='field'&&kind==='projects')delete copy.contract_value;return copy;});
      if(root.SolarWorkflow)Object.assign(state,root.SolarWorkflow.view(db,user,allowed));
      return state;
    }
    async request(path,options={}) {
      const method=options.method||'GET';let data=options.body||{};
      if(path==='health')return {ok:true,demo:true,browser:true};
      if(path==='login') {const db=await this.storage.read();const user=db.users.find(u=>u.username===String(data.username||'').trim().toLowerCase());if(!user)fail('Tên đăng nhập không đúng.');const ok=user.passwordHash?await hash(String(data.password))===user.passwordHash:data.password==='SolarDemo2026!';if(!ok)fail('Mật khẩu thử không đúng.');this.session.set(user.id);return {ok:true};}
      if(path==='logout') {this.session.clear();return {ok:true};}
      if(path==='state')return this.view(await this.storage.read());
      if(path.startsWith('project-workflow/')&&method==='POST')return this.storage.mutate(db=>root.SolarProjectWorkflow.apply(this,db,path.slice(17),data));
      if(path.startsWith('operations/')&&method==='POST')return this.storage.mutate(db=>root.SolarWorkflow.apply(this,db,path.slice(11),data));
      if(path==='users'&&method==='POST') {
        const username=text(data,'username',true,80).toLowerCase(),name=text(data,'name',true,100),role=choice(data,'role',['manager','accountant','field']);
        if(!/^[a-z0-9._-]+$/.test(username))fail('Tên đăng nhập dùng chữ không dấu, số, dấu chấm hoặc gạch.');
        if(typeof data.password!=='string'||data.password.length<12)fail('Mật khẩu thử cần ít nhất 12 ký tự.');
        const passwordHash=await hash(data.password);
        return this.storage.mutate(db=>{const user=this.user(db);if(user.role!=='manager')fail('Chỉ quản lý được thêm nhân sự.');if(db.users.some(u=>u.username===username))fail('Tên đăng nhập đã tồn tại.');const item={id:uid(),username,name,role,passwordHash};db.users.push(item);this.audit(db,user,'Thêm nhân sự',item,'users');return {id:item.id};});
      }
      if(path==='documents'&&method==='POST')return this.upload(data);
      const [kind,id]=path.split('/');
      if(!KINDS.includes(kind)||!['POST','PUT','DELETE'].includes(method))fail('Chức năng chưa được hỗ trợ trong bản thử.');
      if(kind==='documents'&&method!=='DELETE')fail('Dùng chức năng tải hồ sơ.');
      return this.storage.mutate(db=>{
        const user=this.user(db);let item=id?db[kind].find(x=>x.id===id&&!x.deleted):null;
        if(id&&!item)fail('Dữ liệu không tồn tại.');
        if(item&&data.version!==item.version)fail('Dữ liệu vừa thay đổi ở tab khác. Làm mới trước khi sửa.');
        if(method==='POST'&&id||method!=='POST'&&!id)fail('Đường dẫn thao tác không hợp lệ.');
        const pid=kind==='projects'?null:item?.project_id||data.project_id;
        if(kind!=='projects')this.project(db,user,pid);
        if(kind==='projects'&&user.role!=='manager'||kind==='payments'&&user.role==='field'||['tasks','materials'].includes(kind)&&user.role==='accountant')fail('Vai trò này không được sửa dữ liệu này.');
        if(method==='DELETE') {
          if(user.role!=='manager')fail('Chỉ quản lý được lưu trữ.');
          item.deleted=true;item.version++;item.updated=stamp();
          if(kind==='projects')for(const k of KINDS.filter(k=>k!=='projects'))db[k].filter(x=>x.project_id===id).forEach(x=>{x.deleted=true;x.version++;});
          this.audit(db,user,'Lưu trữ',item,kind);return {id};
        }
        if(user.role==='field'&&kind==='tasks') {if(!item||item.assignee!==user.id)fail('Bạn chỉ cập nhật được việc của mình.');data={...item,status:data.status,note:data.note};}
        const clean=validate(kind,{...data,project_id:pid},db);
        if(item&&kind==='projects'&&db.tasks.some(t=>!t.deleted&&t.project_id===id&&t.assignee&&!clean.members.includes(t.assignee)))fail('Chuyển công việc trước khi bỏ người phụ trách khỏi đội.');
        const result={...item,...clean,id:id||uid(),project_id:pid,version:(item?.version||0)+1,updated:stamp()};
        if(item)db[kind][db[kind].indexOf(item)]=result;else db[kind].unshift(result);
        this.audit(db,user,item?'Cập nhật':'Thêm',result,kind);return {id:result.id};
      });
    }
    async upload(form) {
      const file=form.get('file');if(!file||!file.size||file.size>10*1024*1024)fail('Tệp phải có dung lượng từ 1 byte đến 10 MB.');
      const ext=file.name.split('.').pop().toLowerCase();if(!['pdf','jpg','jpeg','png','xlsx'].includes(ext))fail('Chỉ nhận PDF, JPG, PNG hoặc XLSX.');
      const head=new Uint8Array(await file.slice(0,8).arrayBuffer());
      const valid=ext==='pdf'?new TextDecoder().decode(head).startsWith('%PDF-'):ext==='png'?head[0]===137&&head[1]===80&&head[2]===78:ext==='xlsx'?head[0]===80&&head[1]===75:head[0]===255&&head[1]===216;
      if(!valid)fail('Nội dung tệp không khớp định dạng.');
      const title=text({title:form.get('title')},'title',true,200),category=choice({category:form.get('category')},'category',['Hợp đồng','Hóa đơn','Thanh toán','Bản vẽ','Nghiệm thu','Ảnh công trình','Khác']),reference=text({reference:form.get('reference')},'reference',false,100),pid=form.get('project_id');
      return this.storage.mutate(db=>{const user=this.user(db);this.project(db,user,pid);if(user.role==='field'&&PRIVATE_DOCS.includes(category))fail('Thi công không được tải chứng từ tài chính.');const item={id:uid(),project_id:pid,title,category,reference,filename:file.name,size:file.size,version:1,updated:stamp()};db.files[item.id]=file;db.documents.unshift(item);this.audit(db,user,'Tải hồ sơ',item,'documents');return {id:item.id};});
    }
    async file(id) {const db=await this.storage.read(),user=this.user(db),item=db.documents.find(x=>x.id===id&&!x.deleted);if(!item)fail('Hồ sơ không tồn tại.');this.project(db,user,item.project_id);if(user.role==='field'&&PRIVATE_DOCS.includes(item.category))fail('Bạn không được xem chứng từ tài chính.');const blob=db.files[id];if(!blob)fail('Tệp không tồn tại.');return {blob,name:item.filename};}
    async backup() {
      const db=await this.storage.read(),user=this.user(db);if(user.role!=='manager')fail('Chỉ quản lý được sao lưu bản thử.');
      root.SolarWorkflow?.migrate(db);
      const files={};for(const [id,blob] of Object.entries(db.files)) {const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));files[id]={type:blob.type,data:root.btoa(binary)};}
      return JSON.stringify({format:'khai-minh-ops-browser',version:1,exported:stamp(),workspace:{...db,files}},null,2);
    }
    async restore(raw) {
      const current=await this.storage.read();if(this.user(current).role!=='manager')fail('Chỉ quản lý được khôi phục.');
      let backup;try{backup=JSON.parse(raw);}catch{fail('Tệp sao lưu không phải JSON hợp lệ.');}
      if(backup.format!=='khai-minh-ops-browser'||backup.version!==1)fail('Không đúng bản sao lưu Khải Minh Ops.');
      const db=backup.workspace;if(!db||db.schema!==1||!Array.isArray(db.users)||!Array.isArray(db.audit)||!db.files)fail('Cấu trúc sao lưu không hợp lệ.');
      if(db.users.length>1000||db.users.some(u=>typeof u.id!=='string'||typeof u.name!=='string'||typeof u.username!=='string'||!['manager','accountant','field'].includes(u.role)))fail('Danh sách nhân sự không hợp lệ.');
      if(!db.users.some(u=>u.role==='manager'))fail('Bản sao lưu cần có quản lý.');
      for(const kind of KINDS) {if(!Array.isArray(db[kind])||db[kind].length>20000)fail('Dữ liệu sao lưu không hợp lệ.');const ids=new Set();for(const item of db[kind]){if(typeof item.id!=='string'||ids.has(item.id)||!Number.isInteger(item.version)||item.version<1)fail('Mã hồ sơ không hợp lệ hoặc trùng.');ids.add(item.id);if(kind!=='documents'){validate(kind,item,db);}if(kind!=='projects'&&!db.projects.some(p=>p.id===item.project_id))fail('Hồ sơ không gắn với công trình hợp lệ.');}}
      const files={};for(const item of db.documents){if(!item.deleted){const entry=db.files[item.id];if(!entry||typeof entry.data!=='string')fail('Bản sao lưu thiếu tệp hồ sơ.');const binary=root.atob(entry.data);if(binary.length>10*1024*1024)fail('Tệp trong sao lưu quá lớn.');files[item.id]=new Blob([Uint8Array.from(binary,c=>c.charCodeAt(0))],{type:entry.type||'application/octet-stream'});}}
      root.SolarWorkflow?.validateBackup(db);
      await this.storage.replace({...db,files});this.session.clear();return {ok:true};
    }
    async reset() {const db=await this.storage.read();if(this.user(db).role!=='manager')fail('Chỉ quản lý được đặt lại dữ liệu mẫu.');await this.storage.replace(seed());this.session.clear();}
  }
  async function hash(value) {return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
  const exported={Engine,IndexedWorkspace,seed,validate,localDay};
  if(typeof module!=='undefined'&&module.exports)module.exports=exported;
  if(root.location) {
    const enabled=root.location.hostname.endsWith('.github.io')||root.location.protocol==='file:'||new URLSearchParams(root.location.search).get('mode')==='browser';
    if(enabled){const session={get:()=>root.sessionStorage.getItem('solar-pilot-user'),set:id=>root.sessionStorage.setItem('solar-pilot-user',id),clear:()=>root.sessionStorage.removeItem('solar-pilot-user')};const engine=new Engine(new IndexedWorkspace(),session);root.SolarLocal={enabled:true,request:(...args)=>engine.request(...args),file:id=>engine.file(id),backup:()=>engine.backup(),restore:raw=>engine.restore(raw),reset:()=>engine.reset()};}
  }
})(typeof window!=='undefined'?window:globalThis);

(function(root){
'use strict';
const gates={
 'Lắp đặt':['Khảo sát và phạm vi được xác nhận','Bản vẽ / cấu hình được duyệt','Vật tư và lịch giao được kiểm tra','Đội / tiếp cận / phương án công tác được xác nhận','Kết quả kiểm tra và tồn tại được ghi nhận','Hồ sơ bàn giao và lịch bảo trì được chốt'],
 'Vệ sinh pin':['Khu vực, số tấm và tình trạng ban đầu được ghi nhận','Lịch với khách và điều kiện tiếp cận được xác nhận','Đội, dụng cụ và phương án công tác được xác nhận','Ảnh trước / sau và bất thường được lưu','Khách xác nhận kết quả và lịch dịch vụ tiếp'],
 'Bảo trì / sửa chữa':['Sự cố và thông tin thiết bị được ghi nhận','Kết quả khảo sát / chẩn đoán được lưu','Phương án và linh kiện thay thế được duyệt','Kết quả kiểm tra sau xử lý được lưu','Hồ sơ bảo hành và lần kiểm tra tiếp được chốt']
};
const categories=['Thiết kế / phạm vi','Vật tư / giao hàng','Nhân sự / lịch','Hiện trường / thời tiết','Chất lượng / nghiệm thu','Thiết bị / bảo hành','Khác'];
const fail=m=>{throw new Error(m);};
const text=(d,k,required=false)=>{const v=d[k]??'';if(typeof v!=='string'||v.length>2000||(required&&!v.trim()))fail(({title:'Nhập nội dung ngắn của vấn đề.',note:'Ghi rõ căn cứ hoặc kết quả xử lý trước khi lưu.',owner:'Chọn người xử lý hợp lệ.'})[k]||'Thông tin không hợp lệ.');return v.trim();};
const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail('Ngày xử lý không hợp lệ.');return v;};
function apply(engine,db,action,d){
 const user=engine.user(db),p=engine.project(db,user,d.project_id),manager=user.role==='manager',at=new Date().toISOString();
 if(user.role==='accountant')fail('Vai trò này không cập nhật điều phối hiện trường.');
 const owner=()=>{const id=text(d,'owner');if(id&&!p.members.includes(id))fail('Người xử lý phải thuộc đội công trình.');return id;};
 if(action==='incident'){
   if(!categories.includes(d.category)||!['Thường','Gấp'].includes(d.priority))fail('Loại hoặc mức ưu tiên không hợp lệ.');
   const assigned=manager?owner():user.id;const due=date(d.due_date),title=text(d,'title',true),note=text(d,'note',true);
   p.incidents??=[];if(d.request_id&&p.incidents.some(r=>r.request_id===d.request_id))return {id:p.incidents.find(r=>r.request_id===d.request_id).id};
   const r={id:root.crypto.randomUUID(),request_id:text(d,'request_id'),title,category:d.category,priority:d.priority,owner:assigned,due_date:due,note,status:'Mở',version:1,created:at,history:[{at,actor:user.name,status:'Mở',priority:d.priority,owner:assigned,due_date:due,note}]};p.incidents.unshift(r);p.version++;engine.audit(db,user,'Báo điểm nghẽn',r,'incidents');return {id:r.id};
 }
 if(action==='incident-update'){
   const r=(p.incidents||[]).find(r=>r.id===d.id);if(!r)fail('Không tìm thấy điểm nghẽn.');if(!manager&&r.owner!==user.id)fail('Chỉ người xử lý hoặc quản lý được cập nhật.');if(r.version!==d.version)fail('Điểm nghẽn vừa thay đổi. Làm mới trước khi sửa.');
   if(!['Mở','Đang xử lý','Đã xử lý'].includes(d.status))fail('Trạng thái không hợp lệ.');const note=text(d,'note',true),assigned=manager?owner():r.owner;
   if(d.status!=='Đã xử lý'&&!assigned)fail('Giao người xử lý trước khi cập nhật.');
   if(d.priority!==undefined&&!['Thường','Gấp'].includes(d.priority))fail('Ưu tiên không hợp lệ.');if(d.category!==undefined&&!categories.includes(d.category))fail('Nhóm vấn đề không hợp lệ.');
   r.owner=assigned;r.due_date=date(d.due_date);r.status=d.status;r.note=note;r.priority=d.priority||r.priority;r.category=d.category||r.category;r.version++;r.history.push({at,actor:user.name,status:r.status,priority:r.priority,owner:r.owner,due_date:r.due_date,note});p.version++;engine.audit(db,user,'Cập nhật điểm nghẽn',r,'incidents');return {id:r.id};
 }
 if(action==='readiness'){
   if(!manager)fail('Quản lý mới xác nhận điều kiện chuyển bước.');if(p.version!==d.version)fail('Hồ sơ vừa thay đổi. Làm mới trước khi sửa.');
   const list=gates[p.project_type||'Lắp đặt'];if(!list.includes(d.name)||!['Chưa xác nhận','Đã xác nhận','Không áp dụng'].includes(d.status))fail('Mục kiểm tra không hợp lệ.');
   const note=text(d,'note',d.status!=='Chưa xác nhận'),assigned=owner(),due=d.due_date?date(d.due_date):'',doc=text(d,'document_id');
   if(doc&&!db.documents.some(x=>x.id===doc&&x.project_id===p.id&&!x.deleted))fail('Tệp phải thuộc công trình này.');
   p.readiness??=[];const existing=p.readiness.find(r=>r.name===d.name);const r={name:d.name,status:d.status,owner:assigned,due_date:due,note,document_id:doc,updated:at,actor:user.name,history:[...(existing?.history||[]),{at,actor:user.name,status:d.status,note}]};if(existing)p.readiness[p.readiness.indexOf(existing)]=r;else p.readiness.push(r);p.version++;engine.audit(db,user,'Xác nhận điều kiện',p,'projects');return {id:p.id};
 }
 fail('Thao tác điều phối không hợp lệ.');
}
function priorities(state,at,person='all'){
 const items=[],active=new Set(state.projects.filter(p=>p.status!=='Hoàn thành').map(p=>p.id));
 for(const p of state.projects){for(const i of p.incidents||[]){if(i.status==='Đã xử lý'||(person!=='all'&&i.owner!==person))continue;items.push({key:'incident-'+i.id,kind:'incident',id:i.id,project_id:p.id,title:i.title,owner:i.owner,due_date:i.due_date,reason:i.priority==='Gấp'?'Điểm nghẽn gấp':i.due_date<at?'Điểm nghẽn quá hạn':'Điểm nghẽn đang mở',rank:i.priority==='Gấp'?0:i.due_date<at?1:2});}}
 for(const t of state.tasks){if(t.status==='Hoàn thành'||!active.has(t.project_id)||(person!=='all'&&t.assignee!==person))continue;let rank,reason;if(t.status==='Bị vướng'){rank=1;reason='Công việc bị vướng';}else if(t.due_date<at){rank=2;reason='Công việc quá hạn';}else if(!t.assignee){rank=3;reason='Chưa giao người';}else if(t.due_date===at){rank=4;reason='Đến hạn hôm nay';}else continue;items.push({key:'task-'+t.id,kind:'task',id:t.id,project_id:t.project_id,title:t.title,owner:t.assignee,due_date:t.due_date,reason,rank});}
 if(person==='all')for(const m of state.materials){if(!active.has(m.project_id)||m.received>=m.required)continue;items.push({key:'material-'+m.id,kind:'material',id:m.id,project_id:m.project_id,title:'Thiếu '+(m.required-m.received)+' '+m.unit+' '+m.name,owner:'',due_date:m.expected_date||'',reason:m.expected_date&&m.expected_date<at?'Vật tư chậm giao':'Cần kiểm tra vật tư',rank:m.expected_date&&m.expected_date<at?2:5});}
 if(person==='all')for(const p of state.projects){if(!active.has(p.id)||!p.start_date||p.start_date>at)continue;const list=gates[p.project_type||'Lắp đặt']||gates['Lắp đặt'];const missing=list.find(name=>!(p.readiness||[]).some(r=>r.name===name&&r.status!=='Chưa xác nhận'));if(missing)items.push({key:'readiness-'+p.id,kind:'readiness',project_id:p.id,id:p.id,title:missing,owner:'',due_date:p.due_date,reason:'Điều kiện chưa xác nhận',rank:6});}
 return items.sort((a,b)=>a.rank-b.rank||(a.due_date||'9999').localeCompare(b.due_date||'9999'));
}
function validateBackup(db){for(const p of db.projects){for(const key of ['incidents','readiness'])if(p[key]!==undefined&&(!Array.isArray(p[key])||p[key].length>2000))fail('Danh sách điểm nghẽn / điều kiện không hợp lệ.');const ids=new Set();for(const i of p.incidents||[]){if(typeof i.id!=='string'||ids.has(i.id)||!['Mở','Đang xử lý','Đã xử lý'].includes(i.status)||!categories.includes(i.category)||!['Thường','Gấp'].includes(i.priority)||!Number.isInteger(i.version)||i.version<1)fail('Điểm nghẽn trong sao lưu không hợp lệ.');ids.add(i.id);text(i,'title',true);text(i,'note',true);date(i.due_date);if(i.owner&&!db.users.some(u=>u.id===i.owner))fail('Thiếu người xử lý trong sao lưu.');if(!Array.isArray(i.history)||i.history.length>5000||i.history.some(h=>typeof h.note!=='string'||typeof h.actor!=='string'||typeof h.at!=='string'))fail('Lịch sử điểm nghẽn không hợp lệ.');}for(const r of p.readiness||[]){if(typeof r.name!=='string'||!Object.values(gates).flat().includes(r.name)||!['Chưa xác nhận','Đã xác nhận','Không áp dụng'].includes(r.status)||!Array.isArray(r.history))fail('Điều kiện trong sao lưu không hợp lệ.');if(r.document_id&&!db.documents.some(d=>d.id===r.document_id&&d.project_id===p.id))fail('Thiếu bằng chứng trong sao lưu.');if(r.due_date)date(r.due_date);}}}
const result={gates,categories,apply,priorities,validateBackup};root.FocusOps=result;
if(root.SolarProjectWorkflow){const original=root.SolarProjectWorkflow.apply;root.SolarProjectWorkflow.apply=(e,db,a,d)=>['incident','incident-update','readiness'].includes(a)?apply(e,db,a,d):original(e,db,a,d);}
if(typeof module!=='undefined')module.exports=result;
})(typeof window!=='undefined'?window:globalThis);

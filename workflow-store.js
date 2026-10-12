/* Operations for the single-browser pilot; every change is one IndexedDB transaction. */
(function(root){
'use strict';
const kinds=['schedule','journal','purchases','movements','receipts','checks'];
const err=m=>{throw new Error(m);};
const str=(d,k,required=true)=>{const v=d[k]??'';if(typeof v!=='string'||v.length>3000||(required&&!v.trim()))err('Cần nhập '+k);return v.trim();};
const num=(d,k)=>{const v=d[k];if(typeof v!=='number'||!Number.isFinite(v)||v<=0||v>1e12)err('Số lượng / số tiền phải lớn hơn 0.');return v;};
const date=(d,k)=>{const v=str(d,k);if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)err('Ngày không hợp lệ.');return v;};
const now=()=>new Date().toISOString();
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
function migrate(db){
  if(db.operationsVersion===2)return;
  kinds.forEach(k=>db[k]??=[]);
  // Historical paid totals become explicit opening entries, never counted twice.
  for(const p of db.payments){if(p.status==='Đã thanh toán'&&!db.receipts.some(r=>r.payment_id===p.id))db.receipts.push({id:'opening-'+p.id,project_id:p.project_id,payment_id:p.id,amount:p.amount,date:p.paid_date,method:p.method||'Chuyển khoản',reference:'',document_id:'',reconciled:false,opening:true,version:1,actor:'Dữ liệu chuyển từ bản 1',updated:now()});}
  db.operationsVersion=2;
}
function total(db,payment){return db.receipts.filter(r=>r.payment_id===payment.id&&!r.voided).reduce((s,r)=>s+r.amount,0);}
function material(db,id,pid){const m=db.materials.find(m=>m.id===id&&m.project_id===pid&&!m.deleted);if(!m)err('Chọn vật tư thuộc công trình này.');return m;}
function document(db,id,pid){if(id&&!db.documents.some(d=>d.id===id&&d.project_id===pid&&!d.deleted))err('Chứng từ không thuộc công trình này.');return id||'';}
function apply(engine,db,action,d){
  migrate(db);const user=engine.user(db),project=engine.project(db,user,d.project_id),pid=project.id;
  const manager=user.role==='manager',finance=user.role!=='field';
  if(!finance&&d.document_id&&db.documents.some(x=>x.id===d.document_id&&['Hợp đồng','Hóa đơn','Thanh toán'].includes(x.category)))err('Thi công không được gắn chứng từ tài chính.');
  let result,kind;
  if(d.request_id){const previous=kinds.flatMap(k=>db[k]).find(r=>r.request_id===d.request_id);if(previous)return {id:previous.id};}
  const add=(k,data)=>{kind=k;result={request_id:d.request_id||'',...data,id:root.crypto.randomUUID(),project_id:pid,actor:user.name,actor_id:user.id,updated:now(),version:1};db[k].unshift(result);};
  const get=k=>{const r=db[k].find(r=>r.id===d.id&&r.project_id===pid&&!r.deleted);if(!r)err('Mục đã thay đổi hoặc không tồn tại.');if(d.version!==r.version)err('Mục vừa được thay đổi. Làm mới trước khi thao tác.');kind=k;result=r;return r;};
  if(action==='schedule'){
    if(!manager)err('Quản lý mới được điều đội.');
    const start=date(d,'start'),end=date(d,'end');if(start>end)err('Ngày kết thúc phải sau ngày bắt đầu.');
    if(!Array.isArray(d.members)||!d.members.length||d.members.some(id=>!project.members.includes(id)))err('Chọn nhân sự trong đội công trình.');
    const overlaps=db.schedule.filter(s=>db.projects.some(p=>p.id===s.project_id&&!p.deleted)&&!s.cancelled&&!s.deleted&&s.start<=end&&s.end>=start&&s.members.some(id=>d.members.includes(id)));
    if(overlaps.length)err('Trùng lịch với '+overlaps.map(s=>db.projects.find(p=>p.id===s.project_id)?.name||'công trình khác').join(', ')+'. Điều chỉnh ngày hoặc đổi người.');
    add('schedule',{title:str(d,'title'),start,end,members:[...new Set(d.members)],note:str(d,'note',false),cancelled:false});
  } else if(action==='cancel-schedule'){
    if(!manager)err('Chỉ quản lý được hủy lịch.');const r=get('schedule');r.cancelled=true;r.version++;
  } else if(action==='journal'){
    if(user.role==='accountant')err('Kế toán không ghi nhật ký thi công.');
    const at=date(d,'date');if(at>today())err('Nhật ký không được ở tương lai.');
    if(!Number.isInteger(d.people))err('Số người phải là số nguyên.');
    const task_id=str(d,'task_id',false);if(task_id&&!db.tasks.some(t=>t.id===task_id&&t.project_id===pid&&!t.deleted))err('Công việc không thuộc công trình.');
    add('journal',{date:at,summary:str(d,'summary'),blocker:str(d,'blocker',false),next:str(d,'next',false),people:num(d,'people'),task_id,document_id:document(db,str(d,'document_id',false),pid)});
  } else if(action==='purchase'){
    if(user.role==='accountant')err('Quản lý hoặc đội thi công lập yêu cầu vật tư.');
    const m=material(db,d.material_id,pid);
    add('purchases',{material_id:m.id,quantity:num(d,'quantity'),needed:date(d,'needed'),reason:str(d,'reason'),supplier:str(d,'supplier',false),status:'Chờ duyệt',received:0});
  } else if(action==='purchase-status'){
    if(!manager)err('Chỉ quản lý duyệt / đặt mua / từ chối.');const p=get('purchases');
    const transitions={'Chờ duyệt':['Đã duyệt','Từ chối'],'Đã duyệt':['Đã đặt mua','Từ chối'],'Đã đặt mua':[]};
    if(!transitions[p.status]?.includes(d.status))err('Trạng thái yêu cầu đã thay đổi.');
    if(d.status==='Đã đặt mua'&&!str(d,'supplier',false))err('Nhập nhà cung cấp trước khi đặt mua.');
    if(d.status==='Từ chối'&&!str(d,'note',false))err('Nhập lý do từ chối.');
    p.status=d.status;p.supplier=str(d,'supplier',false)||p.supplier;p.note=str(d,'note',false);p.version++;
  } else if(action==='movement'){
    if(user.role==='accountant')err('Kế toán không cập nhật vật tư hiện trường.');
    const m=material(db,d.material_id,pid),quantity=num(d,'quantity'),type=str(d,'type'),at=date(d,'date');
    if(at>today())err('Ngày giao dịch vật tư không được ở tương lai.');
    if(!['Nhận hàng','Sử dụng','Hoàn trả'].includes(type))err('Loại giao dịch vật tư không hợp lệ.');
    const available=m.received-m.used;
    if(type!=='Nhận hàng'&&quantity>available)err('Chỉ còn '+available+' '+m.unit+' chưa sử dụng.');
    const purchase_id=str(d,'purchase_id',false);
    if(purchase_id){const p=db.purchases.find(p=>p.id===purchase_id&&p.material_id===m.id&&p.project_id===pid);if(type!=='Nhận hàng'||!p||!['Đã đặt mua','Nhận một phần'].includes(p.status))err('Yêu cầu chưa đặt mua hoặc đã nhận đủ.');if(quantity>p.quantity-p.received)err('Số nhận vượt số còn chờ giao.');p.received+=quantity;p.status=p.received===p.quantity?'Đã nhận đủ':'Nhận một phần';p.version++;}
    if(type==='Nhận hàng')m.received+=quantity;
    if(type==='Sử dụng')m.used+=quantity;
    if(type==='Hoàn trả')m.received-=quantity;
    m.version++;m.updated=now();
    add('movements',{material_id:m.id,type,quantity,date:at,reference:str(d,'reference',false),note:str(d,'note',false),purchase_id,document_id:document(db,str(d,'document_id',false),pid)});
  } else if(action==='receipt'){
    if(!finance)err('Thi công không ghi thu / chi.');
    const p=db.payments.find(p=>p.id===d.payment_id&&p.project_id===pid&&!p.deleted);if(!p)err('Khoản phải thu / chi không tồn tại.');
    const amount=num(d,'amount'),at=date(d,'date');if(!Number.isInteger(amount))err('Số tiền VND phải là số nguyên.');if(at>today())err('Ngày thực thu / chi không được ở tương lai.');
    if(amount>p.amount-total(db,p))err('Số tiền vượt số còn lại của khoản này.');
    add('receipts',{payment_id:p.id,amount,date:at,method:str(d,'method'),reference:str(d,'reference',false),document_id:document(db,str(d,'document_id',false),pid),reconciled:false,opening:false});
    p.status=total(db,p)===p.amount?'Đã thanh toán':'Chưa thanh toán';p.paid_date=p.status==='Đã thanh toán'?at:'';p.version++;p.updated=now();
  } else if(action==='reconcile'){
    if(!finance)err('Thi công không đối soát tiền.');const r=get('receipts');
    r.document_id=document(db,str(d,'document_id',false),pid)||r.document_id;r.reference=str(d,'reference',false)||r.reference;
    if(!r.document_id)err('Tải chứng từ và gắn tệp trước khi xác nhận đối soát.');
    r.reconciled=true;r.version++;
  } else if(action==='void-receipt'){
    if(!manager)err('Chỉ quản lý được hủy ghi nhận tiền.');const r=get('receipts');if(r.voided)err('Phiếu đã hủy.');r.voided=true;r.void_reason=str(d,'note');r.version++;
    const p=db.payments.find(p=>p.id===r.payment_id);p.status=total(db,p)>=p.amount?'Đã thanh toán':'Chưa thanh toán';p.paid_date=p.status==='Đã thanh toán'?p.paid_date:'';p.version++;
  } else if(action==='check'){
    if(!manager)err('Quản lý xác nhận hồ sơ bàn giao.');const name=str(d,'name');if(!['Biên bản nghiệm thu','Bản vẽ hoàn công','Hướng dẫn vận hành','Danh sách serial & bảo hành','Lịch bảo trì'].includes(name))err('Mục bàn giao không hợp lệ.');
    const doc=document(db,str(d,'document_id'),pid),note=str(d,'note',false);
    const existing=db.checks.find(c=>c.project_id===pid&&c.name===name);if(existing){kind='checks';result=existing;existing.document_id=doc;existing.note=note;existing.version++;}else add('checks',{name,document_id:doc,note});
  } else err('Thao tác không được hỗ trợ.');
  result.updated=now();engine.audit(db,user,action,result,kind);return {id:result.id};
}
function view(db,user,allowed){migrate(db);const out={};kinds.forEach(k=>{out[k]=db[k].filter(r=>allowed.has(r.project_id)&&!r.deleted&&!(user.role==='field'&&k==='receipts')).map(r=>structuredClone(r));});return out;}
function validateBackup(db){migrate(db);for(const k of kinds){if(!Array.isArray(db[k])||db[k].length>20000)err('Danh sách vận hành trong sao lưu không hợp lệ.');const ids=new Set();for(const r of db[k]){if(typeof r.id!=='string'||ids.has(r.id)||!db.projects.some(p=>p.id===r.project_id))err('Mã vận hành / công trình không hợp lệ.');ids.add(r.id);if(r.document_id&&!db.documents.some(d=>d.id===r.document_id))err('Thiếu chứng từ được liên kết.');}}
  for(const r of db.receipts){if(!db.payments.some(p=>p.id===r.payment_id&&p.project_id===r.project_id)||!Number.isInteger(r.amount)||r.amount<=0)err('Phiếu tiền trong sao lưu không hợp lệ.');}
  for(const r of db.movements){if(!db.materials.some(m=>m.id===r.material_id&&m.project_id===r.project_id)||!Number.isFinite(r.quantity)||r.quantity<=0)err('Phiếu vật tư trong sao lưu không hợp lệ.');}
}
const exported={kinds,migrate,apply,view,total,validateBackup};if(typeof module!=='undefined')module.exports=exported;root.SolarWorkflow=exported;
})(typeof window!=='undefined'?window:globalThis);

(function(root){
'use strict';
const templates={
 'Lắp đặt':[
 ['Khảo sát','Khảo sát hiện trạng mái, nhu cầu và hồ sơ khách hàng'],['Thiết kế','Chốt cấu hình hệ thống và bản vẽ được duyệt'],['Mua vật tư','Chốt danh sách thiết bị, vật tư và lịch giao'],['Thi công','Bố trí đội và xác nhận điều kiện thi công'],['Thi công','Lắp đặt theo hồ sơ kỹ thuật đã duyệt'],['Nghiệm thu','Ghi kết quả kiểm tra, nghiệm thu và xử lý tồn tại'],['Nghiệm thu','Bàn giao hồ sơ, tài khoản giám sát và hướng dẫn'],['Bảo hành','Lập lịch kiểm tra và bảo trì sau bàn giao']],
 'Vệ sinh pin':[
 ['Khảo sát','Xác nhận khu vực, số tấm và tình trạng trước vệ sinh'],['Thiết kế','Xác nhận phương án công tác và điều kiện tiếp cận'],['Mua vật tư','Chuẩn bị dụng cụ, vật tư và đội thực hiện'],['Thi công','Xác nhận điều kiện làm việc theo quy trình công ty'],['Thi công','Vệ sinh theo phương án đã duyệt và ghi ảnh'],['Nghiệm thu','Kiểm tra sau vệ sinh và ghi các bất thường'],['Nghiệm thu','Bàn giao biên bản, ảnh trước/sau và thu phí'],['Bảo hành','Chốt ngày vệ sinh định kỳ tiếp theo']],
 'Bảo trì / sửa chữa':[
 ['Khảo sát','Tiếp nhận sự cố, thông tin thiết bị và lịch sử vận hành'],['Khảo sát','Khảo sát, ghi nhận lỗi và tình trạng thiết bị'],['Thiết kế','Duyệt phương án xử lý và chi phí'],['Mua vật tư','Chuẩn bị linh kiện, kiểm điều kiện bảo hành'],['Thi công','Thực hiện công tác theo phương án đã duyệt'],['Nghiệm thu','Ghi kết quả kiểm tra sau xử lý và tồn tại'],['Nghiệm thu','Bàn giao biên bản và hồ sơ linh kiện thay thế'],['Bảo hành','Hẹn kiểm tra sau xử lý và cập nhật lịch bảo trì']]
};
function apply(engine,db,action,d){
 const fail=m=>{throw new Error(m);},user=engine.user(db);if(user.role!=='manager')fail('Quản lý mới được thiết lập quy trình.');
 const p=engine.project(db,user,d.project_id);if(!templates[d.project_type||p.project_type||'Lắp đặt'])fail('Loại công trình không hợp lệ.');
 if(action==='profile'){
   if(d.version!==p.version)fail('Hồ sơ vừa thay đổi. Làm mới trước khi sửa.');
   const text=k=>{const v=d[k]||'';if(typeof v!=='string'||v.length>1000)fail('Thông tin hồ sơ không hợp lệ.');return v.trim();};
   p.project_type=d.project_type;p.system_type=text('system_type');p.equipment_note=text('equipment_note');p.service_date=text('service_date');p.service_interval=Number(d.service_interval)||0;
   if(p.service_date&&(!/^\d{4}-\d{2}-\d{2}$/.test(p.service_date)||!Number.isFinite(Date.parse(p.service_date))||new Date(p.service_date).toISOString().slice(0,10)!==p.service_date))fail('Ngày dịch vụ không hợp lệ.');
   if(!Number.isInteger(p.service_interval)||p.service_interval<0||p.service_interval>120)fail('Chu kỳ phải từ 0 đến 120 tháng.');
   p.version++;p.updated=new Date().toISOString();engine.audit(db,user,'Thiết lập dịch vụ',p,'projects');return {id:p.id};
 }
 if(action==='template'){
   const type=p.project_type||'Lắp đặt';const entries=templates[type];const start=p.start_date||p.due_date,end=p.due_date;
   if(d.assignee&&!p.members.includes(d.assignee))fail('Người phụ trách không thuộc đội công trình.');
   const first=Date.parse(start+'T12:00:00Z'),last=Date.parse(end+'T12:00:00Z');let added=0;
   entries.forEach(([phase,title],i)=>{if(db.tasks.some(t=>t.project_id===p.id&&!t.deleted&&t.title===title))return;
     const task={id:root.crypto.randomUUID(),project_id:p.id,title,phase,assignee:d.assignee||'',due_date:new Date(first+(last-first)*i/(entries.length-1)).toISOString().slice(0,10),status:'Chưa làm',note:'Quy trình '+type+'. Điều chỉnh người và hạn theo hồ sơ thực tế.',version:1,updated:new Date().toISOString()};db.tasks.push(task);added++;engine.audit(db,user,'Thêm quy trình '+type,task,'tasks');});
   return {id:p.id,added};
 }
 if(action==='next-visit'){
   if(!p.service_date||!p.service_interval)fail('Nhập ngày dịch vụ và chu kỳ trước khi lập kỳ tiếp.');
   const from=new Date(p.service_date+'T12:00:00Z'),wanted=from.getUTCDate();from.setUTCDate(1);from.setUTCMonth(from.getUTCMonth()+p.service_interval);
   const last=new Date(Date.UTC(from.getUTCFullYear(),from.getUTCMonth()+1,0)).getUTCDate();from.setUTCDate(Math.min(wanted,last));const at=from.toISOString().slice(0,10);
   const existing=db.projects.find(x=>!x.deleted&&x.recurring_parent===p.id&&x.service_date===at);if(existing)return {id:existing.id,existing:true};
   const next={...p,id:root.crypto.randomUUID(),name:p.name+' · kỳ '+at,start_date:at,due_date:at,service_date:at,status:'Chuẩn bị',contract_value:0,version:1,recurring_parent:p.id,updated:new Date().toISOString()};delete next.deleted;delete next.incidents;delete next.readiness;db.projects.unshift(next);engine.audit(db,user,'Lập kỳ dịch vụ',next,'projects');return {id:next.id};
 }
 fail('Thao tác không hợp lệ.');
}
root.SolarProjectWorkflow={templates,apply};if(typeof module!=='undefined')module.exports=root.SolarProjectWorkflow;
})(typeof window!=='undefined'?window:globalThis);

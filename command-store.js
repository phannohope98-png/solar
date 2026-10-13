(function(root){
'use strict';
function snapshot(s,at){
 const active=new Set(s.projects.filter(p=>p.status!=='Hoàn thành').map(p=>p.id)),pending=new Set((s.workReports||[]).filter(r=>r.status==='Chờ xác nhận').map(r=>r.task_id));
 const queue=root.FocusOps.priorities(s,at).filter(x=>active.has(x.project_id)&&!(x.kind==='task'&&pending.has(x.id))).map(x=>({...x,group:'attention'}));
 for(const r of s.workReports||[])if(r.status==='Chờ xác nhận')queue.push({key:'report-'+r.id,kind:'report',id:r.id,project_id:r.project_id,title:r.title,reason:r.extra?'Duyệt kết quả làm thêm':'Xác nhận kết quả',owner:r.owner,rank:2,group:'approval'});
 for(const r of s.stockCounts||[])if(r.status==='Chờ đối chiếu')queue.push({key:'count-'+r.id,kind:'count',id:r.id,project_id:r.project_id,title:'Kiểm kê lệch '+(r.actual-r.expected),reason:'Đối chiếu vật tư',owner:r.actor_id,rank:3,group:'approval'});
 for(const r of s.purchases||[])if(r.status==='Chờ duyệt')queue.push({key:'purchase-'+r.id,kind:'purchase',id:r.id,project_id:r.project_id,title:'Yêu cầu mua vật tư',reason:'Chờ duyệt mua',owner:r.actor_id,rank:3,group:'approval'});
 for(const r of s.shipments||[]){if(!['Chờ xuất','Đang vận chuyển','Nhận một phần'].includes(r.status))continue;queue.push({key:'shipment-'+r.id,kind:'shipment',id:r.id,project_id:r.project_id,title:(s.materials.find(m=>m.id===r.material_id)?.name||'Vật tư')+' · '+r.reference+' · còn giao '+(r.quantity-r.delivered),reason:r.status==='Chờ xuất'?'Chuyến chờ xuất':r.due_date<at?'Chuyến giao quá hạn':'Chuyến đang giao',owner:r.receiver,due_date:r.due_date,rank:r.due_date<at?1:4,group:'delivery'});}
 queue.sort((a,b)=>a.rank-b.rank||(a.due_date||'9999').localeCompare(b.due_date||'9999'));
 const team=s.users.filter(u=>u.role!=='accountant').map(u=>({id:u.id,name:u.name,working:s.tasks.filter(t=>t.assignee===u.id&&active.has(t.project_id)&&t.status==='Đang làm'&&!pending.has(t.id)),waiting:s.tasks.filter(t=>t.assignee===u.id&&active.has(t.project_id)&&pending.has(t.id)),blocked:s.tasks.filter(t=>t.assignee===u.id&&active.has(t.project_id)&&t.status==='Bị vướng'),next:s.tasks.filter(t=>t.assignee===u.id&&active.has(t.project_id)&&t.status==='Chưa làm').sort((a,b)=>a.due_date.localeCompare(b.due_date))}));
 return {queue,team,active:s.projects.filter(p=>active.has(p.id)),approvals:queue.filter(x=>x.group==='approval'),urgent:queue.filter(x=>x.rank<=2&&x.group!=='approval'),inTransit:(s.shipments||[]).filter(r=>['Đang vận chuyển','Nhận một phần'].includes(r.status)),pending};
}
root.CommandOps={snapshot};if(typeof module!=='undefined')module.exports=root.CommandOps;
})(typeof window!=='undefined'?window:globalThis);

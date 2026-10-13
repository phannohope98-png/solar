(function(root){
'use strict';
function review(state,p,at){
 const tasks=state.tasks.filter(t=>t.project_id===p.id),open=tasks.filter(t=>t.status!=='Hoàn thành');
 const gates=(root.FocusOps?.gates||{})[p.project_type||'Lắp đặt']||[];
 const missingGates=gates.filter(name=>!(p.readiness||[]).some(r=>r.name===name&&['Đã xác nhận','Không áp dụng'].includes(r.status)));
 const issues=(p.incidents||[]).filter(i=>i.status!=='Đã xử lý');
 return {total:tasks.length,done:tasks.length-open.length,unassigned:open.filter(t=>!t.assignee).length,late:open.filter(t=>t.due_date&&t.due_date<at).length,blocked:open.filter(t=>t.status==='Bị vướng').length,issues:issues.length,materials:state.materials.filter(m=>m.project_id===p.id&&m.required>m.received).length,missingGates,documents:state.documents.filter(d=>d.project_id===p.id&&!d.deleted).length};
}
root.WorkbenchOps={review};if(typeof module!=='undefined')module.exports=root.WorkbenchOps;
})(typeof window!=='undefined'?window:globalThis);

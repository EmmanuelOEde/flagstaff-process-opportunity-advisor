const $=s=>document.querySelector(s);
const state={answers:{},queue:[],step:0,flags:new Set()};
const base=[
 ["process","What process would you like IT to review for an automation or AI opportunity?"],
 ["trigger","What starts this process, and what are the main steps from start to finish?"],
 ["systems","What systems, files, forms, email, or other tools are used along the way?"],
 ["pain","Which parts are most repetitive, slow, frustrating, or prone to mistakes?"],
 ["decisions","Where does a person need to make a judgment call, apply a rule, approve something, or handle an exception?"],
 ["volume","About how often does this happen, and roughly how much staff time does one occurrence take?"]
];
function clean(s){return s.trim().replace(/\s+/g," ")}
function has(text,words){text=text.toLowerCase();return words.some(w=>text.includes(w))}
function analyze(key,text){
 const t=text.toLowerCase();
 if(has(t,["copy","paste","re-enter","reenter","manual entry","spreadsheet","excel","csv"])) state.flags.add("data");
 if(has(t,["email","attachment","inbox"])) state.flags.add("email");
 if(has(t,["approval","approve","sign off","authorization"])) state.flags.add("approval");
 if(has(t,["judgment","review","interpret","summar","classif","read document","free text","narrative"])) state.flags.add("ai");
 if(has(t,["exception","sometimes","depends","special case"])) state.flags.add("exceptions");
 if(has(t,["error","mistake","duplicate","missed","wrong"])) state.flags.add("quality");
 if(has(t,["sensitive","confidential","pii","personal information","criminal","health","medical","ssn"])) state.flags.add("sensitive");
 if(has(t,["paper","print","scan","handwritten"])) state.flags.add("paper");
}
function followups(){
 let q=[];
 if(state.flags.has("data")) q.push(["fu_data","You mentioned manual data movement. Is the information usually entered in a consistent format, or does it vary from case to case?"]);
 if(state.flags.has("approval")) q.push(["fu_approval","For the approval step, are the approval rules consistent, or does the approver usually need to evaluate the situation?"]);
 if(state.flags.has("exceptions")) q.push(["fu_exception","You mentioned exceptions. What is one common exception that changes the normal path?"]);
 if(state.flags.has("ai")) q.push(["fu_ai","For the judgment or interpretation work, what information does the employee review before making the decision?"]);
 if(state.flags.has("sensitive")) q.push(["fu_sensitive","Without sharing any sensitive details, does this process require access to restricted or confidential information?"]);
 return q.slice(0,2);
}
function addMsg(text,type){let d=document.createElement("div");d.className="msg "+type;d.textContent=text;$("#chat").appendChild(d);d.scrollIntoView({behavior:"smooth",block:"nearest"})}
function ask(item){state.current=item; $("#progress").textContent=`Discovery question ${Math.min(state.step+1,8)}`; addMsg(item[1],"advisor"); $("#answer").value=""; $("#answer").focus()}
$("#start").onclick=()=>{$("#welcome").classList.add("hidden");$("#session").classList.remove("hidden");state.queue=[...base];ask(state.queue.shift())};
$("#answerForm").onsubmit=e=>{
 e.preventDefault();let v=clean($("#answer").value);if(!v)return;
 addMsg(v,"user");state.answers[state.current[0]]=v;analyze(state.current[0],v);state.step++;
 if(state.queue.length){ask(state.queue.shift());return}
 if(!state.didFollow){state.didFollow=true;state.queue=followups();if(state.queue.length){ask(state.queue.shift());return}}
 if(!state.finalAsked){state.finalAsked=true;ask(["final","Before I prepare the assessment, is there anything important about this process that I haven't asked about? If not, just say “no.”"]);return}
 state.answers.final=v;buildReport();
};
function recommendation(){
 const f=state.flags, reasons=[];
 let direction="Process improvement / further discovery first";
 if((f.has("data")||f.has("email")||f.has("approval")) && !f.has("ai")) direction="Conventional automation worth investigating";
 if(f.has("ai") && (f.has("data")||f.has("email")||f.has("approval"))) direction="Combined automation and AI worth investigating";
 else if(f.has("ai")) direction="AI-assisted opportunity worth investigating";
 if(f.has("exceptions") && !(f.has("data")||f.has("email")||f.has("ai"))) direction="Process improvement / further discovery first";
 if(f.has("data")) reasons.push("repetitive or manual data movement was described");
 if(f.has("email")) reasons.push("email is part of the workflow");
 if(f.has("approval")) reasons.push("an approval or authorization step exists");
 if(f.has("ai")) reasons.push("the process includes interpretation, review, or judgment");
 if(f.has("exceptions")) reasons.push("exceptions may limit straight-through automation");
 if(f.has("quality")) reasons.push("errors or quality issues were identified");
 return {direction,reasons};
}
function esc(s=""){return s.replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function section(title,body){return `<div class="report-section"><h3>${title}</h3>${body}</div>`}
function buildReport(){
 $("#session").classList.add("hidden");$("#reportCard").classList.remove("hidden");
 const a=state.answers,r=recommendation(), risks=[];
 if(state.flags.has("sensitive")) risks.push("Restricted/confidential data may require security and access review.");
 if(state.flags.has("exceptions")) risks.push("Exceptions should be mapped before automating the normal path.");
 if(state.flags.has("paper")) risks.push("Paper or scanned inputs may reduce consistency and require separate handling.");
 risks.push("Integration/API availability, security, licensing, and technical feasibility were not established in this discovery session.");
 const ai = state.flags.has("ai") ? "AI may be useful for assisting with interpretation, classification, summarization, or other non-deterministic work described in the session. A human-review boundary should be defined before implementation." : "No clear need for AI was established from this session. Deterministic workflow automation or process improvement should be evaluated first.";
 let html="";
 html+=section("Process Overview",`<p>${esc(a.process||"Not established.")}</p>`);
 html+=section("Current Workflow",`<p>${esc(a.trigger||"Not established.")}</p>`);
 html+=section("Systems and Information",`<p>${esc(a.systems||"Not established.")}</p>`);
 html+=section("Pain Points",`<p>${esc(a.pain||"Not established.")}</p>`);
 html+=section("Frequency and Effort",`<p>${esc(a.volume||"Not established.")}</p>`);
 html+=section("Decisions and Exceptions",`<p>${esc(a.decisions||"Not established.")}</p>${a.fu_exception?`<p><strong>Example exception:</strong> ${esc(a.fu_exception)}</p>`:""}`);
 html+=section("Recommended Direction",`<p><strong>${r.direction}</strong></p><p>This is a discovery recommendation, not a feasibility decision.${r.reasons.length?" It is based on the session indicating "+esc(r.reasons.join("; "))+".":""}</p>`);
 html+=section("AI Role",`<p>${ai}</p>`);
 html+=section("Risks and Open Questions",`<ul>${risks.map(x=>`<li>${esc(x)}</li>`).join("")}<li>Validate actual volumes, staff effort, exception rates, and business rules with the process owner.</li></ul>`);
 html+=section("Suggested Next Step",`<p>IT should validate the workflow with the process owner, confirm systems and integration options, quantify the current effort, and decide whether a small proof of concept is justified. No ROI, API availability, or implementation feasibility is assumed by this assessment.</p>`);
 if(a.final && !/^no[.!]?$/i.test(a.final)) html+=section("Additional Context",`<p>${esc(a.final)}</p>`);
 $("#report").innerHTML=html;
 window.reportText=document.querySelector("#reportCard").innerText;
 window.scrollTo({top:0,behavior:"smooth"});
}
$("#download").onclick=()=>{
 const blob=new Blob([window.reportText],{type:"text/plain"}),u=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=u;a.download="process-opportunity-assessment.txt";a.click();URL.revokeObjectURL(u)
};
$("#restart").onclick=()=>location.reload();

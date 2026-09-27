const $=s=>document.querySelector(s);let apiKey="",history=[],answers=0,finalA=null;const MODEL="gemini-2.5-flash";const SYSTEM=`You are Process Opportunity Advisor, an AI discovery agent for an IT Applications team.
GOAL: Interview one nontechnical employee about ONE business process. Adapt every next question to the full conversation. Stop when you have enough evidence for an actionable IT handoff.
RULES:
- Ask exactly ONE concise question at a time. Do not ask an unrestricted "tell me everything" question.
- Do not repeat known information. Politely redirect storytelling to the missing fact.
- Typical session: 7-12 employee answers; never exceed 14.
- Gather only what matters: outcome; trigger/end; normal path; systems/files/forms; handoffs/data movement; biggest time/error pain; frequency/effort; repeatability; rules vs judgment; exceptions; unstructured content; sensitivity/authorization.
- Skip dimensions that clearly do not apply.
- Never request actual credentials, SSNs, medical records, or sensitive records.
- Never invent ROI, savings, APIs, integration availability, security approval, or feasibility.
- Do not recommend AI merely because this is an AI exercise. Preserve human authorization for consequential actions.
ALLOWED FINAL DIRECTIONS:
1. Conventional automation investigation
2. Targeted AI-assisted investigation
3. Combined automation + targeted AI investigation
4. Process improvement / further discovery first
5. No automation or AI recommended at this time
FINISH when evidence is sufficient to explain direction, candidate step, AI role/non-role, human boundary, risks/unknowns and next IT step.
Return ONLY valid JSON.
If another question is needed:
{"status":"question","question":"one concise adaptive question","reason":"why this missing fact matters"}
If finished:
{"status":"complete","assessment":{"process_name":"...","business_outcome":"...","trigger_and_completion":"...","normal_path":["..."],"systems_and_handoffs":["..."],"primary_pain_point":"...","frequency_and_effort":"...","repeatability_and_exceptions":"...","human_decisions":["..."],"unstructured_content_ai_fit":"...","sensitivity_and_authorization":"...","recommended_direction":"one allowed direction exactly","rationale":"...","candidate_steps":["..."],"ai_role":"specific role or explicitly no justified AI role","human_control_boundary":"...","risks_and_unknowns":["..."],"next_it_step":"..."}}`;
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function msg(t,k){let d=document.createElement("div");d.className="msg "+k;d.innerHTML=`<span class="msglabel">${k==="agent"?"AI ADVISOR":"EMPLOYEE"}</span>${esc(t)}`;$("#chat").appendChild(d);d.scrollIntoView({behavior:"smooth",block:"nearest"})}
function busy(x){$("#send").disabled=x;$("#answer").disabled=x;$("#thinking").classList.toggle("hidden",!x)}
async function callAI(text){history.push({role:"user",parts:[{text}]});let body={system_instruction:{parts:[{text:SYSTEM}]},contents:history,generationConfig:{temperature:.25,responseMimeType:"application/json"}};let r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},body:JSON.stringify(body)});if(!r.ok)throw new Error(`Gemini request failed (${r.status}). ${String(await r.text()).slice(0,180)}`);let d=await r.json(),t=d?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";if(!t)throw new Error("Gemini returned no usable response.");history.push({role:"model",parts:[{text:t}]});return JSON.parse(t)}
function handle(r){if(r.status==="question"&&r.question){msg(r.question,"agent");$("#answer").focus()}else if(r.status==="complete"&&r.assessment){finalA=r.assessment;show()}else throw new Error("Unexpected AI response format.")}
$("#start").onclick=async()=>{apiKey=$("#key").value.trim();if(!apiKey){$("#status").textContent="Enter your Gemini API key first.";return}$("#start").disabled=true;$("#status").textContent="Testing connection…";try{let r=await callAI("Begin the discovery session. Ask the best first focused question.");$("#connect").classList.add("hidden");$("#session").classList.remove("hidden");handle(r)}catch(e){$("#status").textContent=e.message;$("#start").disabled=false}};
$("#answer").oninput=()=>$("#counter").textContent=`${$("#answer").value.length} / 1400`;
$("#form").onsubmit=async e=>{e.preventDefault();let v=$("#answer").value.trim();if(!v)return;msg(v,"user");answers++;$("#turns").textContent=`${answers} answer${answers===1?"":"s"}`;$("#answer").value="";$("#counter").textContent="0 / 1400";busy(true);try{handle(await callAI(v))}catch(e){msg("Connection problem: "+e.message+" Please retry after checking the connection.","agent")}finally{busy(false)}};
const list=a=>`<ul>${(a||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`,sec=(t,b)=>`<div class="section"><h3>${t}</h3>${b}</div>`;
function show(){let a=finalA;$("#session").classList.add("hidden");$("#reportCard").classList.remove("hidden");$("#direction").textContent=a.recommended_direction;$("#summary").innerHTML=`<b>${esc(a.recommended_direction)}</b><p>${esc(a.rationale)}</p>`;$("#report").innerHTML=sec("Process and outcome",`<p><b>${esc(a.process_name)}</b></p><p>${esc(a.business_outcome)}</p>`)+sec("Trigger and completion",`<p>${esc(a.trigger_and_completion)}</p>`)+sec("Normal path",list(a.normal_path))+sec("Systems and handoffs",list(a.systems_and_handoffs))+sec("Primary pain point",`<p>${esc(a.primary_pain_point)}</p>`)+sec("Frequency and effort",`<p>${esc(a.frequency_and_effort)}</p>`)+sec("Repeatability and exceptions",`<p>${esc(a.repeatability_and_exceptions)}</p>`)+sec("Human decisions",list(a.human_decisions))+sec("AI fit",`<p>${esc(a.unstructured_content_ai_fit)}</p><p><b>AI role:</b> ${esc(a.ai_role)}</p>`)+sec("Sensitivity and authorization",`<p>${esc(a.sensitivity_and_authorization)}</p>`)+sec("Candidate steps",list(a.candidate_steps))+sec("Human-control boundary",`<p>${esc(a.human_control_boundary)}</p>`)+sec("Risks and unknowns",list(a.risks_and_unknowns))+sec("Suggested IT next step",`<p>${esc(a.next_it_step)}</p>`)}
function report(a){let L=x=>(x||[]).map(v=>"- "+v).join("\n");return `PROCESS OPPORTUNITY ASSESSMENT
Generated from an actual adaptive AI discovery session.

RECOMMENDED DIRECTION
${a.recommended_direction}

RATIONALE
${a.rationale}

PROCESS / OUTCOME
${a.process_name}
${a.business_outcome}

TRIGGER / COMPLETION
${a.trigger_and_completion}

NORMAL PATH
${L(a.normal_path)}

SYSTEMS / HANDOFFS
${L(a.systems_and_handoffs)}

PRIMARY PAIN POINT
${a.primary_pain_point}

FREQUENCY / EFFORT
${a.frequency_and_effort}

REPEATABILITY / EXCEPTIONS
${a.repeatability_and_exceptions}

HUMAN DECISIONS
${L(a.human_decisions)}

AI FIT / ROLE
${a.unstructured_content_ai_fit}
${a.ai_role}

SENSITIVITY / AUTHORIZATION
${a.sensitivity_and_authorization}

CANDIDATE STEPS
${L(a.candidate_steps)}

HUMAN-CONTROL BOUNDARY
${a.human_control_boundary}

RISKS / UNKNOWNS
${L(a.risks_and_unknowns)}

NEXT IT STEP
${a.next_it_step}`};$("#download").onclick=()=>{let b=new Blob([report(finalA)],{type:"text/plain"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download="process-opportunity-assessment.txt";a.click();URL.revokeObjectURL(u)};$("#restart").onclick=()=>location.reload();

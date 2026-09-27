const $=s=>document.querySelector(s);let apiKey="",history=[],answers=0,finalA=null,pendingAnswer=null;const MODELS=["gemini-3.8-flash","gemini-3.5-flash-lite"];const SYSTEM=`You are Process Opportunity Advisor, an AI discovery agent for an IT Applications team.
GOAL: Interview one nontechnical employee about ONE business process. Adapt every next question to the full conversation. Stop when you have enough evidence for an actionable IT handoff.

RULES:
- Ask exactly ONE concise question at a time. Do not ask an unrestricted "tell me everything" question.
- Do not repeat known information. Politely redirect storytelling to the missing fact.
- Typical session: 7-12 employee answers; never exceed 14.
- Gather only what matters: outcome; trigger/end; normal path; systems/files/forms; handoffs/data movement; biggest time/error pain; frequency/effort; repeatability; rules vs judgment; exceptions; unstructured content; sensitivity/authorization.
- Skip dimensions that clearly do not apply.
- Never request actual credentials, SSNs, medical records, or sensitive records.
- Never invent ROI, savings, APIs, integration availability, connectors, platform features, licenses, permissions, security approval, or technical feasibility.
- Do not recommend AI merely because this is an AI exercise. Preserve human authorization for consequential actions.

SOLUTION QUALITY:
- When the evidence supports improvement, produce a concrete proposed solution that IT can evaluate and act on.
- Describe the proposed solution primarily at the functional/process level: what should happen, what should be automated or improved, what information should move, what should trigger actions, what should be tracked, and where humans must make decisions or approvals.
- Do NOT default to "schedule a meeting," "consult IT," "conduct further discovery," or "perform a scoping session" as the solution or next step.
- Further discovery is appropriate only when a specific missing fact prevents a responsible recommendation. State exactly what is unknown and why it matters.
- Separate WHAT SHOULD BE BUILT OR CHANGED from WHAT MUST BE VALIDATED.
- Do NOT state or imply that an API, integration, connector, automation feature, license, permission, or system capability exists unless the employee established that fact during the session.
- If a desired function depends on an unknown technical capability, describe the function without inventing the implementation. Example: "Automatically create the downstream request if an approved integration method is available; otherwise create a standardized task for the responsible team."
- Candidate steps must describe useful functional capabilities or process changes, not invented implementation technologies.
- The proposed solution should be specific enough that an IT Applications team understands the intended future-state workflow without pretending that unverified implementation details are known.
- The next IT step must advance the proposed solution. Prefer a concrete action such as prototype a named workflow, standardize an intake, document a specific business rule, test a defined process change, or validate a named dependency.
- If technical validation is necessary, identify the exact capability that must be validated. Do not replace the entire recommendation with a generic request for more investigation.
- A recommendation of "No automation or AI recommended at this time" is valid when the evidence supports it. Do not manufacture a solution merely to produce one.

ALLOWED FINAL DIRECTIONS:
1. Conventional automation investigation
2. Targeted AI-assisted investigation
3. Combined automation + targeted AI investigation
4. Process improvement / further discovery first
5. No automation or AI recommended at this time

FINISH when evidence is sufficient to explain the direction, proposed solution or justified non-solution, candidate steps, AI role/non-role, human boundary, risks/unknowns, validation needs, and a concrete next IT step.

Return ONLY valid JSON.

If another question is needed:
{"status":"question","question":"one concise adaptive question","reason":"why this missing fact matters"}

If finished:
{"status":"complete","assessment":{"process_name":"...","business_outcome":"...","trigger_and_completion":"...","normal_path":["..."],"systems_and_handoffs":["..."],"primary_pain_point":"...","frequency_and_effort":"...","repeatability_and_exceptions":"...","human_decisions":["..."],"unstructured_content_ai_fit":"...","sensitivity_and_authorization":"...","recommended_direction":"one allowed direction exactly","rationale":"...","proposed_solution":"concrete functional future-state solution, or explain why no solution is justified","candidate_steps":["functional steps without assuming unverified technology exists"],"ai_role":"specific role or explicitly no justified AI role","human_control_boundary":"...","validation_needed":["specific facts or technical capabilities that remain unverified; empty array if none"],"risks_and_unknowns":["..."],"next_it_step":"specific action that advances the proposed solution rather than a generic meeting or investigation"}}`;

function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function msg(t,k){let d=document.createElement("div");d.className="msg "+k;d.innerHTML=`<span class="msglabel">${k==="agent"?"AI ADVISOR":"EMPLOYEE"}</span>${esc(t)}`;$("#chat").appendChild(d);d.scrollIntoView({behavior:"smooth",block:"nearest"})}
function busy(x){$("#send").disabled=x;$("#answer").disabled=x;$("#thinking").classList.toggle("hidden",!x)}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function retryStatus(text,attempt,max){
  let el=$("#retryStatus");
  if(!el){
    el=document.createElement("div");
    el.id="retryStatus";
    el.className="retry-status";
    let host=$("#thinking")||$("#session");
    host.parentNode.insertBefore(el,host.nextSibling)
  }
  el.textContent=text?`${text} (attempt ${attempt} of ${max})`:"";
  el.classList.toggle("hidden",!text)
}

async function callAI(text){
  const pending={role:"user",parts:[{text}]};
  const attemptsPerModel=3,delays=[0,1200,3000];
  let lastError=null;

  for(let mi=0;mi<MODELS.length;mi++){
    const model=MODELS[mi];

    for(let attempt=1;attempt<=attemptsPerModel;attempt++){
      if(attempt>1){
        retryStatus(`AI service is busy — retrying ${model}`,attempt,attemptsPerModel);
        await wait(delays[attempt-1]+Math.floor(Math.random()*500))
      } else if(mi>0){
        retryStatus(`Primary AI is busy — trying fallback ${model}`,1,attemptsPerModel)
      }

      const body={
        system_instruction:{parts:[{text:SYSTEM}]},
        contents:[...history,pending],
        generationConfig:{responseMimeType:"application/json"}
      };

      try{
        const r=await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method:"POST",
            headers:{
              "Content-Type":"application/json",
              "x-goog-api-key":apiKey
            },
            body:JSON.stringify(body)
          }
        );

        const raw=await r.text();

        if(!r.ok){
          const transient=r.status===408||r.status===429||r.status>=500;

          if(transient){
            lastError=new Error(`AI service temporarily unavailable (${r.status}).`);
            if(attempt<attemptsPerModel)continue;
            if(mi<MODELS.length-1)break
          }

          throw new Error(
            transient
              ?"The AI service is temporarily unavailable after automatic retries."
              :`Gemini request failed (${r.status}). ${raw.slice(0,180)}`
          )
        }

        let d;
        try{
          d=JSON.parse(raw)
        }catch{
          throw new Error("Gemini returned an unreadable response.")
        }

        const t=d?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";

        if(!t)throw new Error("Gemini returned no usable response.");

        let parsed;
        try{
          parsed=JSON.parse(t)
        }catch{
          throw new Error("Gemini returned invalid structured output. Please retry the AI request.")
        }

        if(!parsed||!(["question","complete"].includes(parsed.status))){
          throw new Error("Gemini returned an unexpected response format. Please retry the AI request.")
        }

        history.push(
          pending,
          {role:"model",parts:[{text:t}]}
        );

        retryStatus("",0,0);
        return parsed

      }catch(e){
        lastError=e;
        const transient=/temporarily unavailable/.test(e.message);

        if(transient&&attempt<attemptsPerModel)continue;
        if(transient&&mi<MODELS.length-1)break;

        retryStatus("",0,0);
        throw e
      }
    }
  }

  retryStatus("",0,0);
  throw lastError||new Error("The AI service is temporarily unavailable after automatic retries.")
}

function handle(r){
  if(r.status==="question"&&r.question){
    msg(r.question,"agent");
    $("#answer").focus()
  }else if(r.status==="complete"&&r.assessment){
    finalA=r.assessment;
    show()
  }else{
    throw new Error("Unexpected AI response format.")
  }
}

$("#start").onclick=async()=>{
  apiKey=$("#key").value.trim();

  if(!apiKey){
    $("#status").textContent="Enter your Gemini API key first.";
    return
  }

  $("#start").disabled=true;
  $("#status").textContent="Testing connection…";

  try{
    let r=await callAI("Begin the discovery session. Ask the best first focused question.");
    $("#connect").classList.add("hidden");
    $("#session").classList.remove("hidden");
    handle(r)
  }catch(e){
    $("#status").textContent=e.message;
    $("#start").disabled=false
  }
};

$("#answer").oninput=()=>$("#counter").textContent=`${$("#answer").value.length} / 1400`;

async function submitAnswer(v,isRetry=false){
  if(!isRetry){
    pendingAnswer=v;
    msg(v,"user");
    answers++;
    $("#turns").textContent=`${answers} answer${answers===1?"":"s"}`;
    $("#answer").value="";
    $("#counter").textContent="0 / 1400"
  }

  busy(true);

  try{
    handle(await callAI(v));
    pendingAnswer=null;
    $("#answer").placeholder="Type your answer here…"
  }catch(e){
    $("#answer").value=pendingAnswer||v;
    $("#counter").textContent=`${$("#answer").value.length} / 1400`;
    $("#answer").placeholder="Your answer is preserved — click Send answer to retry";
    msg(
      "The AI service is still unavailable after automatic retries and fallback. Your answer is preserved below; click Send answer to retry it. No duplicate was added to the AI conversation.",
      "agent"
    )
  }finally{
    busy(false)
  }
}

$("#form").onsubmit=async e=>{
  e.preventDefault();
  let v=$("#answer").value.trim();
  if(!v)return;

  if(pendingAnswer){
    await submitAnswer(pendingAnswer,true)
  }else{
    await submitAnswer(v,false)
  }
};

const list=a=>`<ul>${(a||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;
const sec=(t,b)=>`<div class="section"><h3>${t}</h3>${b}</div>`;

function show(){
  let a=finalA;

  $("#session").classList.add("hidden");
  $("#reportCard").classList.remove("hidden");

  $("#direction").innerHTML=
    `<span style="display:block;font-size:.72em;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">Assessment recommendation</span>${esc(a.recommended_direction)}`;

  $("#summary").innerHTML=
    `<b style="display:block;margin-bottom:8px;">Why this is recommended</b><p>${esc(a.rationale)}</p>`;

  $("#report").innerHTML=
    `<div class="section"><h3 style="text-transform:uppercase;letter-spacing:.06em;">Assessment details</h3></div>`+
    sec("Process and outcome",`<p><b>${esc(a.process_name)}</b></p><p>${esc(a.business_outcome)}</p>`)+
    sec("Trigger and completion",`<p>${esc(a.trigger_and_completion)}</p>`)+
    sec("Normal path",list(a.normal_path))+
    sec("Systems and handoffs",list(a.systems_and_handoffs))+
    sec("Primary pain point",`<p>${esc(a.primary_pain_point)}</p>`)+
    sec("Frequency and effort",`<p>${esc(a.frequency_and_effort)}</p>`)+
    sec("Repeatability and exceptions",`<p>${esc(a.repeatability_and_exceptions)}</p>`)+
    sec("Human decisions",list(a.human_decisions))+
    sec("AI fit",`<p>${esc(a.unstructured_content_ai_fit)}</p><p><b>AI role:</b> ${esc(a.ai_role)}</p>`)+
    sec("Sensitivity and authorization",`<p>${esc(a.sensitivity_and_authorization)}</p>`)+
    sec("Proposed solution",`<p>${esc(a.proposed_solution)}</p>`)+
    sec("Candidate steps",list(a.candidate_steps))+
    sec("Human-control boundary",`<p>${esc(a.human_control_boundary)}</p>`)+
    sec("Validation needed",list(a.validation_needed))+
    sec("Risks and unknowns",list(a.risks_and_unknowns))+
    sec("Suggested IT next step",`<p>${esc(a.next_it_step)}</p>`)
}

function report(a){
  let L=x=>(x||[]).map(v=>"- "+v).join("\n");

  return `PROCESS OPPORTUNITY ASSESSMENT
Generated from an actual adaptive AI discovery session.

ASSESSMENT RECOMMENDATION
${a.recommended_direction}

WHY THIS IS RECOMMENDED
${a.rationale}

ASSESSMENT DETAILS

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

PROPOSED SOLUTION
${a.proposed_solution}

CANDIDATE STEPS
${L(a.candidate_steps)}

HUMAN-CONTROL BOUNDARY
${a.human_control_boundary}

VALIDATION NEEDED
${L(a.validation_needed)}

RISKS / UNKNOWNS
${L(a.risks_and_unknowns)}

NEXT IT STEP
${a.next_it_step}`
}

$("#download").onclick=()=>{
  let b=new Blob([report(finalA)],{type:"text/plain"}),
      u=URL.createObjectURL(b),
      a=document.createElement("a");

  a.href=u;
  a.download="process-opportunity-assessment.txt";
  a.click();
  URL.revokeObjectURL(u)
};

$("#restart").onclick=()=>location.reload();

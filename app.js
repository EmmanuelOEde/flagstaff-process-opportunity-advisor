import { pipeline, TextStreamer } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

const MODEL = "onnx-community/Qwen2.5-0.5B-Instruct";
const SYSTEM = `You are Process Opportunity Advisor for nontechnical municipal employees.

Goal: understand one business process well enough to give IT an initial recommendation: conventional automation, AI assistance, combined automation and AI, process improvement/further discovery first, or no automation.

Conversation:
- Ask exactly ONE short question at a time.
- Never ask for a long narrative or repeat answered information.
- Collect only what matters: trigger, major steps, systems/files/tools, pain points, rules/judgment/exceptions, frequency and approximate effort.
- Ask a follow-up only when it materially changes the assessment.
- Never request sensitive information.
- Never invent facts, ROI, APIs, feasibility, or requirements.
- Do not force an automation or AI recommendation.
- Keep the session efficient.

When enough is known, output a report beginning exactly with "REPORT:" and use:
# Process Opportunity Assessment
## Process Overview
## Current Workflow
## Systems and Information
## Pain Points
## Frequency and Effort
## Decisions and Exceptions
## Recommended Direction
## AI Role
## Risks and Open Questions
## Suggested Next Step

Use only session evidence and label unknowns. Otherwise output only the next question.`;

let generator=null, history=[];
const $=id=>document.getElementById(id);
const status=$("status"), start=$("start"), welcome=$("welcome"), session=$("session"), chat=$("chat");
const form=$("form"), answer=$("answer"), finish=$("finish"), reportCard=$("reportCard"), report=$("report");

function add(role,text){
  history.push({role,content:text});
  const d=document.createElement("div"); d.className=`message ${role}`; d.textContent=text; chat.appendChild(d); d.scrollIntoView({behavior:"smooth"});
}
function visibleMessage(role,text){
  const d=document.createElement("div"); d.className=`message ${role}`; d.textContent=text; chat.appendChild(d); d.scrollIntoView({behavior:"smooth"});
}
async function loadModel(){
  $("loading").hidden=false; start.disabled=true; status.textContent="Loading local model…";
  generator=await pipeline("text-generation",MODEL,{
    dtype:"q4", device:"webgpu",
    progress_callback:x=>{
      if(x.status==="progress" && x.progress!=null){$("progress").value=x.progress;$("loadingText").textContent=`Loading local AI model… ${Math.round(x.progress)}%`;}
    }
  });
  status.textContent="Local AI ready"; $("loading").hidden=true; welcome.hidden=true; session.hidden=false;
  add("assistant","What process would you like to look at? Give me its name or a one-sentence description.");
}
async function generate(force=false){
  answer.disabled=true; finish.disabled=true;
  const working=document.createElement("div"); working.className="message assistant"; working.textContent="Thinking…"; chat.appendChild(working);
  const messages=[{role:"system",content:SYSTEM+(force?"\nPrepare the assessment now if enough information exists; otherwise ask only the single most important missing question.":"")},...history];
  try{
    const out=await generator(messages,{max_new_tokens:650,temperature:.25,do_sample:true,repetition_penalty:1.08});
    let text=out[0].generated_text.at(-1).content.trim();
    working.remove();
    if(text.startsWith("REPORT:")){
      text=text.replace(/^REPORT:\s*/,""); report.textContent=text; reportCard.hidden=false; form.hidden=true; reportCard.scrollIntoView({behavior:"smooth"});
    } else add("assistant",text);
  }catch(e){
    working.className="error"; working.textContent="The local model couldn't complete that response. Try again in a Chromium-based browser with WebGPU enabled.";
  }finally{answer.disabled=false;finish.disabled=false;answer.focus();}
}
start.onclick=async()=>{try{await loadModel()}catch(e){status.textContent="Model unavailable";$("loadingText").innerHTML="This browser could not start the local AI model. Try current Chrome or Edge with WebGPU available.";start.disabled=false;}};
form.onsubmit=async e=>{e.preventDefault();const t=answer.value.trim();if(!t)return;answer.value="";add("user",t);await generate(false);};
finish.onclick=()=>generate(true);
$("download").onclick=()=>{
  const blob=new Blob([report.textContent],{type:"text/markdown"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="process_opportunity_assessment.md";a.click();URL.revokeObjectURL(a.href);
};
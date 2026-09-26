import os
import json
from pathlib import Path
import streamlit as st
from openai import OpenAI

st.set_page_config(page_title="Process Opportunity Advisor", page_icon="🔎", layout="centered")
SYSTEM_PROMPT = Path("agent_prompt.md").read_text(encoding="utf-8")

def get_client():
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        try:
            key = st.secrets["OPENAI_API_KEY"]
        except Exception:
            key = None
    return OpenAI(api_key=key) if key else None

def ask_agent(messages, force_report=False):
    c = get_client()
    if not c:
        return {"type":"error","content":"No API key is configured. Add OPENAI_API_KEY to run a live session."}
    instructions = SYSTEM_PROMPT
    if force_report:
        instructions += "\nGenerate the assessment now if sufficient information exists; otherwise ask only the single most important missing question."
    r = c.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-5.6"),
        instructions=instructions,
        input=[{"role":m["role"], "content":m["content"]} for m in messages]
    )
    text = r.output_text.strip()
    try:
        return json.loads(text)
    except Exception:
        return {"type":"message","content":text}

for key, value in {"started":False, "messages":[], "report":None}.items():
    if key not in st.session_state:
        st.session_state[key] = value

st.title("Process Opportunity Advisor")
st.caption("Guided process discovery for improvement, automation, and AI opportunities.")

if not st.session_state.started:
    st.write("You know your work. You don't need to know automation or AI. I'll ask a few focused questions about one process and prepare an assessment for IT.")
    st.info("Please don't enter passwords, Social Security numbers, medical details, or other sensitive information.")
    if st.button("Start a process review", type="primary", use_container_width=True):
        st.session_state.started = True
        st.session_state.messages = [{"role":"assistant","content":"What process would you like to look at? Give me its name or a one-sentence description."}]
        st.rerun()
else:
    for m in st.session_state.messages:
        with st.chat_message(m["role"]):
            st.markdown(m["content"])

    if st.session_state.report:
        st.divider()
        st.subheader("IT Assessment")
        st.markdown(st.session_state.report)
        st.download_button("Download assessment", st.session_state.report, "process_opportunity_assessment.md", "text/markdown", use_container_width=True)
    else:
        user_text = st.chat_input("Type your answer…")
        if user_text:
            st.session_state.messages.append({"role":"user","content":user_text})
            result = ask_agent(st.session_state.messages)
            if result["type"] == "report":
                st.session_state.report = result["content"]
            else:
                st.session_state.messages.append({"role":"assistant","content":result["content"]})
            st.rerun()

        if len(st.session_state.messages) >= 5 and st.button("Prepare assessment now", use_container_width=True):
            result = ask_agent(st.session_state.messages, True)
            if result["type"] == "report":
                st.session_state.report = result["content"]
            else:
                st.session_state.messages.append({"role":"assistant","content":result["content"]})
            st.rerun()

    st.divider()
    if st.button("Start over"):
        st.session_state.clear()
        st.rerun()

# Process Opportunity Advisor

A browser-based guided discovery tool that helps a nontechnical employee walk through a business process and produces a structured initial assessment for IT.

## Panel experience
The final deployed version is opened from a normal web link. Reviewers do not install Python, packages, or an API key.

## Deployment
This folder is ready for Streamlit Community Cloud or another Streamlit-compatible host.

### Streamlit Community Cloud
1. Put these files in a GitHub repository.
2. Create a Streamlit app from `app.py`.
3. In the host's Secrets settings, add:
   `OPENAI_API_KEY = "..."`

Optional:
   `OPENAI_MODEL = "gpt-5.6"`

The API key stays server-side and is not exposed to reviewers.

## Local development
`pip install -r requirements.txt`
Set `OPENAI_API_KEY`, then:
`streamlit run app.py`

## Included scope
- Guided one-question-at-a-time discovery
- Adaptive follow-up questions
- Structured IT assessment
- Automation / AI / process-improvement / no-action recommendation
- Downloadable assessment
- Start-over/reset

## Deliberately out of scope
- Authentication and production identity integration
- Persistent employee/process storage
- Production system integrations
- Vendor selection
- Automatic project approval
- Implementation of recommended automation

A real municipal deployment would require approved hosting, model/provider, security, retention, access, privacy, and records-management decisions.

import os
from google import genai

# API key set karein (Aap Google AI Studio se free API key le sakte hain)
client = genai.Client(api_key="YOUR_GEMINI_API_KEY")

def ask_my_ai(prompt):
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
    )
    return response.text

# User Interface Loop
print("=== Mera AI Assistant ===")
while True:
    user_input = input("Aap: ")
    if user_input.lower() in ['exit', 'quit']:
        break
    
    ai_response = ask_my_ai(user_input)
    print(f"AI: {ai_response}\n")
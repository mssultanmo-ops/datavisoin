// Free-API-Working.js
class WorkingFreeAI {
    constructor() {
        this.apis = [
            {
                name: "HuggingFace",
                url: "https://api-inference.huggingface.co/models/microsoft/DialoGPT-large-arabic",
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: (msg) => JSON.stringify({
                    inputs: msg,
                    parameters: { max_length: 150, temperature: 0.7 }
                })
            },
            {
                name: "OpenRouter", 
                url: "https://openrouter.ai/api/v1/chat/completions",
                method: "POST",
                headers: { 
                    "Authorization": "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",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://databuddy.com",
                    "X-Title": "DataBuddy"
                },
                body: (msg) => JSON.stringify({
                    model: "google/gemini-pro",
                    messages: [{ role: "user", content: msg }],
                    max_tokens: 200
                })
            }
        ];
    }

    async getAIResponse(userMessage) {
        for (let api of this.apis) {
            try {
                console.log(`🔄 جرب ${api.name}...`);
                
                const response = await fetch(api.url, {
                    method: api.method,
                    headers: api.headers,
                    body: api.body(userMessage)
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    if (api.name === "HuggingFace") {
                        return data[0]?.generated_text || "🤖 مرحباً! كيف أساعدك؟";
                    } else if (api.name === "OpenRouter") {
                        return data.choices[0]?.message?.content || "🤖 أهلاً بك في DataBuddy!";
                    }
                }
            } catch (error) {
                console.log(`❌ ${api.name} فشل:`, error.message);
                continue;
            }
        }
        
        return "🚀 جاري تحميل الخدمات... جرب مرة أخرى بعد قليل";
    }
}

// الاستخدام
const freeAI = new WorkingFreeAI();

// ربط مع واجهتك
async function sendFreeMessage() {
    const input = document.getElementById('assistantInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // أضف رسالة المستخدم
    addMessageToChat(message, 'user');
    input.value = '';
    
    // مؤشر تحميل
    showTypingIndicator();
    
    // احصل على الرد
    const response = await freeAI.getAIResponse(message);
    
    // أضف الرد
    hideTypingIndicator();
    addMessageToChat(response, 'ai');
}

// اربط الأزرار
document.addEventListener('DOMContentLoaded', function() {
    const sendBtn = document.querySelector('#assistant .btn-primary');
    const inputField = document.getElementById('assistantInput');
    
    if (sendBtn) sendBtn.onclick = sendFreeMessage;
    if (inputField) {
        inputField.onkeypress = (e) => {
            if (e.key === 'Enter') sendFreeMessage();
        };
    }
});
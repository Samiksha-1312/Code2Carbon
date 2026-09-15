/**
 * CarbonTrack - EcoBot Assistant (Hardcoded Q&A Edition)
 * Simple, offline AI assistant answering 6 core carbon footprint & sustainability questions.
 */

(function () {
    'use strict';

    const STORAGE_KEY_MESSAGES = 'carbontrack_ecobot_hardcoded_v1';

    let messages = [];
    let isOpen = false;
    let isThinking = false;

    // 6 Hardcoded Questions and Answers
    const HARDCODED_QA = [
        {
            id: 'scope-1-2-3',
            chipLabel: '🌿 Scope 1, 2 & 3 Emissions',
            keywords: ['scope', 'scope 1', 'scope 2', 'scope 3', 'direct', 'indirect', 'emissions'],
            question: 'What are Scope 1, 2, and 3 carbon emissions?',
            answer: `<strong>Scope 1, 2, and 3 Carbon Emissions:</strong><br><br>
<ul>
  <li><strong>Scope 1 (Direct Emissions):</strong> Fuel combustion in diesel generators, campus vehicles, stationary boilers, and AC refrigerant leaks.</li>
  <li><strong>Scope 2 (Indirect Energy Emissions):</strong> Purchased grid electricity, heating, and cooling consumed on campus.</li>
  <li><strong>Scope 3 (Value Chain Emissions):</strong> Business travel, student commuting, paper usage, municipal water supply, and waste disposal.</li>
</ul>
💡 <em>Tip: Calculate your exact Scope 1-3 footprint in our <a href="calculator.html">Carbon Calculator</a>!</em>`
        },
        {
            id: 'electricity-calc',
            chipLabel: '⚡ Electricity Carbon Math',
            keywords: ['electricity', 'power', 'grid', 'kwh', 'energy', 'calculate electricity'],
            question: 'How is the electricity carbon footprint calculated?',
            answer: `<strong>Electricity Carbon Calculation Formula:</strong><br><br>
In CarbonTrack, purchased grid electricity is calculated using national grid emission factors:
<br><br>
<code>Emissions (kg CO₂) = Electricity Usage (kWh) × 0.82 kg CO₂/kWh</code>
<br><br>
Divide by <strong>1,000</strong> to get Metric Tons (tCO₂e).
<br>
<em>Example: 50,000 kWh × 0.82 = 41,000 kg CO₂ (41 tCO₂e).</em>`
        },
        {
            id: 'tree-offset',
            chipLabel: '🌲 Tree Absorption Math',
            keywords: ['tree', 'trees', 'plant', 'forest', 'sequestration', 'absorption', 'offset 1 ton'],
            question: 'How many trees are needed to offset 1 ton of CO₂?',
            answer: `<strong>Tree Carbon Sequestration Math:</strong><br><br>
<ul>
  <li>A mature broadleaf tree absorbs approximately <strong>21.77 kg of CO₂ per year</strong> (~0.0218 tCO₂/yr).</li>
  <li>To offset <strong>1 metric ton (1,000 kg) of CO₂e</strong>, your institution needs approximately <strong>46 mature trees</strong> growing for one full year.</li>
</ul>`
        },
        {
            id: 'solar-benefits',
            chipLabel: '☀️ Solar Panel Offsets',
            keywords: ['solar', 'panel', 'pv', 'renewable', 'clean energy', 'solar offset'],
            question: 'How do rooftop solar panels reduce campus emissions?',
            answer: `<strong>Rooftop Solar PV Offset Impact:</strong><br><br>
Generating clean solar power directly replaces fossil-fuel grid electricity:
<ul>
  <li>Every <strong>1 kWh</strong> of solar generation avoids <strong>~0.82 kg of CO₂e</strong> from the electricity grid.</li>
  <li>A <strong>10 kW rooftop solar array</strong> producing ~14,000 kWh annually saves roughly <strong>11.5 metric tons of CO₂e/year</strong>!</li>
</ul>`
        },
        {
            id: 'standards-iso',
            chipLabel: '📊 ISO 14064 & GHG Protocol',
            keywords: ['iso', 'iso 14064', 'ghg protocol', 'standard', 'methodology', 'compliance'],
            question: 'What standards does CarbonTrack use?',
            answer: `<strong>International Standards & Methodologies:</strong><br><br>
CarbonTrack aligns strictly with global sustainability standards:
<ol>
  <li><strong>GHG Protocol Corporate Standard:</strong> The world's most recognized accounting standard for greenhouse gas emissions.</li>
  <li><strong>ISO 14064-1:</strong> Principles and specifications at the organization level for quantification and reporting of GHG emissions.</li>
</ol>`
        },
        {
            id: 'net-zero-tips',
            chipLabel: '🎯 Campus Net-Zero Roadmap',
            keywords: ['net zero', 'net-zero', 'reduce', 'action', 'steps', 'strategy', 'roadmap'],
            question: 'What are the top actionable steps for campus net-zero?',
            answer: `<strong>Top 5 Actionable Steps for Campus Net-Zero:</strong><br><br>
<ol>
  <li><strong>Smart LED Lighting:</strong> Upgrade 100% of campus fixtures to LEDs with occupancy sensors.</li>
  <li><strong>Rooftop Solar PV:</strong> Utilize building roofs for clean solar microgrids.</li>
  <li><strong>Paperless Workflows:</strong> Digitally automate administrative & academic approvals.</li>
  <li><strong>Water Conservation:</strong> Implement rainwater harvesting and low-flow plumbing fixtures.</li>
  <li><strong>Green Mobility:</strong> Encourage electric shuttles, cycling, and carpooling.</li>
</ol>`
        }
    ];

    // Inject DOM Elements
    function injectChatbotDOM() {
        if (document.getElementById('ecobot-fab')) return;

        // 1. Floating Action Button
        const fab = document.createElement('button');
        fab.id = 'ecobot-fab';
        fab.className = 'ecobot-fab';
        fab.setAttribute('aria-label', 'Open EcoBot Assistant');
        fab.innerHTML = `
            <div class="ecobot-fab-pulse"></div>
            <div class="ecobot-fab-badge" id="ecobot-badge"></div>
            <svg class="ecobot-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"></path>
                <path d="M8 11h8"></path>
                <path d="M8 15h5"></path>
                <circle cx="9" cy="8" r="1" fill="currentColor"></circle>
                <circle cx="15" cy="8" r="1" fill="currentColor"></circle>
            </svg>
            <svg class="ecobot-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        document.body.appendChild(fab);

        // 2. Chat Drawer Window
        const drawer = document.createElement('div');
        drawer.id = 'ecobot-drawer';
        drawer.className = 'ecobot-drawer';

        // Render chips
        const chipsHtml = HARDCODED_QA.map(qa => 
            `<button class="ecobot-chip" data-id="${qa.id}">${qa.chipLabel}</button>`
        ).join('');

        drawer.innerHTML = `
            <div class="ecobot-header">
                <div class="ecobot-header-info">
                    <div class="ecobot-avatar-wrap">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                        </svg>
                        <span class="ecobot-status-dot"></span>
                    </div>
                    <div class="ecobot-header-text">
                        <h3>EcoBot Assistant</h3>
                        <p>CarbonTrack Knowledge Base</p>
                    </div>
                </div>
                <div class="ecobot-header-actions">
                    <button class="ecobot-icon-btn" id="ecobot-btn-clear" title="Clear Chat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                    <button class="ecobot-icon-btn" id="ecobot-btn-close" title="Minimize Chat">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="ecobot-body" id="ecobot-body">
                <div class="ecobot-welcome-card" id="ecobot-welcome">
                    <h4>🌱 Welcome to EcoBot Assistant</h4>
                    <p>Click any topic below or type a question to get instant verified answers from our CarbonTrack Sustainability Knowledge Base:</p>
                    <div class="ecobot-chips-label">Select a Question</div>
                    <div class="ecobot-chips">
                        ${chipsHtml}
                    </div>
                </div>

                <div id="ecobot-messages-container" style="display: flex; flex-direction: column; gap: 12px;"></div>
            </div>

            <div class="ecobot-footer">
                <form class="ecobot-input-form" id="ecobot-form">
                    <textarea class="ecobot-input" id="ecobot-input" rows="1" placeholder="Type a question..." required></textarea>
                    <button type="submit" class="ecobot-send-btn" id="ecobot-send-btn" aria-label="Send Message">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </form>
                <div class="ecobot-footer-note">CarbonTrack Verified Knowledge Base</div>
            </div>
        `;
        document.body.appendChild(drawer);

        attachEventListeners();
        loadHistory();
    }

    function attachEventListeners() {
        const fab = document.getElementById('ecobot-fab');
        const drawer = document.getElementById('ecobot-drawer');
        const closeBtn = document.getElementById('ecobot-btn-close');
        const clearBtn = document.getElementById('ecobot-btn-clear');
        const form = document.getElementById('ecobot-form');
        const input = document.getElementById('ecobot-input');

        // Toggle Drawer
        fab.addEventListener('click', () => {
            isOpen = !isOpen;
            if (isOpen) {
                drawer.classList.add('open');
                fab.classList.add('active');
                document.getElementById('ecobot-badge').style.display = 'none';
                input.focus();
            } else {
                drawer.classList.remove('open');
                fab.classList.remove('active');
            }
        });

        closeBtn.addEventListener('click', () => {
            isOpen = false;
            drawer.classList.remove('open');
            fab.classList.remove('active');
        });

        clearBtn.addEventListener('click', () => {
            if (confirm('Clear chat conversation history?')) {
                messages = [];
                localStorage.removeItem(STORAGE_KEY_MESSAGES);
                renderMessages();
            }
        });

        // Click Chip
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('ecobot-chip')) {
                const qaId = e.target.getAttribute('data-id');
                const matched = HARDCODED_QA.find(item => item.id === qaId);
                if (matched) {
                    processQuestion(matched.question, matched.answer);
                }
            }
        });

        // Form Submit
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (text && !isThinking) {
                handleUserSend(text);
                input.value = '';
                input.style.height = 'auto';
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                form.dispatchEvent(new Event('submit'));
            }
        });

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 80) + 'px';
        });
    }

    function handleUserSend(text) {
        const lower = text.toLowerCase();
        const matched = HARDCODED_QA.find(item => 
            item.keywords.some(kw => lower.includes(kw))
        );

        if (matched) {
            processQuestion(text, matched.answer);
        } else {
            // Default response listing the 6 available topics
            const optionsList = HARDCODED_QA.map(qa => `• <strong>${qa.question}</strong>`).join('<br>');
            const defaultReply = `I am trained to answer the following 6 core carbon footprint topics:<br><br>${optionsList}<br><br><em>Click any button above or type keywords like "Scope 1", "Electricity", "Trees", "Solar", "ISO", or "Net Zero"!</em>`;
            processQuestion(text, defaultReply);
        }
    }

    function processQuestion(questionText, answerHtml) {
        const userMsg = {
            id: Date.now().toString(),
            sender: 'user',
            text: questionText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        messages.push(userMsg);
        saveHistory();
        renderMessages();

        showTypingIndicator();

        setTimeout(() => {
            hideTypingIndicator();

            const botMsg = {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: answerHtml,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            messages.push(botMsg);
            saveHistory();
            renderMessages();
        }, 400);
    }

    function showTypingIndicator() {
        isThinking = true;
        const container = document.getElementById('ecobot-messages-container');
        if (!container) return;

        let typingEl = document.getElementById('ecobot-typing-el');
        if (!typingEl) {
            typingEl = document.createElement('div');
            typingEl.id = 'ecobot-typing-el';
            typingEl.className = 'ecobot-typing';
            typingEl.innerHTML = `
                <div class="ecobot-typing-dot"></div>
                <div class="ecobot-typing-dot"></div>
                <div class="ecobot-typing-dot"></div>
            `;
            container.appendChild(typingEl);
        }
        scrollToBottom();
    }

    function hideTypingIndicator() {
        isThinking = false;
        const typingEl = document.getElementById('ecobot-typing-el');
        if (typingEl) typingEl.remove();
    }

    function renderMessages() {
        const container = document.getElementById('ecobot-messages-container');
        if (!container) return;

        container.innerHTML = '';

        messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `ecobot-msg ${msg.sender}`;
            msgDiv.innerHTML = `
                <div class="ecobot-msg-bubble">
                    ${msg.text}
                </div>
                <span class="ecobot-msg-time">${msg.time}</span>
            `;
            container.appendChild(msgDiv);
        });

        scrollToBottom();
    }

    function scrollToBottom() {
        const body = document.getElementById('ecobot-body');
        if (body) {
            body.scrollTop = body.scrollHeight;
        }
    }

    function saveHistory() {
        try {
            localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages.slice(-30)));
        } catch (e) {
            console.error('Failed to save chat history', e);
        }
    }

    function loadHistory() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
            if (saved) {
                messages = JSON.parse(saved);
                renderMessages();
            }
        } catch (e) {
            messages = [];
        }
    }

    // Initialize DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectChatbotDOM);
    } else {
        injectChatbotDOM();
    }

})();

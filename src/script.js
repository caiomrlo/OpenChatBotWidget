(function() {
    if (window.OpenChatBotWidgetInitialized) return;
    window.OpenChatBotWidgetInitialized = true;

    // --- CONSTANTS & DEFAULTS ---
    const CONSTANTS = {
        AUDIO_URL: 'https://open-chatbot-widget.b-cdn.net/files/bubble-pop.mp3',
        DELAYS: {
            TYPING: 2000,
            BUBBLE_SHOW: 6000,
            BUBBLE_INTERVAL: 15000,
            BUBBLE_INITIAL: 7000,
            KEYBOARD_SCROLL: 300,
            AUTO_SEND: 500
        },
        ANALYTICS: {
            START: 'chatWidgetNewChat',
            MESSAGE: 'chatWidgetUserMessage'
        }
    };

    const defaultConfig = {
        webhook: { url: '', route: '' },
        branding: {
            logo: 'https://open-chatbot-widget.b-cdn.net/files/thumb.png',
            name: 'Chatbot',
            welcomeText: '',
            responseTimeText: '',
            newChatButtonText: { text: 'Start a new conversation', enabled: true },
            poweredBy: { text: 'by @caiomrlo', link: 'https://github.com/caiomrlo' }
        },
        style: {
            primaryColor: '',
            secondaryColor: '',
            position: 'right',
            backgroundColor: '#ffffff',
            fontColor: '#333333'
        },
        speechBubble: { enabled: false, text: 'Need help?' },
        predefinedMessages: []
    };

    // --- CONFIGURATION MERGE ---
    const userConfig = window.OpenChatBotWidgetConfig || {};
    const config = {
        webhook: { ...defaultConfig.webhook, ...userConfig.webhook },
        branding: { 
            ...defaultConfig.branding, 
            ...userConfig.branding,
            newChatButtonText: {
                ...defaultConfig.branding.newChatButtonText,
                ...(userConfig.branding ? userConfig.branding.newChatButtonText : {})
            }
        },
        style: { ...defaultConfig.style, ...userConfig.style },
        speechBubble: { ...defaultConfig.speechBubble, ...userConfig.speechBubble },
        predefinedMessages: userConfig.predefinedMessages || []
    };

    // --- STATE & AUDIO ---
    let currentSessionId = '';
    let speechBubbleInterval = null;
    let initialBubbleTimeout = null;
    
    const notificationSound = new Audio(CONSTANTS.AUDIO_URL);
    
    function playNotification() {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(() => {});
    }

    function pushAnalyticsEvent(eventName) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: eventName });
    }

    function generateUUID() {
        return crypto.randomUUID();
    }

    // --- HTML TEMPLATES ---
    const Templates = {
        predefinedButtons: (msgs) => `
            <div class="predefined-buttons">
                ${msgs.map(msg => `<button class="predefinedBtn" data-message="${msg}">${msg}</button>`).join('')}
            </div>`,

        newConversation: () => `
            <div class="brandHeader">
                <img src="${config.branding.logo}" alt="${config.branding.name}">
                <span>${config.branding.name}<small>Online</small></span>
                <button class="closeButton">×</button>
            </div>
            <div class="newConversation">
                <div class="newConversation-hero">
                    <h2 class="welcomeText">${config.branding.welcomeText}</h2>
                </div>
                <div class="newConversation-content">
                    <button class="newChatBtn${!config.branding.newChatButtonText.enabled ? ' hidden' : ''}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" style="fill: red;">
                            <path opacity="1" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88836 21.6244 10.4003 22 12 22Z" fill="currentColor"/>
                        </svg>
                        ${config.branding.newChatButtonText.text}
                    </button>
                    ${Templates.predefinedButtons(config.predefinedMessages)}
                    <p class="responseText">${config.branding.responseTimeText}</p>
                </div>
            </div>`,

        chatInterface: () => `
            <div class="chatInterface">
                <div class="brandHeader">
                    <img src="${config.branding.logo}" alt="${config.branding.name}">
                    <span>${config.branding.name}<small>Online</small></span>
                    <button class="closeButton">×</button>
                </div>
                <div class="chatMessages">
                    <div class="chatMessage bot writing" style="order: 1; display: none">
                        <div class="chat__wave">
                            <span class="chat__dot"></span><span class="chat__dot"></span><span class="chat__dot"></span>
                        </div>
                    </div>
                </div>
                <div class="chatInput">
                    <textarea placeholder="Escreva sua mensagem..." rows="1"></textarea>
                    <button type="submit">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                            <path d="M12 6V18M12 6L7 11M12 6L17 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="chatFooter">
                    <a href="${config.branding.poweredBy.link}" target="_blank">${config.branding.poweredBy.text}</a>
                </div>
            </div>`,

        toggleButton: () => `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" style="fill: red;">
                <path opacity="1" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88836 21.6244 10.4003 22 12 22Z" fill="#ffffffff"/>
                <path d="M7.825 12.85C7.36937 12.85 7 13.2194 7 13.675C7 14.1306 7.36937 14.5 7.825 14.5H13.875C14.3306 14.5 14.7 14.1306 14.7 13.675C14.7 13.2194 14.3306 12.85 13.875 12.85H7.825Z" fill="${config.style.primaryColor}"/>
                <path d="M7.825 9C7.36937 9 7 9.36937 7 9.825C7 10.2806 7.36937 10.65 7.825 10.65H16.625C17.0806 10.65 17.45 10.2806 17.45 9.825C17.45 9.36937 17.0806 9 16.625 9H7.825Z" fill="${config.style.primaryColor}"/>
            </svg>`
    };

    // --- DOM GENERATION ---
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'chatBotWidget';
    widgetContainer.style.setProperty('--n8n-chat-primary-color', config.style.primaryColor);
    widgetContainer.style.setProperty('--n8n-chat-secondary-color', config.style.secondaryColor);
    widgetContainer.style.setProperty('--n8n-chat-background-color', config.style.backgroundColor);
    widgetContainer.style.setProperty('--n8n-chat-font-color', config.style.fontColor);

    const chatContainer = document.createElement('div');
    chatContainer.className = `chatContainer${config.style.position === 'left' ? ' position-left' : ''}`;
    chatContainer.innerHTML = Templates.newConversation() + Templates.chatInterface();

    const toggleButton = document.createElement('button');
    toggleButton.className = `chatToggle${config.style.position === 'left' ? ' position-left' : ''}`;
    toggleButton.innerHTML = Templates.toggleButton();

    widgetContainer.appendChild(chatContainer);
    widgetContainer.appendChild(toggleButton);
    document.body.appendChild(widgetContainer);

    // --- ELEMENT SELECTION ---
    const UI = {
        newChatBtn: chatContainer.querySelector('.newChatBtn'),
        chatInterface: chatContainer.querySelector('.chatInterface'),
        messagesContainer: chatContainer.querySelector('.chatMessages'),
        textarea: chatContainer.querySelector('textarea'),
        sendButton: chatContainer.querySelector('button[type="submit"]'),
        statusSmall: chatContainer.querySelector('.chatInterface .brandHeader span small'),
        writingEffect: chatContainer.querySelector('.chatMessage.writing'),
        chatInputContainer: chatContainer.querySelector('.chatInput'),
        predefinedBtns: chatContainer.querySelectorAll('.predefinedBtn'),
        header: chatContainer.querySelector('.brandHeader'),
        newConversation: chatContainer.querySelector('.newConversation')
    };

    // --- HELPER FUNCTIONS: UI ---
    function restoreDefaultInput() {
        const customInput = UI.chatInputContainer.querySelector('.custom-input-wrapper');
        if (customInput) customInput.remove();
        UI.textarea.style.display = '';
        UI.sendButton.style.display = '';
    }

    function renderInputField(fieldType) {
        restoreDefaultInput();
        UI.textarea.style.display = 'none';
        UI.sendButton.style.display = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-input-wrapper';

        const input = document.createElement('input');
        input.name = fieldType;
        input.required = true;

        const placeholders = {
            email: 'seu_email@example.com',
            phone: '(99) 99999-9999',
            name: 'Seu nome completo'
        };
        
        input.type = fieldType === 'phone' ? 'tel' : (fieldType === 'email' ? 'email' : 'text');
        input.placeholder = placeholders[fieldType] || '';

        if (fieldType === 'phone') {
            input.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, "");
                if (v.length > 11) v = v.substring(0, 11);
                v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
                v = v.replace(/(\d)(\d{4})$/, "$1-$2");
                e.target.value = v;
                input.setCustomValidity('');
            });
        }

        const newSendButton = UI.sendButton.cloneNode(true);
        newSendButton.style.display = '';

        wrapper.appendChild(input);
        wrapper.appendChild(newSendButton);
        UI.chatInputContainer.appendChild(wrapper);

        const submitValue = () => {
            const value = input.value.trim();

            if (fieldType === 'phone') {
                const digits = value.replace(/\D/g, '');
                if (digits.length < 10) {
                    input.setCustomValidity('Informe um telefone válido (DDD + número).');
                } else {
                    input.setCustomValidity('');
                }
            }

            if (input.reportValidity() && value) {
                sendMessage(`field/${fieldType}:${value}`, value);
                restoreDefaultInput();
            }
        };

        newSendButton.addEventListener('click', submitValue);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitValue();
            }
        });

        input.focus();
    }

    function renderResponseButtons(buttons) {
        if (!buttons || !buttons.length) return;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'chatMessage-buttons';
        
        buttons.forEach(buttonText => {
            const button = document.createElement('button');
            button.className = 'chatMessage-btn';
            button.textContent = buttonText;
            button.addEventListener('click', () => {
                sendMessage(buttonText);
                buttonsContainer.remove();
            });
            buttonsContainer.appendChild(button);
        });
        
        UI.messagesContainer.appendChild(buttonsContainer);
        UI.messagesContainer.scrollTop = UI.messagesContainer.scrollHeight;
    }

    function toggleUIForChat() {
        UI.header.style.display = 'none';
        UI.newConversation.style.display = 'none';
        UI.chatInterface.classList.add('active');
    }

    function appendUserMessage(message, displayMessage) {
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'chatMessage user';
        userMessageDiv.textContent = displayMessage || message;
        UI.messagesContainer.appendChild(userMessageDiv);
        UI.messagesContainer.scrollTop = UI.messagesContainer.scrollHeight;
    }

    function appendBotMessage(text) {
        const msg = document.createElement('div');
        msg.className = 'chatMessage bot';
        msg.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        UI.messagesContainer.appendChild(msg);
        UI.messagesContainer.scrollTop = UI.messagesContainer.scrollHeight;
        playNotification();
    }

    // --- SPEECH BUBBLE LOGIC ---
    let speechBubble = null;

    function startBubbleCycle() {
        if (speechBubbleInterval || !speechBubble || chatContainer.classList.contains('open')) return;
        
        stopBubbleCycle();

        initialBubbleTimeout = setTimeout(() => {
            if (chatContainer.classList.contains('open')) return;
            speechBubble.classList.add('show');
            setTimeout(() => speechBubble.classList.remove('show'), CONSTANTS.DELAYS.BUBBLE_SHOW);

            speechBubbleInterval = setInterval(() => {
                speechBubble.classList.add('show');
                setTimeout(() => speechBubble.classList.remove('show'), CONSTANTS.DELAYS.BUBBLE_SHOW);
            }, CONSTANTS.DELAYS.BUBBLE_INTERVAL);
        }, CONSTANTS.DELAYS.BUBBLE_INITIAL);
    }

    function stopBubbleCycle() {
        if (!speechBubble) return;
        clearTimeout(initialBubbleTimeout);
        clearInterval(speechBubbleInterval);
        speechBubbleInterval = null;
        speechBubble.classList.remove('show');
    }

    if (config.speechBubble.enabled) {
        speechBubble = document.createElement('div');
        speechBubble.className = `chatSpeechBubble${config.style.position === 'left' ? ' position-left' : ''}`;
        speechBubble.textContent = config.speechBubble.text;
        widgetContainer.appendChild(speechBubble);
        startBubbleCycle();
    }

    // --- NETWORK & RESPONSE PROCESSING ---
    async function fetchWebhook(payload) {
        try {
            const response = await fetch(config.webhook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            console.error('Webhook Error:', error);
            return null;
        }
    }

    function processBotResponse(responseData) {
        const responseObj = Array.isArray(responseData) ? responseData[0] : responseData;
        if (!responseObj) return;

        const outputs = Object.entries(responseObj)
            .filter(([key]) => key.startsWith('output'))
            .map(([key, value]) => ({
                num: parseInt(key.replace('output', '')) || 1,
                text: value
            }))
            .sort((a, b) => a.num - b.num)
            .map(o => o.text);

        const buttons = Object.entries(responseObj)
            .filter(([key]) => key.startsWith('button'))
            .map(([, value]) => value);

        const fieldType = responseObj.field;

        const finalizeResponse = () => {
            UI.statusSmall.textContent = 'Online';
            UI.writingEffect.style.display = 'none';
            renderResponseButtons(buttons);
            if (fieldType && ['email', 'phone', 'name'].includes(fieldType)) {
                renderInputField(fieldType);
            }
        };

        if (outputs.length === 0) {
            finalizeResponse();
        } else {
            outputs.forEach((text, idx) => {
                setTimeout(() => {
                    appendBotMessage(text);
                    if (idx === outputs.length - 1) finalizeResponse();
                }, idx * CONSTANTS.DELAYS.TYPING);
            });
        }
    }

    async function startNewConversation() {
        currentSessionId = generateUUID();
        pushAnalyticsEvent(CONSTANTS.ANALYTICS.START);
        
        const data = [{
            action: "loadPreviousSession",
            sessionId: currentSessionId,
            route: config.webhook.route,
            metadata: { userId: "" }
        }];

        const responseData = await fetchWebhook(data);
        toggleUIForChat();
        processBotResponse(responseData);
    }

    async function sendMessage(message, displayMessage) {
        UI.statusSmall.textContent = 'Escrevendo...';
        UI.writingEffect.style.display = 'block';
        pushAnalyticsEvent(CONSTANTS.ANALYTICS.MESSAGE);
        appendUserMessage(message, displayMessage);

        const messageData = {
            action: "sendMessage",
            sessionId: currentSessionId,
            route: config.webhook.route,
            chatInput: message,
            metadata: {
                userId: "",
                currentUrl: window.location.href 
            }
        };

        const responseData = await fetchWebhook(messageData);
        processBotResponse(responseData);
    }

    // --- EVENT LISTENERS ---
    UI.predefinedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            stopBubbleCycle();
            const mensagem = btn.getAttribute('data-message');
            startNewConversation().then(() => {
                setTimeout(() => sendMessage(mensagem), CONSTANTS.DELAYS.AUTO_SEND);
            });
        });
    });

    UI.newChatBtn.addEventListener('click', () => {
        stopBubbleCycle();
        startNewConversation();
    });

    UI.sendButton.addEventListener('click', () => {
        const message = UI.textarea.value.trim();
        if (message) {
            sendMessage(message);
            UI.textarea.value = '';
        }
    });

    UI.textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const message = UI.textarea.value.trim();
            if (message) {
                sendMessage(message);
                UI.textarea.value = '';
            }
        }
    });

    UI.textarea.addEventListener('focus', () => {
        setTimeout(() => {
            UI.chatInputContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, CONSTANTS.DELAYS.KEYBOARD_SCROLL);
    });

    toggleButton.addEventListener('click', () => {
        chatContainer.classList.toggle('open');
        if (chatContainer.classList.contains('open')) {
            stopBubbleCycle();
        } else {
            startBubbleCycle();
        }
    });

    chatContainer.querySelectorAll('.closeButton').forEach(button => {
        button.addEventListener('click', () => {
            chatContainer.classList.remove('open');
            startBubbleCycle();
        });
    });

    document.querySelectorAll('.chatBotWidget_customForm').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = form.querySelector('.customInput');
            if (!input) return;
            
            const message = input.value.trim();
            if (!message) return;

            chatContainer.classList.add('open');
            stopBubbleCycle();

            if (currentSessionId) {
                sendMessage(message);
            } else {
                startNewConversation().then(() => {
                    setTimeout(() => sendMessage(message), CONSTANTS.DELAYS.AUTO_SEND);
                });
            }
            input.value = '';
        });
    });

})();
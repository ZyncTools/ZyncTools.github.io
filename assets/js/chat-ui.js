/**
 * ZyncTools — Chat UI Controller
 * Handles widget interactions, message rendering, and tool cards
 */

(function () {
    'use strict';

    const ChatUI = {
        isOpen: false,
        messages: [],
        typingTimer: null,

        $: (sel) => document.querySelector(sel),
        $$: (sel) => Array.from(document.querySelectorAll(sel)),

        init() {
            this.cacheElements();
            this.bindEvents();
            this.addWelcomeMessage();
        },

        cacheElements() {
            this.fab = this.$('#chatbot-fab');
            this.window = this.$('#chatbot-window');
            this.messagesContainer = this.$('#chatbot-messages');
            this.typingIndicator = this.$('#chatbot-typing');
            this.input = this.$('#chatbot-input');
            this.sendBtn = this.$('#chatbot-send');
            this.closeBtn = this.$('#chatbot-close-btn');
        },

        bindEvents() {
            if (this.fab) {
                this.fab.addEventListener('click', () => this.toggle());
            }
            if (this.closeBtn) {
                this.closeBtn.addEventListener('click', () => this.close());
            }
            if (this.sendBtn) {
                this.sendBtn.addEventListener('click', () => this.send());
            }
            if (this.input) {
                this.input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.send();
                    }
                });
            }

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        },

        toggle() {
            this.isOpen ? this.close() : this.open();
        },

        open() {
            this.isOpen = true;
            if (this.fab) this.fab.classList.add('active');
            if (this.window) this.window.classList.add('open');
            if (this.input) {
                this.input.focus();
            }
        },

        close() {
            this.isOpen = false;
            if (this.fab) this.fab.classList.remove('active');
            if (this.window) this.window.classList.remove('open');
        },

        addWelcomeMessage() {
            this.appendMessage('bot', "Hi! I'm the ZyncTools assistant. Ask me anything about our tools — for example, \"How do I compress a PNG?\" or \"Which tool converts MP4 to MP3?\"");
        },

        async send() {
            const text = this.input.value.trim();
            if (!text) return;

            this.input.value = '';
            this.appendMessage('user', text);
            this.showTyping();

            try {
                const response = await window.ZyncChatBot.query(text);
                const formatted = window.ZyncChatBot.formatResponse(response);
                this.hideTyping();
                this.appendMessage('bot', formatted.text, formatted.toolCards);
            } catch (err) {
                this.hideTyping();
                this.appendMessage('bot', "I'm having trouble connecting right now. Please try again in a moment.");
                console.error('[ChatUI] Query error:', err);
            }
        },

        appendMessage(role, text, toolCards = []) {
            const msgDiv = document.createElement('div');
            msgDiv.className = `chat-message ${role}`;

            const avatar = document.createElement('div');
            avatar.className = 'chat-message-avatar';
            avatar.textContent = role === 'bot' ? 'Z' : 'U';

            const content = document.createElement('div');
            content.className = 'chat-message-content';
            content.innerHTML = text;

            if (toolCards.length > 0) {
                const cardsContainer = document.createElement('div');
                cardsContainer.className = 'chat-tool-cards';
                toolCards.forEach(tool => {
                    cardsContainer.appendChild(this.createToolCard(tool));
                });
                content.appendChild(cardsContainer);
            }

            msgDiv.appendChild(avatar);
            msgDiv.appendChild(content);

            if (this.messagesContainer) {
                this.messagesContainer.appendChild(msgDiv);
                this.scrollToBottom();
            }
        },

        createToolCard(tool) {
            const card = document.createElement('a');
            card.href = tool.url;
            card.className = 'chat-tool-card';
            card.target = '_self';
            card.rel = 'noopener';

            card.innerHTML = `
                <div class="chat-tool-card-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
                <div class="chat-tool-card-info">
                    <div class="chat-tool-card-title">${tool.name}</div>
                    <div class="chat-tool-card-desc">${tool.description}</div>
                </div>
                <div class="chat-tool-card-arrow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
            `;

            return card;
        },

        showTyping() {
            if (this.typingIndicator) {
                this.typingIndicator.classList.add('visible');
                this.scrollToBottom();
            }
        },

        hideTyping() {
            if (this.typingIndicator) {
                this.typingIndicator.classList.remove('visible');
            }
        },

        scrollToBottom() {
            if (this.messagesContainer) {
                requestAnimationFrame(() => {
                    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
                });
            }
        }
    };

    window.ZyncChatUI = ChatUI;
})();

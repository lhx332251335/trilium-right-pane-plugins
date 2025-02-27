(async function() {
    // Configurable parameters
    const ollamaConfig = {
        baseUrl: 'http://127.0.0.1:11434', // Ollama service address
        model: 'qwen2.5:14b',                 // Model name
        systemPrompt: 'You are an AI assistant, helping users understand and process note content.',
        maxContextLength: 8192,              // Maximum context length
        streamResponse: true                  // Control whether to use streaming response
    };


    // Create AI chat plugin
    const AIChatWidget = {
        id: 'ai-chat-widget',
        priority: 0,
        active: false,  // Default off
        widget: null,
        container: null,
        parentContainer: null,
        chatHistory: [],
        resizeStartY: 0,
        initialHeight: 0,
        createWidget() {
            const widget = document.createElement('div');
            widget.id = this.id;
            widget.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    padding: 2px 4px;
                    border-bottom: 1px solid var(--main-border-color);
                    border-radius: 6px 6px 0 0;
                    background: var(--accented-background-color);
                ">
                    <div style="
                        font-size: 13px;
                        font-weight: bold;
                        color: var(--main-text-color);
                    ">AI Assistant (${ollamaConfig.model})</div>
                    <button class="clear-button" style="
                        margin-left: 8px;
                        padding: 2px 6px;
                        border: none;
                        border-radius: 4px;
                        background: var(--muted-text-color);
                        color: white;
                        font-size: 12px;
                        cursor: pointer;
                    ">Clear Chat</button>
                    <button class="stream-toggle-button" style="
                        margin-left: 8px;
                        padding: 2px 6px;
                        border: none;
                        border-radius: 4px;
                        background: ${ollamaConfig.streamResponse ? 'var(--main-text-color)' : 'var(--muted-text-color)'};
                        color: white;
                        font-size: 12px;
                        cursor: pointer;
                    ">${ollamaConfig.streamResponse ? 'Streaming: On' : 'Streaming: Off'}</button>
                    <span class="bx bx-x close-button" style="
                        cursor: pointer;
                        font-size: 16px;
                        margin-left: auto;
                        padding: 2px;
                        border-radius: 4px;
                        color: var(--muted-text-color);
                        transition: all 0.2s;
                    "></span>
                </div>

                    <div class="ai-chat-content" style="
                        padding: 4px;
                        border-radius: 0 0 6px 6px;
                        background: white;
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        min-height: 100px;
                        max-height: 75vh;
                        overflow: hidden;
                    ">
                        <div class="chat-messages" style="
                            flex: 1;
                            overflow-y: auto;
                            padding: 4px;
                            border: 1px solid var(--main-border-color);
                            border-radius: 4px;
                            margin-bottom: 6px;
                            background: var(--accented-background-color);
                            opacity: 0.9;
                            min-height: 50px;
                        "></div>
                        <div class="messages-resize-handle" style="
                            height: 5px;
                            cursor: ns-resize;
                            background: transparent;
                            margin: 2px 0;
                        "></div>
                        <div class="input-container" style="
                            display: flex;
                            flex-direction: column;
                            min-height: 25px;
                        ">
                            <div style="display: flex; gap: 4px; flex: 1;">
                                <textarea class="chat-input" placeholder="Enter your question..." style="
                                    flex: 1;
                                    padding: 6px;
                                    border: 1px solid var(--main-border-color);
                                    border-radius: 4px;
                                    resize: none;
                                    min-height: 25px;
                                "></textarea>
                                <button class="send-button" style="
                                    padding: 0 10px;
                                    border: none;
                                    border-radius: 4px;
                                    background: var(--main-text-color);
                                    color: white;
                                    cursor: pointer;
                                ">Send</button>
                            </div>
                            <div class="input-resize-handle" style="
                                height: 5px;
                                cursor: ns-resize;
                                background: transparent;
                                margin-top: 4px;
                            "></div>
                        </div>
                    </div>
                </div>
            `;

            // Clear button logic
            const clearButton = widget.querySelector('.clear-button');
            clearButton.addEventListener('click', () => {
                const messagesContainer = widget.querySelector('.chat-messages');
                messagesContainer.innerHTML = '';
                this.chatHistory = [];
            });
            
            // Stream toggle button logic
            const streamToggleButton = widget.querySelector('.stream-toggle-button');
            streamToggleButton.addEventListener('click', () => {
                ollamaConfig.streamResponse = !ollamaConfig.streamResponse;
                streamToggleButton.textContent = ollamaConfig.streamResponse ? 'Streaming: On' : 'Streaming: Off';
                streamToggleButton.style.background = ollamaConfig.streamResponse ? 'var(--main-text-color)' : 'var(--muted-text-color)';
            });

            // Close button logic
            const closeButton = widget.querySelector('.close-button');
            closeButton.addEventListener('click', () => {
                this.hideWidget();
                this.active = false;
                AIChatButton.updateButtonStyle();
            });

            // Resize drag logic
            const chatContent = widget.querySelector('.ai-chat-content');
            const chatMessages = widget.querySelector('.chat-messages');
            const chatInput = widget.querySelector('.chat-input');
            const messagesResizeHandle = widget.querySelector('.messages-resize-handle');
            const inputResizeHandle = widget.querySelector('.input-resize-handle');

            // Message area resize
            messagesResizeHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const startY = e.clientY;
                const startHeight = chatMessages.offsetHeight;
                const startContentHeight = chatContent.offsetHeight;
                
                const onMouseMove = (e) => {
                    const deltaY = e.clientY - startY;
                    const newMessagesHeight = Math.max(200, startHeight + deltaY); // Minimum height 200px
                    const newContentHeight = startContentHeight + deltaY;
                    
                    chatMessages.style.height = `${newMessagesHeight}px`;
                    chatContent.style.height = `${newContentHeight}px`;
                };
                
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            // Input box resize
            inputResizeHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const startY = e.clientY;
                const startHeight = chatInput.offsetHeight;
                const startContentHeight = chatContent.offsetHeight;
                
                const onMouseMove = (e) => {
                    const deltaY = e.clientY - startY;
                    const newInputHeight = Math.max(25, startHeight + deltaY); // Minimum height 60px
                    const newContentHeight = startContentHeight + deltaY;
                    
                    chatInput.style.height = `${newInputHeight}px`;
                    chatContent.style.height = `${newContentHeight}px`;
                };
                
                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            // Send button logic
            const sendButton = widget.querySelector('.send-button');
            const messagesContainer = widget.querySelector('.chat-messages');

            // Send button logic
            sendButton.addEventListener('click', async () => {
                const userInput = chatInput.value.trim();
                if (!userInput) return;

                // Add user message to chat window
                this.addMessage('user', userInput);
                chatInput.value = '';

                // Get current note content as context
                try {
                    const note = api.getActiveContextNote();
                    if (!note) {
                        this.addMessage('assistant', 'Unable to get current note content');
                        return;
                    }

                    const blob = await note.getBlob();
                    const noteContent = blob.content;
                    const noteTitle = note.title;
                    
                    // Call Ollama API (streaming response handling is implemented inside callOllamaAPI)
                    const response = await this.callOllamaAPI(noteTitle, noteContent, userInput);
                    
                    // Save chat history
                    this.chatHistory.push({ role: 'user', content: userInput });
                    this.chatHistory.push({ role: 'assistant', content: response });
                    
                } catch (error) {
                    console.error('AI chat error:', error);
                    this.addMessage('assistant', `Request error: ${error.message}`);
                }
            });

            // Add Enter key to send feature
            chatInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendButton.click();
                }
            });

            this.widget = widget;
            this.container = widget.querySelector('.ai-chat-content');
            return widget;
        },

        hideWidget() {
            if (this.widget) {
                this.widget.style.display = 'none';
                window.RightPaneManager?.constructor.reportContent(this.id, false);
            }
        },

        showWidget() {
            if (!this.widget) {
                return;
            }
            this.widget.style.display = '';
            window.RightPaneManager?.constructor.reportContent(this.id, true);
        },

       
        // Format message content, handle line breaks, etc.
        formatMessage(content) {
            return content
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
        },

        // Call Ollama API
        async callOllamaAPI(noteTitle, noteContent, userInput) {
            try {
                // Build conversation history
                const conversationContext = this.chatHistory
                    .map(msg => `${msg.role}: ${msg.content}`)
                    .join('\n');

                // Combine system prompt and note context, ensuring it doesn't exceed maximum length
                const fullContext = `${ollamaConfig.systemPrompt}\n\nCurrent note title: ${noteTitle}\n\nNote content:\n${noteContent}\n\nConversation history:\n${conversationContext}`;
                const truncatedContext = fullContext.slice(-ollamaConfig.maxContextLength);

                // Create a message ID for updating streaming responses
                const messageId = 'msg-' + Date.now();
                this.addMessage('assistant', 'Thinking...', 'thinking', messageId);

                // Use backend to handle response
                return await api.runAsyncOnBackendWithManualTransactionHandling(
                    async (text, baseUrl, model, systemPrompt, maxContextLength, msgId, useStream) => {
                        try {
                            const response = await fetch(`${baseUrl}/api/generate`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    model: model,
                                    prompt: text,
                                    system: systemPrompt,
                                    stream: useStream, // Decide whether to enable streaming based on configuration
                                    options: {
                                        num_ctx: maxContextLength
                                    }
                                })
                            });

                            // Check if response is successful
                            if (!response.ok) {
                                throw new Error(`HTTP error: ${response.status}`);
                            }

                            // Use different handling methods based on whether streaming is enabled
                            if (useStream) {
                                // Handle streaming response
                                const reader = response.body.getReader();
                                const decoder = new TextDecoder();
                                let fullResponse = '';
                                let buffer = '';

                                while (true) {
                                    const { done, value } = await reader.read();
                                    if (done) break;

                                    buffer += decoder.decode(value, { stream: true });

                                    // Process complete JSON objects in buffer
                                    let startPos = 0;
                                    while (true) {
                                        const endPos = buffer.indexOf('\n', startPos);
                                        if (endPos === -1) break;

                                        const line = buffer.substring(startPos, endPos).trim();
                                        startPos = endPos + 1;

                                        if (line) {
                                            try {
                                                const chunk = JSON.parse(line);
                                                if (chunk.response) {
                                                    fullResponse += chunk.response;
                                                    // Send incremental updates to frontend
                                                    api.runOnFrontend((id, text) => {
                                                        const msgElement = document.querySelector(`#${id}`);
                                                        if (msgElement) {
                                                            msgElement.innerHTML = text.replace(/\n/g, '<br>')
                                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                                .replace(/\*(.*?)\*/g, '<em>$1</em>');
                                                            msgElement.classList.remove('thinking');

                                                            // Scroll to bottom
                                                            const messagesContainer = msgElement.closest('.chat-messages');
                                                            if (messagesContainer) {
                                                                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                                            }
                                                        }
                                                    }, [msgId, fullResponse]);
                                                }
                                            } catch (e) {
                                                // Ignore parsing errors
                                            }
                                        }
                                    }

                                    // Keep unprocessed parts
                                    buffer = buffer.substring(startPos);
                                }

                                // Process remaining buffer
                                if (buffer.trim()) {
                                    try {
                                        const chunk = JSON.parse(buffer.trim());
                                        if (chunk.response) {
                                            fullResponse += chunk.response;
                                        }
                                    } catch (e) {
                                        // Ignore parsing errors
                                    }
                                }

                                return fullResponse;
                            } else {
                                // Non-streaming response, get complete response directly
                                const responseData = await response.json();

                                // Update message content
                                api.runOnFrontend((id, text) => {
                                    const msgElement = document.querySelector(`#${id}`);
                                    if (msgElement) {
                                        msgElement.innerHTML = text.replace(/\n/g, '<br>')
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\*(.*?)\*/g, '<em>$1</em>');
                                        msgElement.classList.remove('thinking');

                                        // Scroll to bottom
                                        const messagesContainer = msgElement.closest('.chat-messages');
                                        if (messagesContainer) {
                                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                                        }
                                    }
                                }, [msgId, responseData.response]);

                                return responseData.response;
                            }
                        } catch (error) {
                            throw new Error("Failed to call AI service: " + error.message);
                        }
                    },
                    [userInput, ollamaConfig.baseUrl, ollamaConfig.model, truncatedContext, ollamaConfig.maxContextLength, messageId, ollamaConfig.streamResponse]
                );
            } catch (error) {
                throw error;
            }
        },

        // Add message to chat window (modified to support message ID)
        addMessage(role, content, className = '', messageId = '') {
            const messagesContainer = this.widget.querySelector('.chat-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${role} ${className}`;
            if (messageId) {
                messageDiv.id = messageId;
            }
            messageDiv.style.cssText = `
                margin-bottom: 6px;
                padding: 6px 8px;
                border-radius: 4px;
                max-width: 85%;
                word-break: break-word;
                ${role === 'user' ? `
                    background: var(--main-text-color);
                    color: white;
                    align-self: flex-end;
                    margin-left: auto;
                ` : `
                    background: white;
                    border: 1px solid var(--main-border-color);
                `}
            `;
            messageDiv.innerHTML = this.formatMessage(content);
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        },


        async initialize() {
            // Get parent container reference
            this.parentContainer = await window.RightPaneManager?.getCustomWidgetsContainer();
            if (!this.parentContainer) return;

            // Create widget
            if (!this.widget) {
                this.widget = this.createWidget();
                this.parentContainer.appendChild(this.widget);
                
                // Hide by default
                this.hideWidget();
            }
        },

        async update() {
            // Ensure initialization is complete
            if (!this.widget) {
                await this.initialize();
            }

            // Show or hide based on active state
            if (this.active) {
                this.showWidget();
            } else {
                this.hideWidget();
            }
        }
    };

    // Create control button
    const AIChatButton = {
        id: 'ai-chat-button',
        button: null,

        createButton() {
            const button = document.createElement('span');
            button.className = 'bx bx-bot';
            button.title = 'AI Assistant';
            button.style.cssText = `
                cursor: pointer;
                font-size: 20px;
                color: var(--muted-text-color);
                transition: all 0.2s ease;
                padding: 2px;
                flex-shrink: 0;
                opacity: 0.7;
            `;

            this.addEventListeners(button);
            this.button = button;
            return button;
        },

        addEventListeners(button) {
            button.addEventListener('mouseover', () => {
                button.style.color = 'var(--main-text-color)';
            });

            button.addEventListener('mouseout', () => {
                button.style.color = 'var(--muted-text-color)';
            });

            button.addEventListener('click', async () => {
                // Toggle AI chat window display state
                AIChatWidget.active = !AIChatWidget.active;
                this.updateButtonStyle();
                
                // Update chat window
                await AIChatWidget.update();
            });
        },

        updateButtonStyle() {
            if (!this.button) return;
            
            if (AIChatWidget.active) {
                this.button.style.opacity = '1';
                this.button.style.color = 'var(--main-text-color)';
            } else {
                this.button.style.opacity = '0.7';
                this.button.style.color = 'var(--muted-text-color)';
            }
        },

        async update() {
            if (!this.button) {
                const container = window.ButtonManager.getLeftContainer();
                if (container) {
                    this.button = this.createButton();
                    this.button.id = this.id;
                    container.appendChild(this.button);
                }
            }
        }
    };

    // Wait for necessary components to load
    while (!window.RightPaneManager || !window.ButtonManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Initialize chat window
    await AIChatWidget.initialize();

    // Register components
    window.ButtonManager.registerButton(AIChatButton);
    
    // Register update function
    const updateAIChat = async (note) => {
        await AIChatWidget.update();
    };
    
    window.RightPaneManager.constructor.registerChildScript(updateAIChat, AIChatWidget.id, AIChatWidget.priority);
    
})();

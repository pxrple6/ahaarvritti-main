document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const messageInput = document.getElementById('message-input');
    const languageSelect = document.getElementById('language-select');
    const chatWindow = document.getElementById('chat-window');

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const message = messageInput.value.trim();
        const language = languageSelect.value;

        if (!message) return;

        appendMessage(message, 'user');
        messageInput.value = '';

        const loadingMessageElement = appendMessage('...', 'bot', true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message, language }),
            });

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorText = `API call failed with status: ${response.status}`;
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorText = errorData.error || 'An unknown API error occurred.';
                } else {
                    errorText = "Could not connect to the API server. Please ensure it's running.";
                }
                throw new Error(errorText);
            }

            const data = await response.json();
            
            loadingMessageElement.querySelector('p').textContent = data.reply;
            loadingMessageElement.classList.remove('loading');

        } catch (error) {
            console.error('Fetch error:', error);
            loadingMessageElement.querySelector('p').textContent = `Error: ${error.message}`;
            loadingMessageElement.classList.remove('loading');
        }
    });

    function appendMessage(text, sender, isLoading = false) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        if (isLoading) {
            messageWrapper.classList.add('loading');
        }
        const messageParagraph = document.createElement('p');
        messageParagraph.textContent = text;
        messageWrapper.appendChild(messageParagraph);
        chatWindow.appendChild(messageWrapper);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        return messageWrapper;
    }
});
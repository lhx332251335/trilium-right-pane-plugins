(async function() {
    const CloseButton = {
        id: 'close-button',
        position: 'right',
        button: null,
        
        createButton() {
            const button = document.createElement('span');
            button.className = 'bx bx-x-circle';
            button.title = 'Close all right pane content';
            button.style.cssText = `
                cursor: pointer;
                font-size: 20px;
                color: var(--muted-text-color);
                transition: all 0.2s ease;
                padding: 2px;
                flex-shrink: 0;
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
            button.addEventListener('click', () => {
                if (window.RightPaneManager) {
                    window.RightPaneManager.closeAllContent();
                }
            });
        },

        async update(currentNote) {
            if (!this.button) {
                const container = window.ButtonManager.getRightContainer();
                if (container) {
                    this.button = this.createButton();
                    this.button.id = this.id;
                    container.appendChild(this.button);
                }
            }
        }
    };

    while (!window.ButtonManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    window.ButtonManager.registerButton(CloseButton);
})();

(async function () {
    const FoldChaptersButton = {
        id: 'fold-chapters-button',
        position: 'left',
        pressed: false,
        button: null,

        /**
         * Check if the button should be enabled for the current note
         */
        isEnabled(note) {
            return note && note.type === 'text';
        },

        createButton() {
            const button = document.createElement('span');
            button.className = 'bx bx-chevron-down';
            button.title = 'Fold/Unfold Chapters';
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
                this.toggleFold();
            });
        },

        toggleFold() {
            if (!this.button) return;

            this.pressed = !this.pressed;

            if (this.pressed) {
                this.button.classList.remove('bx-chevron-down');
                this.button.classList.add('bx-chevron-up');
                api.showMessage('Fold all chapters');
                this.foldAllHeaders();
            } else {
                this.button.classList.remove('bx-chevron-up');
                this.button.classList.add('bx-chevron-down');
                api.showMessage('Unfold all chapters');
                this.unfoldAllHeaders();
            }
        },

        foldAllHeaders() {
            const noteContent = document.querySelector('.note-detail-editable-text');
            if (!noteContent) return;

            noteContent.querySelectorAll('h2, h3, h4, h5, h6').forEach(header => {
                header.classList.add('collapsed');
                let nextElement = header.nextElementSibling;
                while (nextElement && !/H[2-6]/.test(nextElement.tagName)) {
                    nextElement.style.display = 'none';
                    nextElement = nextElement.nextElementSibling;
                }
            });
        },

        unfoldAllHeaders() {
            const noteContent = document.querySelector('.note-detail-editable-text');
            if (!noteContent) return;

            noteContent.querySelectorAll('h2, h3, h4, h5, h6').forEach(header => {
                header.classList.remove('collapsed');
                let nextElement = header.nextElementSibling;
                while (nextElement && !/H[2-6]/.test(nextElement.tagName)) {
                    nextElement.style.display = '';
                    nextElement = nextElement.nextElementSibling;
                }
            });
        },

        async update(currentNote) {
            this.pressed = false;

            if (!this.isEnabled(currentNote)) {
                if (this.button) {
                    this.button.remove();
                    this.button = null;
                }
                return;
            }

            if (!this.button) {
                const container = window.ButtonManager.getLeftContainer();
                if (container) {
                    this.button = this.createButton();
                    this.button.id = this.id;
                    container.appendChild(this.button);
                }
            } else {
                this.button.classList.remove('bx-chevron-up');
                this.button.classList.add('bx-chevron-down');
            }

            this.unfoldAllHeaders();
        }
    };

    while (!window.ButtonManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    window.ButtonManager.registerButton(FoldChaptersButton);
})();

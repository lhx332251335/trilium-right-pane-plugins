(async function () {
    const FoldQuotesButton = {
        id: 'fold-quotes-button',
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
            button.className = 'bx bx-caret-down';
            button.title = 'Fold/Unfold Quotes';
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
                this.button.classList.remove('bx-caret-down');
                this.button.classList.add('bx-caret-up');
                api.showMessage('Fold all quotes');
                this.foldAllBlockquotes();
            } else {
                this.button.classList.remove('bx-caret-up');
                this.button.classList.add('bx-caret-down');
                api.showMessage('Unfold all quotes');
                this.unfoldAllBlockquotes();
            }
        },

        foldAllBlockquotes() {
            const noteContent = document.querySelector('.note-detail-editable-text');
            if (!noteContent) return;

            noteContent.querySelectorAll('blockquote')
                .forEach(blockquote => blockquote.classList.add('collapsed'));
        },

        unfoldAllBlockquotes() {
            const noteContent = document.querySelector('.note-detail-editable-text');
            if (!noteContent) return;

            noteContent.querySelectorAll('blockquote')
                .forEach(blockquote => blockquote.classList.remove('collapsed'));
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
                this.button.classList.remove('bx-caret-up');
                this.button.classList.add('bx-caret-down');
            }

            this.unfoldAllBlockquotes();
        }
    };

    while (!window.ButtonManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    window.ButtonManager.registerButton(FoldQuotesButton);
})();

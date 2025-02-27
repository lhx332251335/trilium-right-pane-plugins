(async function() {
    const RevisionButton = {
        id: 'revision-button',
        position: 'left',
        currentNoteId: null,
        button: null,
        
        createButton() {
            const button = document.createElement('span');
            button.className = 'bx bx-history';
            button.title = 'Create revision for current note';
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
                this.createRevision();
            });
        },

        async createRevision() {
            if (!this.currentNoteId) {
                api.showError('Unable to get current note ID');
                return;
            }

            try {
                const result = await api.runAsyncOnBackendWithManualTransactionHandling(
                    async (noteId) => {
                        const note = api.getNote(noteId);
                        if (!note) {
                            throw new Error('Note does not exist');
                        }
                        const revision = await note.saveRevision();
                        if (!revision) {
                            throw new Error('Failed to create revision');
                        }
                        return true;
                    },
                    [this.currentNoteId]
                );

                if (result) {
                    api.showMessage('Successfully created revision');
                }
            } catch (error) {
                console.error('Error creating revision:', error);
                api.showError('Failed to create revision');
            }
        },

        async update(currentNote) {
            this.currentNoteId = currentNote ? currentNote.noteId : null;

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

    while (!window.ButtonManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    window.ButtonManager.registerButton(RevisionButton);
})();

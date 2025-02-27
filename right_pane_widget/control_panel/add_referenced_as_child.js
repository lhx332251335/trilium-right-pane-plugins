(async function () {
    const AddReferencesButton = {
        id: 'add-references-button',
        position: 'left',
        button: null,

        /**
         * Check if the button should be enabled for the current note
         */
        isEnabled(note) {
            return note && note.type === 'text';
        },

        createButton() {
            const button = document.createElement('span');
            button.className = 'bx bx-link';
            button.title = 'Add referenced notes as children';
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
                this.addReferencesAsChildren();
            });
        },

        async addReferencesAsChildren() {
            const currentNote = api.getActiveContextNote();
            if (!currentNote) {
                api.showError('No active note found');
                return;
            }

            const currentNoteId = currentNote.noteId;

            try {
                const editor = await api.getActiveContextTextEditor();
                const content = editor.getData();
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');
                const referenceLinks = doc.querySelectorAll('a.reference-link');

                const referencedNoteIds = Array.from(referenceLinks)
                    .map(link => link.getAttribute('href')?.split('/').pop())
                    .filter(id => id);

                if (referencedNoteIds.length === 0) {
                    api.showMessage('No references found in the note.');
                    return;
                }

                const addedNotes = await api.runOnBackend(
                    (currentNoteId, referencedNoteIds) => {
                        let addedNotes = new Map();

                        for (const referencedNoteId of referencedNoteIds) {
                            try {
                                const referencedNote = api.getNote(referencedNoteId);
                                if (referencedNote && !addedNotes.has(referencedNoteId)) {
                                    const parentChild = api.getNote(currentNoteId).getChildNotes();
                                    const isAlreadyChild = parentChild.some(
                                        child => child.noteId === referencedNoteId
                                    );

                                    if (!isAlreadyChild) {
                                        api.ensureNoteIsPresentInParent(
                                            referencedNoteId,
                                            currentNoteId
                                        );
                                        addedNotes.set(referencedNoteId, {
                                            id: referencedNoteId,
                                            title: referencedNote.title
                                        });
                                    }
                                }
                            } catch (error) {
                                console.error(
                                    `Error processing note ${referencedNoteId}:`,
                                    error
                                );
                            }
                        }

                        return Array.from(addedNotes.values());
                    },
                    [currentNoteId, referencedNoteIds]
                );

                if (addedNotes.length > 0) {
                    let message = `Successfully added ${addedNotes.length} new referenced notes as child notes: `;
                    message += addedNotes.map(note => note.title).join(', ');
                    api.showMessage(message);

                    console.log('Newly added child notes:');
                    addedNotes.forEach(note => {
                        console.log(`- ${note.title} (ID: ${note.id})`);
                    });
                } else {
                    api.showMessage('No new referenced notes were added as child notes.');
                }
            } catch (error) {
                console.error('Error adding child notes:', error);
                api.showMessage('Error adding child notes. Please check the console.');
            }
        },

        async update(currentNote) {
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
            }
        }
    };

    while (!window.ButtonManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    window.ButtonManager.registerButton(AddReferencesButton);
})();

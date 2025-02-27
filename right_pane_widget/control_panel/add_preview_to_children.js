(async function () {
    const AddPreviewButton = {
        id: 'add-preview-button',
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
            button.className = 'bx bx-file';
            button.title = 'Add Preview to Children';
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
                this.addPreviewToChildren();
            });
        },

        async addPreviewToChildren() {
            const currentNote = api.getActiveContextNote();
            if (!currentNote) {
                api.showError('No active note found');
                return;
            }

                try {
                    const result = await api.runAsyncOnBackendWithManualTransactionHandling(
                        async (noteId) => {
                            const note = api.getNote(noteId);
                            const childNotes = note.getChildNotes();
                            let modifiedNotes = [];

                            const startDate = note.dateCreated.substring(0, 16);
                            const endDate = note.dateModified.substring(0, 16);

                            const parentTitle = note.title;
                            const newHeader = `<h2>${startDate} ~ ${endDate} ${parentTitle}</h2>`;
                            const insertContent = `<section class="include-note" data-note-id="${noteId}" data-box-size="medium"> &nbsp; </section>`;

                        for (const childNote of childNotes) {
                            if (childNote.type === 'text') {
                                let content = await childNote.getContent();
                                if (!content.includes(`data-note-id="${noteId}"`)) {
                                    const h2Regex = /<h2[\s\S]*?>([\s\S]*?)<\/h2>/g;
                                    const h2Matches = [...content.matchAll(h2Regex)];
                                    let lastDateH2 = null;
                                    let lastDateH2Index = -1;

                                    for (let i = h2Matches.length - 1; i >= 0; i--) {
                                        if (/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(h2Matches[i][1])) {
                                            lastDateH2 = h2Matches[i][0];
                                            lastDateH2Index = h2Matches[i].index;
                                            break;
                                        }
                                    }

                                    if (lastDateH2) {
                                        const afterLastH2 = content.substring(lastDateH2Index + lastDateH2.length);
                                        const hasOnlyEmptyParagraphsAndImages = /^(\s*<p>(\s*<p>)*\s*(&nbsp;|<img[^>]*>)?\s*(<\/p>\s*)*|\s*<figure[^>]*>[\s\S]*?<\/figure>\s*)*$/.test(afterLastH2.trim());

                                        if (hasOnlyEmptyParagraphsAndImages) {
                                            content = content.substring(0, lastDateH2Index) + newHeader;
                                            content += afterLastH2.replace(/(<p>(\s*<p>)*\s*&nbsp;\s*(<\/p>\s*)*)+/g, '');
                                            content += insertContent;
                                        } else {
                                            content += `\n\n${newHeader}\n${insertContent}`;
                                        }
                                    } else {
                                        const hasOnlyEmptyParagraphsAndImagesAtStart = /^(\s*<p>(\s*<p>)*\s*(&nbsp;|<img[^>]*>)?\s*(<\/p>\s*)*|\s*<figure[^>]*>[\s\S]*?<\/figure>\s*)*$/.test(content.trim());
                                        
                                        if (hasOnlyEmptyParagraphsAndImagesAtStart) {
                                            content = `${newHeader}\n` + 
                                                content.replace(/(<p>(\s*<p>)*\s*&nbsp;\s*(<\/p>\s*)*)+/g, '') + 
                                                `\n${insertContent}`;
                                        } else {
                                            content += `\n\n${newHeader}\n${insertContent}`;
                                        }
                                    }

                                    content = content
                                        .replace(/(\n\s*){3,}/g, '\n\n')
                                        .replace(/(<p>(\s*<p>)*\s*&nbsp;\s*(<\/p>\s*)*)+/g, '');

                                    await childNote.setContent(content);
                                    modifiedNotes.push({
                                        id: childNote.noteId,
                                        title: childNote.title
                                    });
                                }
                            }
                        }

                        return {
                            totalChildren: childNotes.length,
                            modifiedNotes: modifiedNotes
                        };
                    },
                    [currentNote.noteId]
                );

                const modifiedCount = result.modifiedNotes.length;
                let message = `Modified ${modifiedCount} out of ${result.totalChildren} child notes.\n\nModified notes:`;
                result.modifiedNotes.forEach(note => {
                    message += `\n- ${note.title}`;
                });

                api.showMessage(message);
                console.log('Modified notes:', result.modifiedNotes);
            } catch (error) {
                console.error('Error adding content to child notes:', error);
                api.showMessage('Error adding content to child notes. Please check the console.');
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

    // 注册按钮
    window.ButtonManager.registerButton(AddPreviewButton);
})();

(async function () {
    const ProcessDocumentButton = {
        id: 'process-document-button',
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
            button.className = 'bx bx-dollar';
            button.title = 'Global Formula Replacement';
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

            button.addEventListener('click', async () => {
                await this.processDocument();
            });
        },

        async processDocument() {
            await convertOlToP();
            await replaceFormulas();
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

    /**
     * Convert ordered lists to paragraphs with numbered markers
     */
    async function convertOlToP() {
        try {
            const editor = await api.getActiveContextTextEditor();
            const data = editor.getData();
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/html');

            doc.querySelectorAll('ol').forEach((ol) => {
                const fragment = doc.createDocumentFragment();
                let index = 1;
                Array.from(ol.children).forEach((li) => {
                    const liChildren = Array.from(li.children);
                    if (!liChildren.some((child) => child.tagName === 'UL')) {
                        const p = doc.createElement('p');
                        p.innerHTML = `(${index}) ${li.innerHTML}`;
                        fragment.appendChild(p);
                        index++;
                    } else {
                        fragment.appendChild(li.cloneNode(true));
                    }
                });
                ol.parentNode.replaceChild(fragment, ol);
            });

            const serializer = new XMLSerializer();
            const convertedData = serializer.serializeToString(doc.body);

            const cleanedData = convertedData
                .replace(/<body>/gi, '')
                .replace(/<\/body>/gi, '')
                .trim();

            editor.setData(cleanedData);
            api.showMessage('Ordered lists have been converted to paragraphs. Unordered lists remain unchanged.');
        } catch (error) {
            console.error('Error converting ordered lists:', error);
            api.showMessage('An error occurred while converting ordered lists.');
        }
    }

    /**
     * Replace LaTeX formulas with properly formatted math spans
     */
    async function replaceFormulas() {
        try {
            const editor = await api.getActiveContextTextEditor();
            const data = editor.getData();

            const regex = /\$\$(.*?)\$\$|\$(.*?)\$/gs;
            let matchFound = false;

            const replacedData = data.replace(regex, (match, p1, p2) => {
                matchFound = true;
                if (p1) {
                    return `<span class="math-tex">\\[${p1.replace(
                        /<br\s*\/?>/gi,
                        ''
                    )}\\]</span>`;
                } else if (p2) {
                    return `<span class="math-tex">\\(${p2.replace(
                        /<br\s*\/?>/gi,
                        ''
                    )}\\)</span>`;
                }
            });

            if (matchFound) {
                editor.setData(replacedData);
                api.showMessage('Formulas have been successfully replaced.');
            } else {
                api.showMessage('No formulas found to replace.');
            }
        } catch (error) {
            console.error('Error replacing formulas:', error);
            api.showMessage('An error occurred while replacing formulas.');
        }
    }

    while (!window.ButtonManager) {
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    window.ButtonManager.registerButton(ProcessDocumentButton);
})();

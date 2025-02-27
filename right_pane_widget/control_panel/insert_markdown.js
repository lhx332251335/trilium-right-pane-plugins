(async function() {
    const InsertMarkdownButton = {
        id: 'insert-md-button',
        button: null,

        /**
         * Check if the button should be enabled for the current note
         */
        isEnabled(note) {
            return note && note.type === 'text';
        },

        createButton() {
            const button = document.createElement('span');
            button.className = 'bx bxl-markdown';
            button.title = 'Insert Markdown';
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
                this.showInputDialog();
            });
        },

        showInputDialog() {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 20px;
                width: 400px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                gap: 15px;
            `;

            const textarea = document.createElement('textarea');
            textarea.placeholder = 'Enter simplified Markdown here. Supports formulas/headings/bold/italic/unordered lists';
            textarea.style.cssText = `
                width: 100%;
                height: 120px;
                padding: 10px;
                border: 1px solid var(--main-border-color);
                border-radius: 4px;
                font-size: 14px;
                resize: none;
                overflow: auto;
            `;

            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = `
                display: flex;
                justify-content: space-between;
                gap: 10px;
            `;

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm';
            confirmBtn.style.cssText = `
                flex: 1;
                padding: 8px;
                background: var(--main-text-color);
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                font-weight: bold;
                cursor: pointer;
            `;
            confirmBtn.addEventListener('click', () => {
                const userInput = textarea.value.trim();
                if (userInput) {
                    const html = this.parseMinimalMarkdown(userInput);
                    this.insertHTMLAtCursor(html);
                } else {
                    api.showError('Please enter Markdown content');
                }
                document.body.removeChild(overlay);
            });

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = `
                flex: 1;
                padding: 8px;
                background: var(--muted-text-color);
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
            `;
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
            });

            btnContainer.appendChild(confirmBtn);
            btnContainer.appendChild(cancelBtn);
            dialog.appendChild(textarea);
            dialog.appendChild(btnContainer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
        },

        parseMinimalMarkdown(md) {
            const formulaRegex = /\$\$(.*?)\$\$|\$(.*?)\$/gs;
            md = md.replace(formulaRegex, (match, p1, p2) => {
                if (p1) {
                    return `<span class="math-tex">\\[${p1.replace(/<br\s*\/?>/gi, '')}\\]</span>`;
                } else if (p2) {
                    return `<span class="math-tex">\\(${p2.replace(/<br\s*\/?>/gi, '')}\\)</span>`;
                }
                return match;
            });

            md = md.replace(/^(#{2,6}) +(.+)$/gm, (match, hashes, title) => {
                const level = hashes.length;
                return `<h${level}>${title}</h${level}>`;
            });

            const listRegex = /^- +(.+)$/gm;
            md = md.replace(listRegex, '<p>• $1</p>');

            const boldRegex = /\*\*(.+?)\*\*/g;
            md = md.replace(boldRegex, '<strong>$1</strong>');

            const italicRegex = /\*(.+?)\*/g;
            md = md.replace(italicRegex, '<em>$1</em>');

            md = md.replace(/^(?!<.*?>)(.+)$/gm, (match, text) => {
                return `<p>${text.trim()}</p>`;
            });

            return md;
        },

        async insertHTMLAtCursor(html) {
            try {
                const editor = await api.getActiveContextTextEditor();
                if (!editor) {
                    api.showError('Current note is not editable');
                    return;
                }
                editor.model.change(writer => {
                    const viewFragment = editor.data.processor.toView(html);
                    const modelFragment = editor.data.toModel(viewFragment);
                    editor.model.insertContent(modelFragment, editor.model.document.selection);
                });

                api.showMessage('Insert successful');
            } catch (err) {
                console.error('Error inserting HTML:', err);
                api.showError('Insert failed');
            }
        },

        async update(currentNote) {
            if (!this.isEnabled(currentNote)) {
                if (this.button) {
                    this.button.style.display = 'none';
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

            if (this.button) {
                this.button.style.display = '';
            }
        }
    };

    while (!window.ButtonManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    window.ButtonManager.registerButton(InsertMarkdownButton);
})();

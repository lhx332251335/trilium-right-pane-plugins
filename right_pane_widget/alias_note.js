(async function() {
    const maxLines = 8; // Maximum number of lines to display by default

    const AliasWidget = {
        id: 'alias-widget',
        priority: 0.5,
        widget: null,
        container: null,
        parentContainer: null,

        createWidget() {
            const widget = document.createElement('div');
            widget.id = this.id;
            widget.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    margin: 2px;
                    margin-bottom: 5px;
                    background: white;
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        padding: 2px 4px;
                        border-bottom: 1px solid var(--main-border-color);
                        border-radius: 6px 6px 0 0;
                        background: var(--accented-background-color);
                    ">
                        <div style="
                            font-size: 16px;
                            font-weight: bold;
                            color: var(--main-text-color);
                        ">Alias Notes List</div>
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
                    <div class="alias-content" style="
                        padding: 2px;
                        border-radius: 0 0 6px 6px;
                        background: white;
                    ">
                    </div>
                </div>
            `;

            const closeButton = widget.querySelector('.close-button');
            closeButton.addEventListener('click', () => {
                this.hideWidget();
            });

            this.widget = widget;
            this.container = widget.querySelector('.alias-content');
            return widget;
        },

        hideWidget() {
            if (this.widget) {
                this.widget.style.display = 'none';
                window.RightPaneManager?.constructor.reportContent(this.id, false);
            }
        },

        /**
         * Generate HTML for alias note card
         */
        async buildNoteHtml(note, isIndirect = false) {
            const contentBlob = await note.getBlob();

            return `
                <div class="alias-note-card" style="
                    margin: 2px 0;
                    padding: 4px 6px;
                    border-left: 2px solid ${isIndirect ? '#aaa' : 'var(--main-border-color)'};
                    background: var(--accented-background-color);
                    border-radius: 3px;
                    margin-bottom: 6px;
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-size: 16px;
                        padding-bottom: 2px;
                    ">
                        <a class="reference-link" 
                           href="#root/${note.noteId}"
                           style="
                               font-weight: 500;
                               flex: 1;
                               overflow: hidden;
                               text-overflow: ellipsis;
                               white-space: nowrap;
                           "
                        >${note.title}</a>
                        <button class="expand-toggle" style="
                            padding: 2px 8px;
                            font-size: 12px;
                            background: none;
                            border: 1px solid var(--muted-text-color);
                            border-radius: 12px;
                            cursor: pointer;
                            color: var(--muted-text-color);
                            transition: all 0.2s ease;
                            opacity: 0.8;
                        ">Expand</button>

                    </div>

                    <div class="rendered-content collapsed" style="
                        font-size: 15px;
                        margin-top: 1px;
                        padding-left: 4px;
                        line-height: 1.4;
                        max-height: calc(${maxLines} * 1.4em);
                        overflow: hidden;
                        transition: max-height 0.2s ease;
                    ">
                        <div class="ck-content">
                            ${contentBlob.content}
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * 递归获取所有别名笔记，避免循环引用
         */
        async getAllAliasNotes(noteId, visited = new Set(), currentNoteId) {
            if (visited.has(noteId)) return new Set();
            visited.add(noteId);

            const note = await api.getNote(noteId);
            if (!note) return new Set();

            const result = new Set();
            const toProcess = new Set([noteId]);
            const processedNotes = new Set(); // 记录已处理过的笔记

            while (toProcess.size > 0) {
                const processId = toProcess.values().next().value;
                toProcess.delete(processId);

                if (processedNotes.has(processId)) continue; // 跳过已处理的笔记
                processedNotes.add(processId);

                const currentNote = await api.getNote(processId);
                if (!currentNote) continue;

                // 获取正向别名
                const forwardRelations = currentNote.getRelations('alias');
                for (const relation of forwardRelations) {
                    if (relation.value !== currentNoteId && !visited.has(relation.value) && !processedNotes.has(relation.value)) {
                        result.add(relation.value);
                        visited.add(relation.value);
                        toProcess.add(relation.value);
                    }
                }

                // 获取反向别名
                const targetRelations = currentNote.getTargetRelations();
                const reverseRelations = targetRelations.filter(rel => rel.name === 'alias');
                for (const relation of reverseRelations) {
                    if (relation.noteId !== currentNoteId && !visited.has(relation.noteId) && !processedNotes.has(relation.noteId)) {
                        result.add(relation.noteId);
                        visited.add(relation.noteId);
                        toProcess.add(relation.noteId);
                    }
                }
            }

            return result;
        },

        /**
         * 构建所有别名笔记的HTML，确保不重复
         */
        async buildAllAliasNotesHtml(currentNote) {
            const processedNotes = new Set();
            let html = '';

            // 处理反向别名
            const targetRelations = currentNote.getTargetRelations();
            const aliasTargetRelations = targetRelations.filter(rel => rel.name === 'alias');
            for (const relation of aliasTargetRelations) {
                const sourceNote = await api.getNote(relation.noteId);
                if (sourceNote && !processedNotes.has(relation.noteId)) {
                    html += await this.buildNoteHtml(sourceNote);
                    processedNotes.add(relation.noteId);

                    // 获取间接别名
                    const indirectAliases = await this.getAllAliasNotes(relation.noteId, new Set([currentNote.noteId]), currentNote.noteId);
                    for (const aliasId of indirectAliases) {
                        if (!processedNotes.has(aliasId)) {
                            const aliasNote = await api.getNote(aliasId);
                            if (aliasNote) {
                                html += await this.buildNoteHtml(aliasNote, true);
                                processedNotes.add(aliasId);
                            }
                        }
                    }
                }
            }

            // 处理正向别名
            const sourceRelations = currentNote.getRelations('alias');
            for (const relation of sourceRelations) {
                const targetNote = await api.getNote(relation.value);
                if (targetNote && !processedNotes.has(relation.value)) {
                    html += await this.buildNoteHtml(targetNote);
                    processedNotes.add(relation.value);

                    // 获取间接别名
                    const indirectAliases = await this.getAllAliasNotes(relation.value, new Set([currentNote.noteId]), currentNote.noteId);
                    for (const aliasId of indirectAliases) {
                        if (!processedNotes.has(aliasId)) {
                            const aliasNote = await api.getNote(aliasId);
                            if (aliasNote) {
                                html += await this.buildNoteHtml(aliasNote, true);
                                processedNotes.add(aliasId);
                            }
                        }
                    }
                }
            }

            return html;
        },

        attachToggleEvents() {
            const cardList = this.container.querySelectorAll('.alias-note-card');
            cardList.forEach(card => {
                const toggleBtn = card.querySelector('.expand-toggle');
                toggleBtn.addEventListener('mouseover', () => {
                    toggleBtn.style.opacity = '1';
                    toggleBtn.style.borderColor = 'var(--main-text-color)';
                    toggleBtn.style.color = 'var(--main-text-color)';
                });

                toggleBtn.addEventListener('mouseout', () => {
                    toggleBtn.style.opacity = '0.8';
                    toggleBtn.style.borderColor = 'var(--muted-text-color)';
                    toggleBtn.style.color = 'var(--muted-text-color)';
                });

                const contentDiv = card.querySelector('.rendered-content');
                if (toggleBtn && contentDiv) {
                    toggleBtn.addEventListener('click', () => {
                        const isCollapsed = contentDiv.classList.contains('collapsed');
                        if (isCollapsed) {
                            contentDiv.classList.remove('collapsed');
                            contentDiv.style.maxHeight = '9999px';
                            toggleBtn.textContent = 'Collapse';
                        } else {
                            contentDiv.classList.add('collapsed');
                            contentDiv.style.maxHeight = `calc(${maxLines} * 1.4em)`;
                            toggleBtn.textContent = 'Expand';
                        }
                    });
                }
            });
        },

        async initialize() {
            this.parentContainer = await window.RightPaneManager.getCustomWidgetsContainer();
            if (!this.parentContainer) return;

            if (!this.widget) {
                this.widget = this.createWidget();
                this.parentContainer.appendChild(this.widget);
            }
        },

        async update(currentNote) {
            if (!this.widget) {
                await this.initialize();
            }

            if (!currentNote) {
                this.hideWidget();
                return;
            }

            if (this.container) {
                this.container.innerHTML = '';
            }
            this.widget.style.display = 'none';

            const targetRelations = currentNote.getTargetRelations();
            const aliasTargetRelations = targetRelations.filter(rel => rel.name === 'alias');
            const sourceRelations = currentNote.getRelations('alias');

            if (aliasTargetRelations.length === 0 && sourceRelations.length === 0) {
                this.hideWidget();
                return;
            }

            const html = await this.buildAllAliasNotesHtml(currentNote);

            if (this.container) {
                this.container.innerHTML = html;
                this.widget.style.display = '';
                window.RightPaneManager?.constructor.reportContent(this.id, true);

                this.attachToggleEvents();
            }
        }
    };

    const waitForParent = async () => {
        while (!window.RightPaneManager) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return window.RightPaneManager;
    };

    const aliasScript = async (currentNote) => {
        await AliasWidget.update(currentNote);
    };

    const parentManager = await waitForParent();
    parentManager.constructor.registerChildScript(aliasScript, AliasWidget.id, AliasWidget.priority);
})();

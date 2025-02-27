(async function() {
    const RelationsWidget = {
        id: 'relations-widget',
        priority: 1,
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
                    margin: 2px ;
                    margin-bottom:5px;
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
                        ">Relations List</div>
                        <span class="bx bx-x close-button" style="
                            cursor: pointer;
                            font-size: 16px;
                            margin-left: auto;
                            padding: 2px;
                            border-radius: 4px;
                            color: var(--muted-text-color);
                            transition: all 0.2s;
                            hover: background-color: rgba(0,0,0,0.05);
                        "></span>
                    </div>
                    <div class="relations-content" style="
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
            this.container = widget.querySelector('.relations-content');
            return widget;
        },

        hideWidget() {
            if (this.widget) {
                this.widget.style.display = 'none';
                window.RightPaneManager?.constructor.reportContent(this.id, false);
            }
        },

        async buildSourceRelationsHtml(currentNote, sourceRelations) {
            if (sourceRelations.length === 0) return '';

            let html = `
                <div style="
                    border-left: 2px solid var(--main-border-color);
                    margin: 2px 0;
                    padding-left: 6px;
                ">
                    <div style="
                        font-size: 16px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: var(--muted-text-color);
                        margin-bottom: 4px;
                    ">Source Relations</div>
            `;

            for (const relation of sourceRelations) {
                const targetNote = await api.getNote(relation.targetNoteId);

                if (targetNote) {
                    html += `
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 4px;
                            font-size: 15px;
                            padding: 1px 0;
                        ">
                            <span style="
                                color: var(--muted-text-color);
                                font-size: 15px;
                                min-width: 50px;
                            ">${relation.name}:</span>
                            <a class="reference-link" href="#root/${targetNote.noteId}"
                                style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                            >${targetNote.title}</a>
                        </div>
                    `;
                }
            }
            html += '</div>';
            return html;
        },

        async buildTargetRelationsHtml(targetRelations, hasSourceRelations) {
            if (targetRelations.length === 0) return '';

            let html = `
            <div style="
                position: relative;
                border-left: 2px solid var(--main-border-color);
                margin: 2px 0;
                padding-left: 6px;
            ">
                ${hasSourceRelations ? `
                <div style="
                    position: absolute;
                    top: -1px;
                    left: -12px;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(to right, 
                        transparent,
                        var(--main-border-color) 10%,
                        var(--main-border-color) 90%,
                        transparent
                    );
                    opacity: 0.5;
                "></div>
                ` : ''}

                <div style="
                    font-size: 16px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--muted-text-color);
                    margin: 2px 0 4px 0;
                ">Target Relations</div>
        `;

            for (const relation of targetRelations) {
                const sourceNote = await api.getNote(relation.noteId);
                if (sourceNote) {
                    html += `
                        <div style="
                            display: flex;
                            align-items: center;
                            gap: 4px;
                            font-size: 15px;
                            padding: 1px 0;
                        ">
                            <span style="
                                color: var(--muted-text-color);
                                font-size: 15px;
                                min-width: 50px;
                            ">${relation.name}:</span>
                            <a class="reference-link" href="#root/${sourceNote.noteId}"
                                style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                            >${sourceNote.title}</a>
                        </div>
                    `;
                }
            }
            html += '</div>';
            return html;
        },

        async update(currentNote) {
            if (!this.widget) {
                await this.initialize();
            }

            if (!currentNote) {
                this.hideWidget();
                return;
            }

            const isProtectedSession = window.glob.isProtectedSessionAvailable;
            const isNoteProtected = currentNote.isProtected;
            if (!isProtectedSession && isNoteProtected) {
                this.hideWidget();
                return;
            }

            if (currentNote.noteId==='root') {
                this.hideWidget();
                return;
            }

            const sourceRelations = this.filterRelations(currentNote.getRelations());
            const targetRelations = this.filterRelations(currentNote.getTargetRelations());

            if (sourceRelations.length === 0 && targetRelations.length === 0) {
                this.hideWidget();
                return;
            }

            const [sourceHtml, targetHtml] = await Promise.all([
                this.buildSourceRelationsHtml(currentNote, sourceRelations),
                this.buildTargetRelationsHtml(targetRelations, sourceRelations.length > 0)
            ]);

            if (this.container) {
                this.container.innerHTML = sourceHtml + targetHtml;
                this.widget.style.display = '';
                window.RightPaneManager?.constructor.reportContent(this.id, true);
            }
        },

        filterRelations(relations) {
            return relations.filter(rel => 
                !rel.name.includes('template') &&
                !rel.name.includes('Link') &&
                !rel.name.includes('renderNote') &&
                !rel.name.includes('runOn')
            );
        },

        async initialize() {
            this.parentContainer = await window.RightPaneManager.getCustomWidgetsContainer();
            if (!this.parentContainer) return;

            if (!this.widget) {
                this.widget = this.createWidget();
                this.parentContainer.appendChild(this.widget);
            }
        },
    };

    const waitForParent = async () => {
        while (!window.RightPaneManager) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return window.RightPaneManager;
    };

    const relationsScript = async (currentNote) => {
        await RelationsWidget.update(currentNote);
    };

    const parentManager = await waitForParent();
    parentManager.constructor.registerChildScript(relationsScript, RelationsWidget.id, RelationsWidget.priority);
})();

(async function() {
    const HistoryWidget = {
        id: 'history-widget',
    	priority: 2,
        widget: null,
        container: null,
        parentContainer: null,
        visitHistory: [],
        MAX_HISTORY_LENGTH: 20, // Maximum number of history entries to keep

        createWidget() {
            const widget = document.createElement('div');
            widget.id = this.id;
            widget.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    margin: 2px;
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
                        ">Recent Visits</div>
                        <span class="bx bx-trash clear-button" style="
                            cursor: pointer;
                            font-size: 16px;
                            margin-left: auto;
                            padding: 2px;
                            margin-right: 4px;
                            border-radius: 4px;
                            color: var(--muted-text-color);
                            transition: all 0.2s;
                        "></span>
                        <span class="bx bx-x close-button" style="
                            cursor: pointer;
                            font-size: 16px;
                            padding: 2px;
                            border-radius: 4px;
                            color: var(--muted-text-color);
                            transition: all 0.2s;
                        "></span>
                    </div>
                    <div class="history-content" style="
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

            const clearButton = widget.querySelector('.clear-button');
            clearButton.addEventListener('click', () => {
                this.visitHistory = [];
                this.container.innerHTML = '';
            });

            this.widget = widget;
            this.container = widget.querySelector('.history-content');
            return widget;
        },

        hideWidget() {
            if (this.widget) {
                this.widget.style.display = 'none';
                window.RightPaneManager?.constructor.reportContent(this.id, false);
            }
        },

        updateHistory(note) {
            const isProtectedSession = window.glob.isProtectedSessionAvailable;
            if (!isProtectedSession && note.isProtected) {
                return;
            }

            this.visitHistory = this.visitHistory.filter(item => item.noteId !== note.noteId);
            
            this.visitHistory.unshift({
                noteId: note.noteId,
                title: note.title,
                timestamp: Date.now()
            });

            if (this.visitHistory.length > this.MAX_HISTORY_LENGTH) {
                this.visitHistory = this.visitHistory.slice(0, this.MAX_HISTORY_LENGTH);
            }
        },

        renderHistory() {
            if (!this.container || this.visitHistory.length === 0) return;

            const historyHtml = `
                <div style="
                    display: flex;
                    flex-wrap: wrap;
                    gap: 2px;
                    padding: 2px;
                ">
                    ${this.visitHistory.map((item, index) => `
                        <div style="
                            flex: 0 1 auto;
                            display: flex;
                            align-items: center;
                            gap: 2px;
                            padding: 1px 6px;
                        ">
                            <span style="
                                color: var(--muted-text-color);
                            ">${index + 1}.</span>
                            <a class="reference-link" 
                               href="#root/${item.noteId}"
                               style="
                                   overflow: hidden;
                                   text-overflow: ellipsis;
                                   white-space: nowrap;
                               "
                            >${item.title}</a>
                        </div>
                    `).join('')}
                </div>
            `;

            this.container.innerHTML = historyHtml;
            this.widget.style.display = '';
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

            const isProtectedSession = window.glob.isProtectedSessionAvailable;
            const isNoteProtected = currentNote.isProtected;
            if (!isProtectedSession && isNoteProtected) {
                this.hideWidget();
                return;
            }

            this.updateHistory(currentNote);

            if (this.visitHistory.length === 0) {
                this.hideWidget();
                return;
            }

            this.renderHistory();
            
            window.RightPaneManager?.constructor.reportContent(this.id, true);
        }
    };

    const waitForParent = async () => {
        while (!window.RightPaneManager) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return window.RightPaneManager;
    };

    const historyScript = async (currentNote) => {
        await HistoryWidget.update(currentNote);
    };

    const parentManager = await waitForParent();
    parentManager.constructor.registerChildScript(historyScript,HistoryWidget.id,HistoryWidget.priority);
})();

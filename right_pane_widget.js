class RightPaneManagerWidget extends api.NoteContextAwareWidget {
    static instance = null;
    static contentStatus = {};
    static registeredScripts = [];
    static registeredRealtimeWidgets = new Map();
    static lastNoteId = null;
    static widgetPriorities = new Map();
    static sortTimer = null;
    static hasSorted = false;

    constructor() {
        super();
        if (RightPaneManagerWidget.instance) {
            return RightPaneManagerWidget.instance;
        }
        RightPaneManagerWidget.instance = this;
        window.RightPaneManager = this;
        this.rightPane = null;
        return RightPaneManagerWidget.instance;
    }

    /**
     * Create console container that always stays at the top
     */
    initConsoleContainer() {
        if (!this.rightPane) return null;

        let consoleContainer = this.rightPane.querySelector('#console-container');
        if (!consoleContainer) {
            consoleContainer = document.createElement('div');
            consoleContainer.id = 'console-container';
            consoleContainer.style.cssText = `
                position: sticky;
                top: 0;
                z-index: 100;
                background: var(--accented-background-color);
                border-bottom: 1px solid var(--main-border-color);
                box-sizing: border-box;
            `;
            const firstChild = this.rightPane.firstChild;
            this.rightPane.insertBefore(consoleContainer, firstChild);
        }
        return consoleContainer;
    }

    /**
     * Create child plugin container for scrollable content
     */
    initChildContainer() {
        if (!this.rightPane) return null;

        let customWidgetsContainer = this.rightPane.querySelector('#custom-widgets-container');
        if (!customWidgetsContainer) {
            customWidgetsContainer = document.createElement('div');
            customWidgetsContainer.id = 'custom-widgets-container';
            customWidgetsContainer.style.cssText = `
                margin: 0;
            `;
            const firstChild = this.rightPane.firstChild;
            const nextSibling = firstChild.nextSibling;

            if (nextSibling) {
                this.rightPane.insertBefore(customWidgetsContainer, nextSibling);
            } else {
                this.rightPane.appendChild(customWidgetsContainer);
            }
        }
        return customWidgetsContainer;
    }

    /**
     * Sort widgets in child container
     */
    sortCustomWidgets() {
        const container = this.getCustomWidgetsContainer();
        if (!container) return;

        const widgets = Array.from(container.children);

        widgets.sort((a, b) => {
            const priorityA = RightPaneManagerWidget.widgetPriorities.has(a.id) 
                ? RightPaneManagerWidget.widgetPriorities.get(a.id)
                : 999;
            const priorityB = RightPaneManagerWidget.widgetPriorities.has(b.id)
                ? RightPaneManagerWidget.widgetPriorities.get(b.id) 
                : 999;
            return priorityA - priorityB;
        });

        widgets.forEach(widget => {
            container.appendChild(widget);
        });
    }

    /**
     * Debounced function to trigger sorting
     */
    debouncedSort() {
        if (RightPaneManagerWidget.sortTimer) {
            clearTimeout(RightPaneManagerWidget.sortTimer);
        }

        const container = this.getCustomWidgetsContainer();
        if (!container) return;

        const currentChildren = Array.from(container.children).map(child => child.id);
        const currentSnapshot = currentChildren.join(',');

        RightPaneManagerWidget.sortTimer = setTimeout(() => {
            const newChildren = Array.from(container.children).map(child => child.id);
            const newSnapshot = newChildren.join(',');

            if (currentSnapshot === newSnapshot) {
                this.sortCustomWidgets();
                RightPaneManagerWidget.sortTimer = null;
            } else {
                this.debouncedSort();
            }
        }, 100);
    }

    /**
     * Close all content: official widgets + custom child nodes
     */
    closeAllContent() {
        if (!this.rightPane) return;

        const officialWidgets = this.rightPane.querySelectorAll('.card.widget.component');
        officialWidgets.forEach(widget => {
            if (!widget.classList.contains('hidden-int')) {
                widget.classList.add('hidden-int');
            }
        });

        Object.keys(RightPaneManagerWidget.contentStatus).forEach(widgetId => {
            const widget = this.rightPane.querySelector(`#${widgetId}`);
            if (widget) {
                widget.style.display = 'none';
            }
            RightPaneManagerWidget.contentStatus[widgetId] = false;
        });

        this.checkAndHideRightPane();
    }

    get position() { return 0; }

    get parentWidget() { return 'right-pane'; }

    async doRender() {
        this.$widget = $('<div style="display:none;"></div>');
        await this.waitForComponentInitialization();
        return this.$widget;
    }

    /**
     * Wait for right-pane initialization
     */
    async waitForComponentInitialization() {
        return new Promise(resolve => {
            const checkComponent = () => {
                const rightPane = document.querySelector('#right-pane');
                if (rightPane && rightPane.getAttribute('data-component-id')) {
                    this.rightPane = rightPane;
                    this.initConsoleContainer();
                    this.initChildContainer();
                    resolve();
                } else {
                    setTimeout(checkComponent, 50);
                }
            };
            checkComponent();
        });
    }

    /**
     * Main logic when note changes
     */
    async refreshWithNote(note) {
        if (!note || RightPaneManagerWidget.lastNoteId === note.noteId) return;
        
        RightPaneManagerWidget.lastNoteId = note.noteId;
        const childPromises = RightPaneManagerWidget.registeredScripts.map(script => script(note));
        await Promise.all(childPromises);

        if (!RightPaneManagerWidget.hasSorted) {
            this.debouncedSort();
            RightPaneManagerWidget.hasSorted = true;
           
        }

        setTimeout(() => {
            this.checkAndHideRightPane();
        }, 50);
    }

    /**
     * Register child script (legacy way), only called when switching notes
     */
    static registerChildScript(script, widgetId, priority = 999) {
        if (typeof script === 'function') {
            RightPaneManagerWidget.registeredScripts.push(script);
            RightPaneManagerWidget.widgetPriorities.set(widgetId, priority);
            if (RightPaneManagerWidget.instance?.getCustomWidgetsContainer()) {
                RightPaneManagerWidget.instance.debouncedSort();
            } else {
                const checkAndSort = () => {
                    if (RightPaneManagerWidget.instance?.getCustomWidgetsContainer()) {
                        RightPaneManagerWidget.instance.debouncedSort();
                    } else {
                        setTimeout(checkAndSort, 50);
                    }
                };
                checkAndSort();
            }
        }
    }

    /**
     * New: Register realtime updating widget
     * watchContent: whether to monitor note content changes
     * watchAttributes: whether to monitor metadata changes
     */
    static registerRealtimeWidget(widgetId, {
        update,
        watchContent,
        watchAttributes
    }) {
        if (!RightPaneManagerWidget.registeredRealtimeWidgets) {
            RightPaneManagerWidget.registeredRealtimeWidgets = new Map();
        }
        RightPaneManagerWidget.registeredRealtimeWidgets.set(widgetId, {
            update,
            watchContent,
            watchAttributes
        });

        if (RightPaneManagerWidget.instance?.getCustomWidgetsContainer()) {
            RightPaneManagerWidget.instance.debouncedSort();
        } else {
            const checkAndSort = () => {
                if (RightPaneManagerWidget.instance?.getCustomWidgetsContainer()) {
                    RightPaneManagerWidget.instance.debouncedSort();
                } else {
                    setTimeout(checkAndSort, 50);
                }
            };
            checkAndSort();
        }
    }

    /**
     * Automatically called when note content or attributes change, can be used for real-time updates
     */
    async entitiesReloadedEvent({ loadResults }) {
        const currentNoteId = RightPaneManagerWidget.lastNoteId;
        if (!currentNoteId) return;

        for (const [widgetId, config] of RightPaneManagerWidget.registeredRealtimeWidgets) {
            let needUpdate = false;

            if (config.watchContent && loadResults.isNoteContentReloaded(currentNoteId)) {
                needUpdate = true;
            }
            if (config.watchAttributes && loadResults.isNoteMetadataReloaded(currentNoteId)) {
                needUpdate = true;
            }

            if (needUpdate && typeof config.update === 'function') {
                const note = await api.getNote(currentNoteId);
                await config.update(note);
            }
        }
    }

    /**
     * Report whether child node has content
     */
    static reportContent(widgetId, hasContent) {
        RightPaneManagerWidget.contentStatus[widgetId] = hasContent;
        if (window.RightPaneManager) {
            window.RightPaneManager.checkAndHideRightPane();
        }
    }

    /**
     * Check if there are official widgets displayed
     */
    checkOfficialWidgets() {
        if (!this.rightPane) return false;
        const widgets = this.rightPane.querySelectorAll('.card.widget.component');
        for (let i = 0; i < widgets.length; i++) {
            if (!widgets[i].classList.contains('hidden-int')) {
                return true;
            }
        }
        return false;
    }

    /**
     * Hide or show right pane based on whether child nodes/official widgets have content
     */
    checkAndHideRightPane() {
        if (!this.rightPane) {
            this.rightPane = document.querySelector('#right-pane[data-component-id]');
            if (!this.rightPane) return;
            this.rightPane.style.transition = 'max-width 0.2s ease-in-out, width 0.2s ease-in-out, padding 0.2s ease-in-out';
        }
        if (!this.rightPane) return;

        const hasCustomContent = Object.values(RightPaneManagerWidget.contentStatus).some(status => status);
        const hasOfficialContent = this.checkOfficialWidgets();

        if (hasCustomContent || hasOfficialContent) {
            this.rightPane.style.maxWidth = '100vh';
            this.rightPane.style.padding = '';
        } else {
            this.rightPane.style.maxWidth = '0';
            this.rightPane.style.padding = '0';
        }
    }

    getRightPane() {
        return this.rightPane;
    }

    getConsoleContainer() {
        return this.rightPane?.querySelector('#console-container');
    }

    getCustomWidgetsContainer() {
        return this.rightPane?.querySelector('#custom-widgets-container');
    }

    static getContainers() {
        if (!RightPaneManagerWidget.instance) return null;
        return {
            rightPane: RightPaneManagerWidget.instance.getRightPane(),
            consoleContainer: RightPaneManagerWidget.instance.getConsoleContainer(),
            customWidgetsContainer: RightPaneManagerWidget.instance.getCustomWidgetsContainer()
        };
    }
}

module.exports = new RightPaneManagerWidget();

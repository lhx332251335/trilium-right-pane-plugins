(async function() {
    const widgetId = 'button-manager-widget';
    let registeredButtons = [];
    let buttonManager = null;
    let leftContainer = null;
    let rightContainer = null;
    let priority = 0;

    const createContainer = () => {
        buttonManager = document.createElement('div');
        buttonManager.id = 'button-manager-widget';
        buttonManager.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 2px;
            width: 100%;
            box-sizing: border-box;
            padding: 5px;
        `;

        leftContainer = document.createElement('div');
        leftContainer.id = 'button-container-left';
        leftContainer.style.cssText = `
            display: flex;
            gap: 5px;
            align-items: center;
            flex-wrap: wrap;
            flex: 1;
            min-width: 0;
        `;

        rightContainer = document.createElement('div');
        rightContainer.id = 'button-container-right';
        rightContainer.style.cssText = `
            display: flex;
            align-items: center;
            margin-left: auto;
        `;

        buttonManager.appendChild(leftContainer);
        buttonManager.appendChild(rightContainer);
        return buttonManager;
    };

    /**
     * Main logic for button manager
     */
    const buttonManagerScript = async (currentNote) => {
        if (!currentNote) {
            window.RightPaneManager?.constructor.reportContent(widgetId, false);
            return;
        }

        const isProtectedSession = window.glob.isProtectedSessionAvailable;
        const isNoteProtected = currentNote.isProtected;

        const consoleContainer = window.RightPaneManager.getConsoleContainer();
        if (!consoleContainer) return;

        if (!buttonManager) {
            buttonManager = createContainer();
            buttonManager.id = widgetId;
            consoleContainer.appendChild(buttonManager);
        }

        for (const button of registeredButtons) {
            await button.update(currentNote);
        }

        if (!isProtectedSession && isNoteProtected) {
            window.RightPaneManager?.constructor.reportContent(widgetId, false);
            return;
        }

        window.RightPaneManager?.constructor.reportContent(widgetId, true);
        buttonManager.style.display = 'flex';
    };

    /**
     * Interface provided for buttons
     */
    window.ButtonManager = {
        registerButton(button) {
            registeredButtons.push(button);
        },
        getLeftContainer() {
            return leftContainer;
        },
        getRightContainer() {
            return rightContainer;
        },
        getRightPane() {
            return window.RightPaneManager?.getRightPane();
        },
        getContainers() {
            return {
                buttonManager,
                leftContainer,
                rightContainer,
                rightPane: this.getRightPane(),
                consoleContainer: window.RightPaneManager?.getConsoleContainer(),
                customWidgetsContainer: window.RightPaneManager?.getCustomWidgetsContainer()
            };
        }
    };

    const waitForParent = async () => {
        while (!window.RightPaneManager) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return window.RightPaneManager;
    };

    const parentManager = await waitForParent();
    parentManager.constructor.registerChildScript(buttonManagerScript, widgetId, priority);
})();

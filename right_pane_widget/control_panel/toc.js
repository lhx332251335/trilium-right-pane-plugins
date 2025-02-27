(async function() {
    const TocButton = {
        id: 'toc-button',
        position: 'left',
        observer: null,
        button: null,
        hasInitialToc: false,
        currentCheckTimer: null,
        lastCheckResult: false,

        createButton() {
            const button = document.createElement('span');
            button.className = 'bx bx-list-ul';
            button.title = 'Show/Hide Table of Contents';
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
                if (!button.classList.contains('disabled')) {
                    button.style.color = 'var(--main-text-color)';
                }
            });

            button.addEventListener('mouseout', () => {
                if (!button.classList.contains('disabled')) {
                    button.style.color = 'var(--muted-text-color)';
                }
            });

            button.addEventListener('click', () => {
                this.toggleToc();
                this.updateButtonStyle();
            });
        },

        toggleToc() {
            const rightPane = window.ButtonManager.getRightPane();
            if (!rightPane) return;

            const widgets = rightPane.querySelectorAll('.card.widget.component');
            widgets.forEach(widget => {
                const headerTitle = widget.querySelector('.card-header-title');
                if (headerTitle && headerTitle.textContent === 'Table of Contents') {
                    widget.classList.toggle('hidden-int');
                }
            });
        },

        checkTocVisible() {
            const rightPane = window.ButtonManager.getRightPane();
            if (!rightPane) return false;

            const tocWidget = Array.from(
                rightPane.querySelectorAll('.card.widget.component')
            ).find(widget => {
                const title = widget.querySelector('.card-header-title');
                return title && title.textContent === 'Table of Contents';
            });

            return tocWidget && !tocWidget.classList.contains('hidden-int');
        },

        updateButtonVisibility(isVisible) {
            if (this.button) {
                this.button.style.display = isVisible ? '' : 'none';
                if (isVisible) {
                    this.updateButtonStyle();
                }
            }
        },

        startTocCheck() {
            const KEEP_STATE_TIME = 1000;

            this.updateButtonVisibility(this.lastCheckResult);

            setTimeout(() => {
                const isVisible = this.checkTocVisible();
                if (!isVisible) {
                    this.lastCheckResult = false;
                    this.updateButtonVisibility(false);
                }
            }, KEEP_STATE_TIME);
        },

        updateButtonStyle() {
            if (!this.button || !this.hasInitialToc) return;

            const tocVisible = this.checkTocVisible();
            this.button.style.color = tocVisible ? 'var(--main-text-color)' : 'var(--muted-text-color)';
            this.button.style.opacity = tocVisible ? '1' : '0.5';
        },

        setupObserver() {
            if (this.observer) {
                this.observer.disconnect();
            }

            const rightPane = window.ButtonManager.getRightPane();
            if (!rightPane) return;

            const tocWidget = Array.from(
                rightPane.querySelectorAll('.card.widget.component')
            ).find(widget => {
                const title = widget.querySelector('.card-header-title');
                return title && title.textContent === 'Table of Contents';
            });

            if (!tocWidget) return;

            this.observer = new MutationObserver((mutations) => {
                const hasToc = !tocWidget.classList.contains('hidden-int');

                if (hasToc && !this.lastCheckResult) {
                    this.lastCheckResult = true;
                    this.updateButtonVisibility(true);
                }

                if (this.button && this.lastCheckResult) {
                    this.button.style.color = hasToc ? 'var(--main-text-color)' : 'var(--muted-text-color)';
                    this.button.style.opacity = hasToc ? '1' : '0.5';
                }
            });

            this.observer.observe(tocWidget, {
                attributes: true,
                attributeFilter: ['class']
            });
        },

        async update(currentNote) {
            if (!this.button) {
                const container = window.ButtonManager.getLeftContainer();
                if (container) {
                    this.button = this.createButton();
                    this.button.id = this.id;
                    container.appendChild(this.button);
                }
            }

            this.startTocCheck();
            this.setupObserver();
        }
    };

    while (!window.ButtonManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    window.ButtonManager.registerButton(TocButton);
})();
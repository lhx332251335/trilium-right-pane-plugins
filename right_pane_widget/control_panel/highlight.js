(async function() {
    const HighlightButton = {
        id: 'highlight-button',
        position: 'left',
        observer: null,
        button: null,
        lastCheckResult: false,

        createButton() {
            const button = document.createElement('span');
            button.className = 'bx bx-highlight';
            button.title = 'Show/Hide Highlights';
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
                this.toggleHighlights();
            });
        },

        toggleHighlights() {
            const rightPane = window.ButtonManager.getRightPane();
            if (!rightPane) return;

            const widgets = rightPane.querySelectorAll('.card.widget.component');
            widgets.forEach(widget => {
                const headerTitle = widget.querySelector('.card-header-title');
                if (headerTitle && headerTitle.textContent === 'Highlights List') {
                    widget.classList.toggle('hidden-int');
                }
            });
        },

        checkHighlightVisible() {
            const rightPane = window.ButtonManager.getRightPane();
            if (!rightPane) return false;

            const highlightWidget = Array.from(
                rightPane.querySelectorAll('.card.widget.component')
            ).find(widget => {
                const title = widget.querySelector('.card-header-title');
                return title && title.textContent === 'Highlights List';
            });

            return highlightWidget && !highlightWidget.classList.contains('hidden-int');
        },

        updateButtonVisibility(isVisible) {
            if (this.button) {
                this.button.style.display = isVisible ? '' : 'none';
                if (isVisible) {
                    const highlightVisible = this.checkHighlightVisible();
                    this.button.style.color = highlightVisible ? 'var(--main-text-color)' : 'var(--muted-text-color)';
                    this.button.style.opacity = highlightVisible ? '1' : '0.5';
                }
            }
        },

        startHighlightCheck() {
            const KEEP_STATE_TIME = 1000;

            this.updateButtonVisibility(this.lastCheckResult);

            setTimeout(() => {
                const isVisible = this.checkHighlightVisible();
                if (!isVisible) {
                    this.lastCheckResult = false;
                    this.updateButtonVisibility(false);
                }
            }, KEEP_STATE_TIME);
        },

        setupObserver() {
            if (this.observer) {
                this.observer.disconnect();
            }

            const rightPane = window.ButtonManager.getRightPane();
            if (!rightPane) return;

            const highlightWidget = Array.from(
                rightPane.querySelectorAll('.card.widget.component')
            ).find(widget => {
                const title = widget.querySelector('.card-header-title');
                return title && title.textContent === 'Highlights List';
            });

            if (!highlightWidget) return;

            this.observer = new MutationObserver((mutations) => {
                const hasHighlight = !highlightWidget.classList.contains('hidden-int');
                
                if (hasHighlight && !this.lastCheckResult) {
                    this.lastCheckResult = true;
                    this.updateButtonVisibility(true);
                }
                
                if (this.button && this.lastCheckResult) {
                    this.button.style.color = hasHighlight ? 'var(--main-text-color)' : 'var(--muted-text-color)';
                    this.button.style.opacity = hasHighlight ? '1' : '0.5';
                }
            });

            this.observer.observe(highlightWidget, {
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

            this.startHighlightCheck();
            this.setupObserver();
        }
    };

    while (!window.ButtonManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    window.ButtonManager.registerButton(HighlightButton);
})();

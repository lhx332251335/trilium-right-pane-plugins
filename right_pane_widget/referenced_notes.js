(async function() {
    ////////////////////////////////////////////////////////////////////////
    // 1. Reference List Plugin for Right Sidebar
    ////////////////////////////////////////////////////////////////////////

    const CrossReferencePlugin = {
        id: 'cross-reference-widget',
        priority: 1.5,     // Priority for display order in right sidebar
        active: true,      // Whether currently enabled (initially disabled)
        widget: null,      
        container: null,   
        parentContainer: null,
        lastRefs: null,    

        // 快捷键相关
        shortcut: null,
        shortcutDialog: null,
        currentSortedRefs: null, // 存储当前引用列表
        currentPage: 0, // 当前页码
        itemsPerPage: 26, // 每页显示的引用数量

        // 创建快捷键选择对话框
        createShortcutDialog() {
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 1000;
                display: none;
            `;
            dialog.setAttribute('tabindex', '-1'); // 使对话框可获得焦点
            document.body.appendChild(dialog);
            this.shortcutDialog = dialog;
            return dialog;
        },

        // 显示引用选择对话框
        async showReferenceSelector() {
            if (!this.shortcutDialog) {
                this.createShortcutDialog();
            }

            const note = api.getActiveContextNote();
            if (!note) return;

            // 获取最新的引用列表
            const blob = await note.getBlob();
            const doc = new DOMParser().parseFromString(blob.content, 'text/html');
            const links = doc.querySelectorAll('a.reference-link');

            if (!links || links.length === 0) return;

            const refMap = new Map();
            links.forEach((linkEl, idx) => {
                const href = linkEl.getAttribute('href') || '';
                if (!href) return;

                refMap.set(href, {
                    text: linkEl.textContent || '[Untitled]',
                    finalPos: idx
                });
            });

            this.currentSortedRefs = Array.from(refMap.entries())
                .map(([href, info]) => ({ href, text: info.text, finalPos: info.finalPos }))
                .sort((a, b) => a.finalPos - b.finalPos);

            this.currentPage = 0;
            this.renderReferencePage();
        },

        // 渲染当前页的引用列表
        renderReferencePage() {
            const keys = 'qwertyuiopasdfghjklzxcvbnm';
            const totalPages = Math.ceil(this.currentSortedRefs.length / this.itemsPerPage);
            const startIndex = this.currentPage * this.itemsPerPage;
            const endIndex = Math.min(startIndex + this.itemsPerPage, this.currentSortedRefs.length);
            const currentPageRefs = this.currentSortedRefs.slice(startIndex, endIndex);

            let html = '<div style="max-height: 50vh; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding: 4px;">';
            
            // 引用列表
            html += '<div style="display: flex; flex-wrap: wrap; gap: 4px;">';
            currentPageRefs.forEach((ref, index) => {
                html += `
                    <div class="ref-item" data-index="${startIndex + index}" style="
                        padding: 5px;
                        border-radius: 4px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        background: var(--accented-background-color);
                    ">
                        <span style="
                            background: #eee;
                            padding: 2px 8px;
                            border-radius: 3px;
                            font-weight: bold;
                            flex-shrink: 0;
                        ">${keys[index]}</span>
                        <a href="${ref.href}" style="
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        ">${ref.text}</a>
                    </div>
                `;
            });
            html += '</div>';

            // 如果有多页，显示翻页提示和按钮
            if (totalPages > 1) {
                html += `
                    <div style="
                        margin-top: 8px;
                        padding: 4px;
                        background: #f5f5f5;
                        border-radius: 4px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 10px;
                    ">
                        <button class="prev-page" style="
                            padding: 2px 8px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            cursor: pointer;
                            ${this.currentPage === 0 ? 'opacity: 0.5;' : ''}
                        ">上一页</button>
                        <span>页码: ${this.currentPage + 1}/${totalPages}</span>
                        <button class="next-page" style="
                            padding: 2px 8px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            cursor: pointer;
                            ${this.currentPage >= totalPages - 1 ? 'opacity: 0.5;' : ''}
                        ">下一页</button>
                        <span style="font-size: 11px;">(使用 , 和 . 键翻页)</span>
                    </div>
                `;
            }

            html += '</div>';

            // 移除之前的事件监听器
            if (this.shortcutDialog._keyHandler) {
                this.shortcutDialog.removeEventListener('keydown', this.shortcutDialog._keyHandler);
            }
            if (this.shortcutDialog._clickHandler) {
                document.removeEventListener('click', this.shortcutDialog._clickHandler);
            }

            this.shortcutDialog.innerHTML = html;
            this.shortcutDialog.style.display = 'block';
            this.shortcutDialog.focus();

            // 添加翻页按钮事件监听
            if (totalPages > 1) {
                const prevButton = this.shortcutDialog.querySelector('.prev-page');
                const nextButton = this.shortcutDialog.querySelector('.next-page');
                
                prevButton.addEventListener('click', () => {
                    if (this.currentPage > 0) {
                        this.currentPage--;
                        this.renderReferencePage();
                    }
                });
                
                nextButton.addEventListener('click', () => {
                    if (this.currentPage < totalPages - 1) {
                        this.currentPage++;
                        this.renderReferencePage();
                    }
                });
            }

            // 添加点击事件监听
            const refItems = this.shortcutDialog.querySelectorAll('.ref-item');
            refItems.forEach(item => {
                item.addEventListener('click', () => {
                    const index = parseInt(item.dataset.index);
                    const ref = this.currentSortedRefs[index];
                    this.insertReference(ref);
                    this.shortcutDialog.style.display = 'none';
                });
            });

            // 添加键盘事件监听
            const keyHandler = (e) => {
                // 处理 Backspace 和 Esc 键关闭对话框
                if (e.key === 'Backspace' || e.key === 'Escape') {
                    this.shortcutDialog.style.display = 'none';
                    document.removeEventListener('keydown', keyHandler);
                    return;
                }

                // 处理翻页
                if (totalPages > 1) {
                    if (e.key === ',') {
                        if (this.currentPage > 0) {
                            this.currentPage--;
                            this.renderReferencePage();
                        }
                        e.preventDefault();
                        return;
                    }
                    if (e.key === '.') {
                        if (this.currentPage < totalPages - 1) {
                            this.currentPage++;
                            this.renderReferencePage();
                        }
                        e.preventDefault();
                        return;
                    }
                }

                // 处理快捷键选择
                const index = keys.indexOf(e.key.toLowerCase());
                if (index !== -1 && index < currentPageRefs.length) {
                    const ref = currentPageRefs[index];
                    if (this.shortcutDialog.style.display !== 'none') {
                        this.insertReference(ref);
                        this.shortcutDialog.style.display = 'none';
                    }
                }
                e.preventDefault();
            };

            // 保存事件处理器的引用以便后续移除
            this.shortcutDialog._keyHandler = keyHandler;
            this.shortcutDialog.addEventListener('keydown', keyHandler);

            // 点击外部关闭对话框
            const clickHandler = (e) => {
                if (!this.shortcutDialog.contains(e.target)) {
                    this.shortcutDialog.style.display = 'none';
                    document.removeEventListener('click', clickHandler);
                    this.shortcutDialog.removeEventListener('keydown', keyHandler);
                }
            };

            // 保存事件处理器的引用以便后续移除
            this.shortcutDialog._clickHandler = clickHandler;
            setTimeout(() => {
                document.addEventListener('click', clickHandler);
            }, 0);
        },

        // 插入引用到编辑器
        async insertReference(ref) {
            try {
                const editor = await api.getActiveContextTextEditor();
                const link = `<a class="reference-link" href="${ref.href}">${ref.text}</a>`;
                editor.model.change(writer => {
                    const viewFragment = editor.data.processor.toView(link);
                    const modelFragment = editor.data.toModel(viewFragment);
                    editor.model.insertContent(modelFragment);
                });
                editor.editing.view.focus();

                // 插入后等待DOM更新
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // 重新获取最新引用列表
                const note = api.getActiveContextNote();
                if (note) {
                    await this.update(note);
                }
            } catch (error) {
                console.error('获取编辑器实例失败:', error);
            }
        },

        // 初始化快捷键
        async initShortcut() {
            try {
                const shortcut = await api.runOnBackend(() => {
                    return api.currentNote.getLabelValue('shortcut');
                });

                if (shortcut) {
                    api.bindGlobalShortcut(shortcut, () => {
                        this.showReferenceSelector();
                    });
                }
            } catch (err) {
                console.error('获取快捷键时发生错误:', err);
            }
        },

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
                        ">References</div>
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
                    <div class="crossref-content" style="
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
                this.active = false;
                CrossReferenceButton.updateButtonStyle();
            });

            this.widget = widget;
            this.container = widget.querySelector('.crossref-content');
            return widget;
        },

        hideWidget() {
            if (this.widget) {
                this.widget.style.display = 'none';
                window.RightPaneManager?.constructor.reportContent(this.id, false);
            }
        },

        clear() {
            this.lastRefs = null;
            this.currentSortedRefs = null;
            this.hideWidget();
            if (this.container) {
                this.container.innerHTML = '';
            }
        },

        async initialize() {
            this.parentContainer = await window.RightPaneManager?.getCustomWidgetsContainer();
            if (!this.parentContainer) return;

            if (!this.widget) {
                this.widget = this.createWidget();
                this.parentContainer.appendChild(this.widget);
                this.clear();
            }

            // 初始化快捷键
            await this.initShortcut();
        },

        async update(note) {
            if (!note) {
                this.clear();
                return;
            }
            if (!this.active) return;
            if (!this.widget) {
                await this.initialize();
            }

            const blob = await note.getBlob();
            const doc = new DOMParser().parseFromString(blob.content, 'text/html');
            const links = doc.querySelectorAll('a.reference-link');

            if (!links || links.length === 0) {
                this.clear();
                return;
            }

            const refMap = new Map();
            links.forEach((linkEl, idx) => {
                const href = linkEl.getAttribute('href') || '';
                if (!href) return;

                refMap.set(href, {
                    text: linkEl.textContent || '[Untitled]',
                    finalPos: idx
                });
            });

            const sortedRefs = Array.from(refMap.entries())
                .map(([href, info]) => ({ href, text: info.text, finalPos: info.finalPos }))
                .sort((a, b) => a.finalPos - b.finalPos);

            const currentRefsString = JSON.stringify(sortedRefs);
            if (this.lastRefs === currentRefsString) {
                return;
            }
            this.lastRefs = currentRefsString;
            this.currentSortedRefs = sortedRefs;

            let html = `
                <div style="
                    display: flex;
                    flex-wrap: wrap;
                    gap: 2px;
                    padding: 2px;
                ">
                    ${sortedRefs.map((ref, index) => `
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
                               href="${ref.href}"
                               style="
                                   overflow: hidden;
                                   text-overflow: ellipsis;
                                   white-space: nowrap;
                               "
                            >${ref.text}</a>
                        </div>
                    `).join('')}
                </div>
            `;

            if (this.container) {
                this.container.innerHTML = html;
                this.widget.style.display = '';
                window.RightPaneManager?.constructor.reportContent(this.id, true);
            }
        }
    };

    ////////////////////////////////////////////////////////////////////////
    // 2. Console Button (Left Sidebar Button)
    ////////////////////////////////////////////////////////////////////////

    const CrossReferenceButton = {
        id: 'cross-reference-button',
        button: null,

        isEnabled(note) {
            return note && note.type === 'text';
        },

        createButton() {
            const button = document.createElement('span');
            button.className = 'bx bx-at';
            button.title = 'Show/Hide Reference List';
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
                CrossReferencePlugin.active = !CrossReferencePlugin.active;
                this.updateButtonStyle();

                if (!CrossReferencePlugin.active) {
                    CrossReferencePlugin.clear();
                } else {
                    const note = api.getActiveContextNote();
                    if (note) {
                        await CrossReferencePlugin.update(note);
                        window.RightPaneManager?.debouncedSort();
                    }
                }
            });
        },

        updateButtonStyle() {
            if (!this.button) return;
            if (CrossReferencePlugin.active) {
                this.button.style.opacity = '1';
                this.button.style.color = 'var(--main-text-color)';
            } else {
                this.button.style.opacity = '0.5';
                this.button.style.color = 'var(--muted-text-color)';
            }
        },

        async update(currentNote) {
            if (!this.isEnabled(currentNote)) {
                if (this.button) {
                    this.button.style.display = 'none';
                    CrossReferencePlugin.clear();
                }
                return;
            }

            if (!this.button) {
                const container = window.ButtonManager?.getLeftContainer();
                if (container) {
                    this.button = this.createButton();
                    this.button.id = this.id;
                    container.appendChild(this.button);
                }
            }

            if (this.button) {
                this.button.style.display = '';
            }

            this.updateButtonStyle();

            if (CrossReferencePlugin.active && currentNote) {
                CrossReferencePlugin.update(currentNote);
            }
        }
    };

    ////////////////////////////////////////////////////////////////////////
    // 3. Wait for Managers initialization, then register plugin & button
    ////////////////////////////////////////////////////////////////////////
    while (!window.RightPaneManager || !window.ButtonManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    await CrossReferencePlugin.initialize();

    window.RightPaneManager.constructor.registerRealtimeWidget(CrossReferencePlugin.id, {
        update: (note) => CrossReferencePlugin.update(note),
        watchContent: true,
        watchAttributes: false
    });

    window.RightPaneManager.constructor.widgetPriorities.set(CrossReferencePlugin.id, CrossReferencePlugin.priority);
    window.ButtonManager.registerButton(CrossReferenceButton);
})();

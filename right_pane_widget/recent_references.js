(async function() {
    ////////////////////////////////////////////////////////////////////////
    // 1. Recent References Widget for Right Pane
    ////////////////////////////////////////////////////////////////////////

    const RecentReferencePlugin = {
        id: 'recent-references-widget',
        priority: 1.2,
        max_items: 15,        // Maximum number of references to keep
        active: true,         // Default to inactive

        widget: null,
        container: null,
        parentContainer: null,

        recentReferences: [],      
        visitedNotes: new Set(),    
        lastAnchorsByNote: new Map(),

        // 快捷键相关
        shortcut: null,
        shortcutDialog: null,

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
        showReferenceSelector() {
            if (!this.shortcutDialog) {
                this.createShortcutDialog();
            }

            // 如果没有最近引用,直接返回
            if (!this.recentReferences.length) {
                return;
            }

            const keys = 'qwertyuiopasdfghjklzxcvbnm';
            let html = '<div style="max-height: 50vh; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 4px; padding: 4px;">';
            
            this.recentReferences.slice().reverse().forEach((ref, index) => {
                if (index >= keys.length) return;
                
                html += `
                    <div class="ref-item" data-index="${index}" style="
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

            this.shortcutDialog.innerHTML = html;
            this.shortcutDialog.style.display = 'block';
            this.shortcutDialog.focus(); // 显示后立即获得焦点

            // 添加点击事件监听
            const refItems = this.shortcutDialog.querySelectorAll('.ref-item');
            refItems.forEach(item => {
                item.addEventListener('click', () => {
                    const index = parseInt(item.dataset.index);
                    const ref = this.recentReferences[this.recentReferences.length - 1 - index];
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

                const index = keys.indexOf(e.key.toLowerCase());
                if (index !== -1 && index < this.recentReferences.length) {
                    const ref = this.recentReferences[this.recentReferences.length - 1 - index];
                    if (this.shortcutDialog.style.display !== 'none') {
                        this.insertReference(ref);
                        this.shortcutDialog.style.display = 'none';
                        document.removeEventListener('keydown', keyHandler);
                    }
                }
                e.preventDefault(); // 阻止按键事件传播
            };

            this.shortcutDialog.addEventListener('keydown', keyHandler);

            // 点击外部关闭对话框
            const clickHandler = (e) => {
                if (!this.shortcutDialog.contains(e.target)) {
                    this.shortcutDialog.style.display = 'none';
                    document.removeEventListener('click', clickHandler);
                    this.shortcutDialog.removeEventListener('keydown', keyHandler);
                }
            };

            setTimeout(() => {
                document.addEventListener('click', clickHandler);
            }, 0);
        },

        // 插入引用到编辑器
        insertReference(ref) {
            api.getActiveContextTextEditor().then(editor => {
                const link = `<a class="reference-link" href="${ref.href}">${ref.text}</a>`;
                editor.model.change(writer => {
                    const viewFragment = editor.data.processor.toView(link);
                    const modelFragment = editor.data.toModel(viewFragment);
                    editor.model.insertContent(modelFragment);
                });
                editor.editing.view.focus(); // 插入完毕后，使编辑器重新获得焦点
            }).catch(error => {
                console.error('获取编辑器实例失败:', error);
            });
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
                        ">Recent References</div>
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
                    <div class="recent-ref-content" style="
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
                RecentReferenceButton.updateButtonStyle();
            });

            const clearButton = widget.querySelector('.clear-button');
            clearButton.addEventListener('click', () => {
                this.clear();
            });

            this.widget = widget;
            this.container = widget.querySelector('.recent-ref-content');
            return widget;
        },

        hideWidget() {
            if (this.widget) {
                this.widget.style.display = 'none';
                window.RightPaneManager?.constructor.reportContent(this.id, false);
            }
        },

        freezeUI() {
            this.hideWidget();
            if (this.container) {
                this.container.innerHTML = '';
            }
        },

        clear() {
            this.recentReferences = [];
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

                if (!this.active) {
                    this.clear(); 
                }
            }

            // 初始化快捷键
            await this.initShortcut();
        },

        renderList() {
            if (!this.widget || !this.container) return;
        
            if (this.recentReferences.length === 0) {
                this.hideWidget();
                return;
            }
        
            let html = `
                <div style="
                    display: flex;
                    flex-wrap: wrap;
                    gap: 2px;
                    padding: 2px;
                ">
            `;
            
            [...this.recentReferences].reverse().forEach((ref, index) => {
                html += `
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
                `;
            });
            html += '</div>';
        
            this.container.innerHTML = html;
            this.widget.style.display = '';
            window.RightPaneManager?.constructor.reportContent(this.id, true);
        },

        findNewlyInserted(oldArr, newArr) {
            const dp = Array(oldArr.length + 1).fill(null)
                .map(() => Array(newArr.length + 1).fill(0));

            for (let i = 1; i <= oldArr.length; i++) {
                for (let j = 1; j <= newArr.length; j++) {
                    if (oldArr[i-1].href === newArr[j-1].href &&
                        oldArr[i-1].text === newArr[j-1].text) {
                        dp[i][j] = dp[i-1][j-1] + 1;
                    } else {
                        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
                    }
                }
            }

            let i = oldArr.length, j = newArr.length;
            const lcsPositions = [];
            while (i > 0 && j > 0) {
                if (oldArr[i-1].href === newArr[j-1].href &&
                    oldArr[i-1].text === newArr[j-1].text) {
                    lcsPositions.push(j-1);
                    i--; j--;
                } else if (dp[i-1][j] > dp[i][j-1]) {
                    i--;
                } else {
                    j--;
                }
            }
            lcsPositions.reverse();

            const lcsSet = new Set(lcsPositions);

            const newlyInserted = [];
            for (let x = 0; x < newArr.length; x++) {
                if (!lcsSet.has(x)) {
                    newlyInserted.push(newArr[x]);
                }
            }
            return newlyInserted;
        },

        async update(note) {
            if (!this.active) {
                return;
            }

            if (!this.widget) {
                await this.initialize();
            }
            if (!note) {
                this.hideWidget();
                return;
            }

            if (!this.visitedNotes.has(note.noteId)) {
                this.visitedNotes.add(note.noteId);

                const blobFirst = await note.getBlob();
                const docFirst = new DOMParser().parseFromString(blobFirst.content, 'text/html');
                const linksFirst = docFirst.querySelectorAll('a.reference-link');
                let oldAnchors = [];
                if (linksFirst && linksFirst.length > 0) {
                    oldAnchors = Array.from(linksFirst).map(linkEl => ({
                        href: linkEl.getAttribute('href') || '',
                        text: linkEl.textContent || '[Untitled]'
                    }));
                }
                this.lastAnchorsByNote.set(note.noteId, oldAnchors);
                this.renderList();
                return;
            }

            const oldAnchors = this.lastAnchorsByNote.get(note.noteId) || [];
            const blob = await note.getBlob();
            const doc = new DOMParser().parseFromString(blob.content, 'text/html');
            const links = doc.querySelectorAll('a.reference-link');

            let newAnchors = [];
            if (links && links.length > 0) {
                newAnchors = Array.from(links).map(linkEl => ({
                    href: linkEl.getAttribute('href') || '',
                    text: linkEl.textContent || '[Untitled]'
                }));
            }

            const newlyInserted = this.findNewlyInserted(oldAnchors, newAnchors);

            if (newlyInserted.length > 0) {
                for (const anchor of newlyInserted) {
                    const oldIndex = this.recentReferences.findIndex(x =>
                        x.href === anchor.href && x.text === anchor.text
                    );
                    if (oldIndex !== -1) {
                        this.recentReferences.splice(oldIndex, 1);
                    }
                    this.recentReferences.push(anchor);
                    if (this.recentReferences.length > this.max_items) {
                        this.recentReferences.shift();
                    }
                }
            }
            this.renderList();

            this.lastAnchorsByNote.set(note.noteId, newAnchors);
        }
    };

    ////////////////////////////////////////////////////////////////////////
    // 2. Control Button
    ////////////////////////////////////////////////////////////////////////
    const RecentReferenceButton = {
        id: 'recent-references-button',
        button: null,

        isEnabled(note) {
            return note && note.type === 'text';
        },

        createButton() {
            const button = document.createElement('span');
            button.className = 'bx bxs-quote-left';
            button.title = 'Show/Hide Recent References';
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
                RecentReferencePlugin.active = !RecentReferencePlugin.active;
                this.updateButtonStyle();

                if (RecentReferencePlugin.active) {
                    const note = api.getActiveContextNote();
                    if (note) {
                        if (!RecentReferencePlugin.visitedNotes.has(note.noteId)) {
                            RecentReferencePlugin.visitedNotes.add(note.noteId);
                            const blobFirst = await note.getBlob();
                            const docFirst = new DOMParser().parseFromString(blobFirst.content, 'text/html');
                            const linksFirst = docFirst.querySelectorAll('a.reference-link');
                            let oldAnchors = [];
                            if (linksFirst && linksFirst.length > 0) {
                                oldAnchors = Array.from(linksFirst).map(linkEl => ({
                                    href: linkEl.getAttribute('href') || '',
                                    text: linkEl.textContent || '[Untitled]'
                                }));
                            }
                            RecentReferencePlugin.lastAnchorsByNote.set(note.noteId, oldAnchors);
                        }
                        RecentReferencePlugin.renderList();
                        await RecentReferencePlugin.update(note);
                        window.RightPaneManager?.debouncedSort();
                    } else {
                        RecentReferencePlugin.renderList();
                        window.RightPaneManager?.debouncedSort();
                    }
                } else {
                    RecentReferencePlugin.freezeUI();
                }
            });
        },

        updateButtonStyle() {
            if (!this.button) return;
            if (RecentReferencePlugin.active) {
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

            if (RecentReferencePlugin.active && currentNote) {
                if (!RecentReferencePlugin.visitedNotes.has(currentNote.noteId)) {
                    RecentReferencePlugin.visitedNotes.add(currentNote.noteId);
                    const blobFirst = await currentNote.getBlob();
                    const docFirst = new DOMParser().parseFromString(blobFirst.content, 'text/html');
                    const linksFirst = docFirst.querySelectorAll('a.reference-link');
                    let oldAnchors = [];
                    if (linksFirst && linksFirst.length > 0) {
                        oldAnchors = Array.from(linksFirst).map(linkEl => ({
                            href: linkEl.getAttribute('href') || '',
                            text: linkEl.textContent || '[Untitled]'
                        }));
                    }
                    RecentReferencePlugin.lastAnchorsByNote.set(currentNote.noteId, oldAnchors);
                }
                await RecentReferencePlugin.update(currentNote);
            }
        }
    };

    ////////////////////////////////////////////////////////////////////////
    // 3. Wait for Managers to initialize & register
    ////////////////////////////////////////////////////////////////////////
    while (!window.RightPaneManager || !window.ButtonManager) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    await RecentReferencePlugin.initialize();

    window.RightPaneManager.constructor.registerRealtimeWidget(RecentReferencePlugin.id, {
        update: (note) => RecentReferencePlugin.update(note),
        watchContent: true,
        watchAttributes: false
    });

    window.RightPaneManager.constructor.widgetPriorities.set(RecentReferencePlugin.id, RecentReferencePlugin.priority);

    window.ButtonManager.registerButton(RecentReferenceButton);
})();

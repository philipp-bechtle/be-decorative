import { FileSystemAdapter, Notice, Plugin, debounce } from 'obsidian';
import { DecorationType } from 'deconfig';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE_NAME = "decorations.txt";

export default class BeDecorativePlugin extends Plugin {
    private settingsMap = new Map<string, DecorationType>();

    async onload() {
        this.initializeFileWatcher();

        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                menu.addItem((item) => {
                    item
                        .setTitle("Set not started")
                        .setIcon("x-circle")
                        .setSection("be-decoration")
                        .onClick(async () => {
                            this.settingsMap.set(file.path, DecorationType.D_TYPE_RED);
                            this.saveSettingsMapToDisk();
                            this.generateColorStyles();
                            this.applyColorStyles();
                        });
                });
                menu.addItem((item) => {
                    item
                        .setTitle("Set in progress")
                        .setIcon("circle")
                        .setSection("be-decoration")
                        .onClick(async () => {
                            this.settingsMap.set(file.path, DecorationType.D_TYPE_ORANGE);
                            this.saveSettingsMapToDisk();
                            this.generateColorStyles();
                            this.applyColorStyles();
                        });
                });
                menu.addItem((item) => {
                    item
                        .setTitle("Set documented")
                        .setIcon("check-circle-2")
                        .setSection("be-decoration")
                        .onClick(async () => {
                            this.settingsMap.set(file.path, DecorationType.D_TYPE_GREEN);
                            this.saveSettingsMapToDisk();
                            this.generateColorStyles();
                            this.applyColorStyles();
                        });
                });
                menu.addItem((item) => {
                    item
                        .setTitle("Remove markings")
                        .setIcon("eraser")
                        .setSection("be-decoration")
                        .setDisabled(!this.settingsMap.has(file.path))
                        .onClick(async () => {
                            this.settingsMap.delete(file.path);
                            this.saveSettingsMapToDisk();
                            this.generateColorStyles();
                            this.applyColorStyles();
                        });
                });
            })
        );
    }

    onunload() {

    }

    generateColorStyles(): void {
        let colorStyleElement = document.getElementById('beDecorationStyles');
        if (!colorStyleElement) {
            colorStyleElement = this.app.workspace.containerEl.createEl('style');
            colorStyleElement.id = 'beDecorationStyles';
        }

        colorStyleElement.innerHTML = [
            '.decfile-color-color-red { --decfile-color-color: var(--color-red); }',
            '.decfile-color-color-orange { --decfile-color-color: var(--color-orange); }',
            '.decfile-color-color-green { --decfile-color-color: var(--color-green); }'
        ].join('\n');
    }

    applyColorStyles = debounce(this.applyColorStylesInternal, 50, true);

    private applyColorStylesInternal() : void {
        // fixme: read from file config
        const fileExplorers = this.app.workspace.getLeavesOfType('file-explorer');
        fileExplorers.forEach((fileExplorer) => {
            Object.entries(fileExplorer.view.fileItems).forEach(([path, fileItem]) => {
                const itemClasses = fileItem.el.classList.value.split(' ').filter((cls) => !cls.startsWith('decfile-color'));
                if (path === "/") return;
                if (this.settingsMap.has(path)) {
                    itemClasses.push('decfile-color-file');
                    itemClasses.push('decfile-color-type-text');
                    const value = this.settingsMap.get(path);
                    if (value === undefined) return;
                    switch (value) {
                        case DecorationType.D_TYPE_GREEN:
                            itemClasses.push('decfile-color-color-green');
                        break;
                        case DecorationType.D_TYPE_ORANGE:
                            itemClasses.push('decfile-color-color-orange');
                        break;
                        case DecorationType.D_TYPE_RED:
                            itemClasses.push('decfile-color-color-red');
                        break;
                    }
                }
                fileItem.el.classList.value = itemClasses.join(' ');
            });
        });
    }

    private getVaultBasePath() : string | null {
        let adapter = this.app.vault.adapter;
        if (adapter instanceof FileSystemAdapter) {
            return adapter.getBasePath();
        }
        return null;
    }

    private saveSettingsMapToDisk() : void {
        const vaultConfigPath = this.getVaultConfigPath();
        if (!vaultConfigPath) return;

        const serilizedText = JSON.stringify(Array.from(this.settingsMap.entries()));
        fs.writeFileSync(vaultConfigPath, serilizedText);
    }

    private reloadSettingsMapFromDisk() : void {
        const vaultConfigPath = this.getVaultConfigPath();
        if (!vaultConfigPath) return;
        if (!fs.existsSync(vaultConfigPath)) {
            this.settingsMap = new Map<string, DecorationType>();
            return;
        }
        const fileText = fs.readFileSync(vaultConfigPath, 'utf-8');
        this.settingsMap = new Map(JSON.parse(fileText));

    }

    private getVaultConfigPath() : string | null {
        const vaultRoot = this.getVaultBasePath();
        if (!vaultRoot) return null;
        const vaultConfigPath = path.join(vaultRoot, CONFIG_FILE_NAME);
        return vaultConfigPath;
    }

    private initializeFileWatcher() : void {
        const vaultConfigPath = this.getVaultConfigPath();
        if (!vaultConfigPath) return;
        this.reloadSettingsMapFromDisk();
        fs.watchFile(vaultConfigPath, (curr, prev) => {
            this.reloadSettingsMapFromDisk();
            this.generateColorStyles();
            this.applyColorStyles();
        });
    }
}

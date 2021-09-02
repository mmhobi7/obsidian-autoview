import {App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';

interface MyPluginSettings {
  timoutduration: number;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  timoutduration: 5
}

// https://raw.githubusercontent.com/derwish-pro/obsidian-remember-cursor-position/master/main.ts
interface EphemeralState {
  cursor?: {from: {ch: number
                        line: number
		},
		to: {
			ch: number
                        line: number
		}
	},
	scroll?: number
}

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings;
  db: {[file_path: string]: EphemeralState;};
  lastEphemeralState: EphemeralState;
  lastLoadedFileName: string;
  lastTime: number;

  async onload() {
    console.log('loading plugin autoview');
    this.lastTime = 1;
    this.db = {}

              await this.loadSettings();

    this.addRibbonIcon('dice', 'AutoView', () => {
      new Notice('This is a notice!');
    });

    this.addStatusBarItem().setText('Status Bar Text');

    this.addCommand({
      id: 'open-sample-modal',
      name: 'Open Sample Modal',
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
            new SampleModal(this.app).open();
          }
          return true;
        }
        return false;
      }
    });

    this.addSettingTab(new SampleSettingTab(this.app, this));

    this.registerCodeMirror((cm: CodeMirror.Editor) => {
      console.log('codemirror', cm);
    });

    this.registerDomEvent(document, 'keydown', (evt: KeyboardEvent) => {
      // https://github.com/obsidianmd/obsidian-releases/pull/433
      console.log('keydown', evt);
      var markdownLeaves2 =
          this.app.workspace.getActiveViewOfType(MarkdownView);
      if (markdownLeaves2.getMode() == 'preview') {
        var curState = markdownLeaves2.getState();
        curState.mode = 'source';
        markdownLeaves2.setState(curState, theresult);
        this.restoreEphemeralState();
      }
      this.lastTime++;
      this.backtopreview(this.lastTime, markdownLeaves2);
    });
  }

  checkEphemeralStateChanged() {
    let fileName = this.app.workspace.getActiveFile()?.path;

    // waiting for load new file
    if (!fileName) return;

    let st = this.getEphemeralState();

    if (!this.lastEphemeralState) this.lastEphemeralState = st;

    // if (!this.isEphemeralStatesEquals(st, this.lastEphemeralState)) {
    this.saveEphemeralState(st);
    this.lastEphemeralState = st;
    // }
  }

  getEphemeralState(): EphemeralState {
    // let state: EphemeralState =
    // this.app.workspace.getActiveViewOfType(MarkdownView)?.getEphemeralState();
    // //doesnt work properly

    let state: EphemeralState = {};
    state.scroll = Number(this.app.workspace.getActiveViewOfType(MarkdownView)
                              ?.currentMode?.getScroll()
                              ?.toFixed(4));

    let editor = this.getEditor();
    if (editor) {
      let from = editor.getCursor('anchor');
      let to = editor.getCursor('head');
      if (from && to) {
        state.cursor = {
          from: {ch: from.ch, line: from.line},
          to: {ch: to.ch, line: to.line}
        }
      }
    }

    return state;
  }

  private getEditor(): CodeMirror.Editor {
    return this.app.workspace.getActiveViewOfType(MarkdownView)
        ?.sourceMode.cmEditor;
  }

  async saveEphemeralState(st: EphemeralState) {
    let fileName =
        this.app.workspace.getActiveFile()?.path;  // do not save if file
                                                   // changed and was not loaded
    this.db[fileName] = st;
  }


  isEphemeralStatesEquals(state1: EphemeralState, state2: EphemeralState):
      boolean {
    if (state1.cursor && !state2.cursor) return false;

    if (!state1.cursor && state2.cursor) return false;

    if (state1.cursor) {
      if (state1.cursor.from.ch != state2.cursor.from.ch) return false;
      if (state1.cursor.from.line != state2.cursor.from.line) return false;
      if (state1.cursor.to.ch != state2.cursor.to.ch) return false;
      if (state1.cursor.to.line != state2.cursor.to.line) return false;
    }

    if (state1.scroll && !state2.scroll) return false;

    if (!state1.scroll && state2.scroll) return false;

    if (state1.scroll) {
      if (state1.scroll != state2.scroll) return false;
    }

    return true;
  }

  async backtopreview(a: number, markdownLeave: MarkdownView) {
    await new Promise(resolve => setTimeout(resolve, this.settings.timoutduration * 1000));
    if (a == this.lastTime) {
      // if(markdownLeave.getMode() == "source"){
      this.checkEphemeralStateChanged();
      var curState = markdownLeave.getState();
      curState.mode = 'preview';
      markdownLeave.setState(curState, theresult);
      // }
    }
  }

  onunload() {
    console.log('unloading plugin');
  }

  setEphemeralState(state: EphemeralState) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);

    if (view && state.scroll) {
      view.setEphemeralState(state);
      view.previewMode.applyScroll(state.scroll);
      view.sourceMode.applyScroll(state.scroll);
    }
    if (state.cursor) {
      let editor = this.getEditor();
      console.log('editor state', editor);
      if (editor) {
        editor.setSelection(state.cursor.from, state.cursor.to, {scroll: false});
        editor.focus();
      }
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async restoreEphemeralState() {
    let fileName = this.app.workspace.getActiveFile()?.path;

    this.lastEphemeralState = {};
    this.lastLoadedFileName = fileName;

    if (fileName) {
      let st = this.db[fileName];
      if (st) {
        // waiting for load note
        let scroll: number;
        for (let i = 0; i < 20; i++) {
          scroll = this.app.workspace.getActiveViewOfType(MarkdownView)
                       ?.currentMode?.getScroll();
          if (scroll !== null) break;
          await this.delay(10);
        }
        this.setEphemeralState(st);
      }
      this.lastEphemeralState = st;
    }
  }
}


class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let {contentEl} = this;
    contentEl.setText('Woah!');
  }

  onClose() {
    let {contentEl} = this;
    contentEl.empty();
  }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let {containerEl} = this;

    containerEl.empty();

    containerEl.createEl('h2', {text: 'Settings for AutoView.'});

    new Setting(containerEl)
        .setName('Timeout Duration')
        .setDesc(
            'The amount of time in seconds that the plugin waits after the last keystroke before switching over to preview mode. ')
        .addText(
            text => text.setPlaceholder('5')
            .setValue(this.plugin.settings.timoutduration.toString())
            .onChange(
                async (value) => {
                  this.plugin.settings.timoutduration = Number(value);
                  await this.plugin.saveSettings();
                }));
  }
}
function theresult(curState: any, tresult: any) {
  console.log(tresult);
}
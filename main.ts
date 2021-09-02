import {App, MarkdownView, Plugin, PluginSettingTab, Setting} from 'obsidian';

interface MyPluginSettings {
  timoutduration: number;
  rememberscroll: boolean;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  timoutduration: 10,
  rememberscroll: true
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
  lastTime: number;

  async onload() {
    console.log('loading plugin autoview');
    this.lastTime = 1;
    this.db = {};

    await this.loadSettings();

    this.addSettingTab(new SampleSettingTab(this.app, this));

    this.registerCodeMirror((cm: CodeMirror.Editor) => {
      console.log('codemirror', cm);
    });

    this.registerDomEvent(
        document, 'keydown',
        (evt: KeyboardEvent) => this.modeHandler(null, evt));

    this.registerDomEvent(
        document, 'mousedown',
        this.modeHandler);  // TODO: find better way to find interaction with
                            // editor
  }

  modeHandler(mouseevt?: MouseEvent, keyevt?: KeyboardEvent) {
    var markdownLeaves2 = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (markdownLeaves2.getMode() == 'preview') {
      var curState = markdownLeaves2.getState();
      curState.mode = 'source';
      markdownLeaves2.setState(curState, theresult);
      this.restoreEphemeralState();
    }
    this.lastTime++;
    this.backtopreview(this.lastTime, markdownLeaves2);
  }

  checkEphemeralStateChanged() {
    let fileName = this.app.workspace.getActiveFile()?.path;

    // waiting for load new file
    if (!fileName) return;

    let st = this.getEphemeralState();

    this.saveEphemeralState(st);
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
    let fileName = this.app.workspace.getActiveFile()?.path;
    this.db[fileName] = st;
  }

  async backtopreview(a: number, markdownLeave: MarkdownView) {
    await this.delay(this.settings.timoutduration * 1000);
    if (a == this.lastTime) {
      if (markdownLeave.getMode() == 'source') {
        this.checkEphemeralStateChanged();
        var curState = markdownLeave.getState();
        curState.mode = 'preview';
        markdownLeave.setState(curState, theresult);
      }
    }
  }

  onunload() {
    console.log('unloading plugin');
  }

  setEphemeralState(state: EphemeralState) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);

    if (state.cursor) {
      let editor = this.getEditor();
      if (this.settings.rememberscroll) {
        if (editor) {
          editor.setSelection(
              state.cursor.from, state.cursor.to, {scroll: false});
          editor.focus();
        }
        if (view && state.scroll) {
          view.sourceMode.applyScroll(state.scroll);
        }
      } else {
        if (editor) {
          editor.setSelection(
              state.cursor.from, state.cursor.to, {scroll: true});
          editor.focus();
        }
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
    if (ms > 10) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  async restoreEphemeralState() {
    let fileName = this.app.workspace.getActiveFile()?.path;

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
    }
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
            text =>
                text.setPlaceholder('10')
                    .setValue(this.plugin.settings.timoutduration.toString())
                    .onChange(async (value) => {
                      if (Number(value) > 0) {
                        this.plugin.settings.timoutduration = Number(value);
                        await this.plugin.saveSettings();
                      } else {
                        this.plugin.settings.timoutduration = 10;
                        text.setValue('');
                        await this.plugin.saveSettings();
                      }
                    }));

    new Setting(containerEl)
        .setName('Scroll back to previous editing location')
        .setDesc(
            'Should the editor scroll back to it\'s previous location when switching from edit to preview mode? ')
        .addToggle(
            toggle => toggle.setValue(this.plugin.settings.rememberscroll)
                          .onChange(async (value) => {
                            this.plugin.settings.rememberscroll = value;
                            await this.plugin.saveSettings();
                          }));
  }
}
function theresult(curState: any, tresult: any) {
  // console.log(tresult);
}

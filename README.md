## Obsidian AutoView Plugin

This is a plugin for Obsidian (https://obsidian.md).

This project uses Typescript to provide type checking and documentation.
The repo depends on the latest plugin API (obsidian.d.ts) in Typescript Definition format, which contains TSDoc comments describing what it does.

This plugin will auto-switch the active window to edit mode when a keystroke is detected, and then switch back to preview mode a delay after the last keystroke is detected. This quick switching allows for a kind of WYSIWYG.
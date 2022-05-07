import { editor } from "monaco-editor";
import { editor as editorBase } from "monaco-editor";
import { CommandsRegistry } from "monaco-editor/esm/vs/platform/commands/common/commands";

// from https://github.com/microsoft/monaco-editor/issues/102#issuecomment-822981429

export function updateKeyBinding(
  editor: editor.ICodeEditor,
  id: string,
  newKeyBinding?: number
) {
  console.log(editor._standaloneKeybindingService);
  editor._standaloneKeybindingService.addDynamicKeybinding(
    `-${id}`,
    undefined,
    () => {}
  );

  if (newKeyBinding) {
    const { handler, when } = CommandsRegistry.getCommand(id) ?? {};
    if (handler) {
      editor._standaloneKeybindingService.addDynamicKeybinding(
        id,
        newKeyBinding,
        handler,
        when
      );
    }
  }
}

declare module "monaco-editor" {
  export namespace editor {
    export interface StandaloneKeybindingService {
      // from: https://github.com/microsoft/vscode/blob/df6d78a/src/vs/editor/standalone/browser/simpleServices.ts#L337
      // Passing undefined with `-` prefixing the commandId, will unset the existing keybinding.
      // eg `addDynamicKeybinding('-fooCommand', undefined, () => {})`
      // this is technically not defined in the source types, but still works. We can't pass `0`
      // because then the underlying method exits early.
      // See: https://github.com/microsoft/vscode/blob/df6d78a/src/vs/base/common/keyCodes.ts#L414
      addDynamicKeybinding(
        commandId: string,
        keybinding: number | undefined,
        handler: editorBase.ICommandHandler,
        when?: any // ContextKeyExpression
      ): IDisposable;
    }

    export interface ICodeEditor {
      _standaloneKeybindingService: StandaloneKeybindingService;
    }
  }
}

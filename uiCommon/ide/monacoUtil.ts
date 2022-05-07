import * as monaco from "monaco-editor";
import { editor as editorBase } from "monaco-editor";
import { ContextKeyExpr } from "monaco-editor/esm/vs/platform/contextkey/common/contextkey";

// from https://github.com/microsoft/monaco-editor/issues/102#issuecomment-822981429
// and https://github.com/microsoft/monaco-editor/issues/102#issuecomment-701938863

export function patchKeyBinding(
  editor: monaco.editor.ICodeEditor,
  id: string,
  newKeyBinding?: number,
  context?: string
): void {
  // remove existing one; no official API yet
  // the '-' before the commandId removes the binding
  // as of >=0.21.0 we need to supply a dummy command handler to not get errors (because of the fix for https://github.com/microsoft/monaco-editor/issues/1857)
  editor._standaloneKeybindingService.addDynamicKeybinding(
    `-${id}`,
    undefined,
    () => {}
  );
  if (newKeyBinding) {
    const action = editor.getAction(id);
    const when = ContextKeyExpr.deserialize(context);
    editor._standaloneKeybindingService.addDynamicKeybinding(
      id,
      newKeyBinding,
      () => action.run(),
      when
    );
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
        when?: ContextKeyExpr
      ): IDisposable;
    }

    export interface ICodeEditor {
      _standaloneKeybindingService: StandaloneKeybindingService;
    }
  }
}

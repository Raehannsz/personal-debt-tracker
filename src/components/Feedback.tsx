import { useToasts } from '../stores/toastStore';
import { useConfirmState, resolveConfirm } from '../stores/confirmStore';
import { Button } from './ui';

export function ToastContainer() {
  const toasts = useToasts();
  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center w-full px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg max-w-sm text-center"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialogHost() {
  const state = useConfirmState();
  if (!state.open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => resolveConfirm(false)} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-2">{state.title}</h3>
        <p className="text-sm text-slate-600 mb-5">{state.message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => resolveConfirm(false)}>
            {state.cancelLabel ?? 'Batal'}
          </Button>
          <Button
            variant={state.danger ? 'danger' : 'primary'}
            onClick={() => resolveConfirm(true)}
          >
            {state.confirmLabel ?? 'Ya'}
          </Button>
        </div>
      </div>
    </div>
  );
}

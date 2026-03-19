import type { JSX } from "hono/jsx";
import { createPortal } from "hono/jsx/dom";
import { cx } from "./utils";

export type DialogProps = {
	open: boolean;
	onClose?: () => void;
	children?: unknown;
};

export const Dialog = ({ open, onClose, children }: DialogProps) => {
	if (!open) {
		return null;
	}
	if (typeof document === "undefined") {
		return null;
	}
	return (
		<>
			{createPortal(
				<div class="app-dialog-root">
					<button
						aria-label="关闭弹窗"
						class="app-dialog-backdrop"
						type="button"
						onClick={onClose}
					/>
					<div class="app-dialog-frame">{children}</div>
				</div>,
				document.body,
			)}
		</>
	);
};

export const DialogContent = ({
	class: className,
	...props
}: JSX.IntrinsicElements["div"]) => (
	<div
		{...props}
		class={cx("app-card app-dialog-content w-full max-w-xl p-6", className)}
		role="dialog"
	/>
);

export const DialogHeader = ({
	class: className,
	...props
}: JSX.IntrinsicElements["div"]) => (
	<div
		{...props}
		class={cx("flex items-start justify-between gap-4", className)}
	/>
);

export const DialogTitle = ({
	class: className,
	...props
}: JSX.IntrinsicElements["h3"]) => (
	<h3 {...props} class={cx("app-title text-lg", className)} />
);

export const DialogDescription = ({
	class: className,
	...props
}: JSX.IntrinsicElements["p"]) => (
	<p
		{...props}
		class={cx("mt-2 text-xs text-[color:var(--app-ink-muted)]", className)}
	/>
);

export const DialogFooter = ({
	class: className,
	...props
}: JSX.IntrinsicElements["div"]) => (
	<div
		{...props}
		class={cx("mt-6 flex flex-wrap items-center justify-end gap-2", className)}
	/>
);

import type { Metadata } from "next";
import { undoEmailChangeAction } from "../../actions";
import { UndoEmailForm } from "../../../../components/undo-email-form";

export const metadata: Metadata = { title: "Undo an email change", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function UndoEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <UndoEmailForm action={undoEmailChangeAction.bind(null, token)} />;
}

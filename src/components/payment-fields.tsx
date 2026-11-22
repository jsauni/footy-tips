import { input } from "@/components/ui";

/** Organiser's payment details, shared by the create form and comp settings. */
export function PaymentFields({
  payid,
  payeeName,
  instructions,
}: {
  payid?: string | null;
  payeeName?: string | null;
  instructions?: string | null;
}) {
  return (
    <>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Your PayID</span>
        <input
          className={input}
          name="payid"
          autoComplete="off"
          maxLength={100}
          placeholder="Mobile, email or ABN"
          defaultValue={payid ?? ""}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Account name shown for that PayID</span>
        <input
          className={input}
          name="payee_name"
          autoComplete="name"
          maxLength={60}
          placeholder="e.g. J Smith"
          defaultValue={payeeName ?? ""}
        />
        <span className="mt-1 block text-xs text-muted">
          Players check this name in their banking app before they send money.
        </span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Note for players (optional)</span>
        <textarea
          className={`${input} h-20 py-3`}
          name="payment_instructions"
          maxLength={200}
          placeholder="e.g. Pay by round 3. Cash at training is fine too."
          defaultValue={instructions ?? ""}
        />
      </label>
      <p className="text-xs text-muted">
        Only members of the comp can see these details. Each player gets their own payment reference.
      </p>
    </>
  );
}

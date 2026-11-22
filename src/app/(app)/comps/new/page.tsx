import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { CreateCompForm } from "./create-form";

export const metadata: Metadata = { title: "New competition" };

export default function NewCompPage() {
  return (
    <>
      <PageTitle title="New competition" subtitle="You’ll get an invite link to share." />
      <CreateCompForm />
    </>
  );
}

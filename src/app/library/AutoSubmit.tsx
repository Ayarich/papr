"use client";
import { useEffect } from "react";

/** Re-runs the search as soon as a dropdown changes, so there's no extra button press. */
export default function AutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const onChange = (e: Event) => { if ((e.target as HTMLElement).tagName === "SELECT") form.requestSubmit(); };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, [formId]);
  return null;
}

"use client";

/*
  The careers application form. Validates with the same zod schema the API
  route uses, so an error shown here is the error the server would return.
*/

import React, { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { careerApplicationSchema, type CareerApplication } from "@/lib/careers/applicationSchema";

type Field = keyof CareerApplication;
type Status = "idle" | "submitting" | "done";

const EMPTY: Record<Field, string> = {
  fullName: "",
  email: "",
  phone: "",
  skills: "",
  projects: "",
  resumeUrl: "",
};

const ApplicationForm = () => {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const update = (field: Field) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    // Clear a field's error as soon as the applicant starts fixing it.
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const parsed = careerApplicationSchema.safeParse(values);
    if (parsed.success === false) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field;
        if (!next[field]) next[field] = issue.message;
      }
      setErrors(next);
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) {
        setStatus("done");
        return;
      }
      if (result.field && result.field in EMPTY) {
        setErrors({ [result.field]: result.error });
      } else {
        setFormError(result.error || "Could not submit your application. Please try again.");
      }
    } catch {
      setFormError("Network error. Check your connection and try again.");
    }
    setStatus("idle");
  };

  if (status === "done") {
    return (
      <div className="rounded-xl border border-[#ff914d]/30 bg-[#ff914d]/5 p-8 text-center" role="status">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Application received</h3>
        <p className="text-gray-600">
          Thanks, {values.fullName.trim().split(" ")[0]}. Our team will review your profile and reach out at{" "}
          <span className="font-medium text-gray-900">{values.email.trim()}</span> if there's a fit.
        </p>
      </div>
    );
  }

  const fieldClass = (field: Field) =>
    errors[field] ? "border-red-500 focus-visible:ring-red-500" : "focus-visible:ring-[#2e77ff]";

  const renderError = (field: Field) =>
    errors[field] ? (
      <p id={`${field}-error`} className="text-sm text-red-600 mt-1">
        {errors[field]}
      </p>
    ) : null;

  const a11y = (field: Field) => ({
    id: field,
    name: field,
    value: values[field],
    onChange: update(field),
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="fullName">Full name *</Label>
          <Input {...a11y("fullName")} autoComplete="name" placeholder="Priya Sharma" className={`mt-1.5 ${fieldClass("fullName")}`} />
          {renderError("fullName")}
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input {...a11y("email")} type="email" autoComplete="email" placeholder="you@example.com" className={`mt-1.5 ${fieldClass("email")}`} />
          {renderError("email")}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <Label htmlFor="phone">Phone *</Label>
          <Input {...a11y("phone")} type="tel" autoComplete="tel" placeholder="+91 98765 43210" className={`mt-1.5 ${fieldClass("phone")}`} />
          {renderError("phone")}
        </div>
        <div>
          <Label htmlFor="resumeUrl">Resume link *</Label>
          <Input {...a11y("resumeUrl")} type="url" placeholder="https://drive.google.com/..." className={`mt-1.5 ${fieldClass("resumeUrl")}`} />
          {renderError("resumeUrl") ?? (
            <p className="text-xs text-gray-500 mt-1">Google Drive, Dropbox or any public link — make sure it's viewable.</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="skills">Skills *</Label>
        <Textarea {...a11y("skills")} rows={2} placeholder="React, TypeScript, Node.js, PostgreSQL, Figma..." className={`mt-1.5 ${fieldClass("skills")}`} />
        {renderError("skills")}
      </div>

      <div>
        <Label htmlFor="projects">Projects *</Label>
        <Textarea
          {...a11y("projects")}
          rows={5}
          placeholder="Tell us about 1–3 projects you're proud of: what you built, your role, and links if any."
          className={`mt-1.5 ${fieldClass("projects")}`}
        />
        {renderError("projects")}
      </div>

      {formError && (
        <p className="text-sm text-red-600" role="alert">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full md:w-auto bg-[#ff914d] hover:bg-[#f57f35] disabled:opacity-60 text-white font-bold py-3 px-10 rounded-md transition-colors"
      >
        {status === "submitting" ? "Submitting..." : "Submit application"}
      </button>
    </form>
  );
};

export default ApplicationForm;

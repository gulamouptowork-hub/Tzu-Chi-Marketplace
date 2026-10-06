"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import catalogue from "../../messages/departments.json";
export function DepartmentSelect({ initial = "" }: { initial?: string }) {
  const t = useTranslations("Onboarding");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(
    catalogue.departments.find((d) => d.name === initial)?.id ?? "",
  );
  const filtered = catalogue.departments.filter((d) =>
    (d.name + d.college).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div>
      <label htmlFor="department-search">{t("department")}</label>
      <div className="relative mt-1.5">
        <Search
          size={16}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          id="department-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("departmentSearch")}
          aria-controls="department-options"
          className="pl-10"
        />
      </div>
      <label htmlFor="department-options" className="sr-only">
        {t("department")}
      </label>
      <select
        id="department-options"
        name="department"
        required
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        size={6}
        className="mt-2"
      >
        <option value="" disabled>
          {t("departmentSelect")}
        </option>
        {selected && !filtered.some((d) => d.id === selected) && (
          <option value={selected}>
            {catalogue.departments.find((d) => d.id === selected)?.name}
          </option>
        )}
        {[...new Set(filtered.map((d) => d.college))].map((college) => (
          <optgroup key={college} label={college}>
            {filtered
              .filter((d) => d.college === college)
              .map((d) => (
                <option value={d.id} key={d.id}>
                  {d.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-muted">{t("departmentHint")}</p>
    </div>
  );
}

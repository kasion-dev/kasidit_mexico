import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import Sheet from "./Sheet";
import { Button, Field, NumField, Select, TextArea } from "./ui";
import { cn } from "../lib/utils";

/**
 * Generic add/edit sheet driven by a field list.
 * field: { key, label, type: text|num|date|time|select|textarea|cur|tel|url, options?, half?, placeholder?, show?(draft) }
 */
export default function FormSheet({ open, onClose, title, fields, value, onSave, onDelete, saveLabel = "บันทึก" }) {
  const [draft, setDraft] = useState(value || {});

  useEffect(() => {
    if (open) setDraft(value || {});
  }, [open, value]);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  function submit(e) {
    e?.preventDefault();
    onSave(draft);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          {onDelete ? (
            <Button
              variant="danger"
              size="icon"
              className="h-10 w-10"
              aria-label="ลบ"
              onClick={() => {
                if (window.confirm("ลบรายการนี้?")) {
                  onDelete(draft);
                  onClose();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
          <Button variant="ghost" className="h-10 flex-1" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button variant="primary" className="h-10 flex-[2]" onClick={submit}>
            {saveLabel}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid grid-cols-2 gap-3">
        {fields
          .filter((f) => !f.show || f.show(draft))
          .map((f) => (
            <label key={f.key} className={cn("flex flex-col gap-1.5", f.half ? "col-span-1" : "col-span-2")}>
              <span className="text-xs font-medium text-dim">{f.label}</span>
              <Input f={f} value={draft[f.key]} onChange={(v) => set(f.key, v)} />
            </label>
          ))}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}

function Input({ f, value, onChange }) {
  const v = value ?? "";
  switch (f.type) {
    case "num":
      return <NumField value={v} onChange={onChange} placeholder={f.placeholder || "0"} />;
    case "textarea":
      return <TextArea value={v} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} />;
    case "select":
      return (
        <Select value={v} onChange={(e) => onChange(e.target.value)}>
          {f.allowEmpty ? <option value="">–</option> : null}
          {f.options.map((o) => {
            const opt = typeof o === "string" ? { id: o, label: o } : o;
            return (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            );
          })}
        </Select>
      );
    case "cur":
      return (
        <Select value={v || "MXN"} onChange={(e) => onChange(e.target.value)}>
          <option value="MXN">MXN $</option>
          <option value="THB">THB ฿</option>
        </Select>
      );
    case "rating":
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(v === n ? "" : n)}
              className={cn("h-10 flex-1 rounded-lg border text-lg", n <= (v || 0) ? "border-warn/40 bg-warn/10 text-warn" : "border-line bg-inner text-faint")}
              aria-label={`${n} ดาว`}
            >
              ★
            </button>
          ))}
        </div>
      );
    default:
      return (
        <Field
          type={f.type === "date" || f.type === "time" || f.type === "tel" || f.type === "url" ? f.type : "text"}
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder={f.placeholder}
          autoComplete="off"
        />
      );
  }
}

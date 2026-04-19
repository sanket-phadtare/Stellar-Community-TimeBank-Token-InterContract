import { useState } from "react";

export default function OfferForm({ onSubmit }) {
  const [desc, setDesc] = useState("");
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!desc.trim()) return;
    setLoading(true);
    try {
      await onSubmit({ description: desc, hours: Number(hours) });
      setSuccess(true);
      setDesc("");
      setHours(1);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="offer-form-wrap">
      <div className="field-group">
        <label className="field-label">Description</label>
        <input
          className="input"
          placeholder="What can you offer? (e.g. Python tutoring)"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
      </div>

      <div className="field-group">
        <label className="field-label">Hours (credits)</label>
        <div className="amount-row">
          <input
            type="number"
            className="input input-amount"
            min={1}
            max={8}
            value={hours}
            onChange={e => setHours(e.target.value)}
          />
          <span className="amount-unit">HRS</span>
        </div>
      </div>

      <button
        className="btn-post"
        onClick={handleSubmit}
        disabled={loading || !desc.trim()}
      >
        {loading
          ? <><span className="spinner" /> Posting...</>
          : success
          ? "✓ Listed!"
          : "→ Post Offer"}
      </button>
    </div>
  );
}
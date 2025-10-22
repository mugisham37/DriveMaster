import React, { useState } from 'react'

export function Scratchpad() {
  const [notes, setNotes] = useState('')

  return (
    <div className="scratchpad">
      <h3>Scratchpad</h3>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Use this space for temporary notes..."
        className="scratchpad-textarea"
      />
    </div>
  )
}
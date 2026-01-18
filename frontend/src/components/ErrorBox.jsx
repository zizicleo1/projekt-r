import React from 'react';

function ErrorBox({ error, onRetry }) {
  if (!error) return null;

  return (
    <div className="error-box">
      {error}
      <button onClick={onRetry} className="btn-retry">
        Pokusaj ponovno
      </button>
    </div>
  );
}

export default ErrorBox;

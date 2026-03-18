import React from 'react';

export const Dashboard: React.FC = () => {
  return (
    <div className="container-fluid p-0" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <iframe
        src="https://lookerstudio.google.com/embed/reporting/ce3fa85c-6064-4446-ac6f-cc264300fd18/page/p_9ib9wihzzd"
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        allowFullScreen
      />
    </div>
  );
};

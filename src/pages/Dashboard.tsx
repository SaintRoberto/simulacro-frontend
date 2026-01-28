import React from 'react';

export const Dashboard: React.FC = () => {
  return (
    <div className="container-fluid p-0" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <iframe
        src="https://lookerstudio.google.com/embed/reporting/264b5246-b9d0-49ad-9c8d-7c840db67228/page/N9cmF"
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        allowFullScreen
      />
    </div>
  );
};

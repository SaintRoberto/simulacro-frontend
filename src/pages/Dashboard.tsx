import React from 'react';

export const Dashboard: React.FC = () => {
  return (
    <div className="container-fluid p-0" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <iframe
        src="https://datastudio.google.com/embed/reporting/42dc5572-7880-499a-a338-5a7a9fde831d/page/ZSL1F"
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        allowFullScreen
      />
    </div>
  );
};
